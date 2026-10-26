import { mkdir } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Route, test } from "@playwright/test";
import generated from "../src/generated/model.json" with { type: "json" };
import { capture } from "./capture";

test("plays, adjusts controls, navigates diagnostics, and reconstructs a replay", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Launch game", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await expect(page.locator(".operation-feedback")).toContainText("New game ready");
  const readyDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export replay", exact: true }).click();
  const readyPath = info.outputPath("ready-replay.json");
  await (await readyDownload).saveAs(readyPath);
  await page.getByLabel("Import replay file").setInputFiles(readyPath);
  await expect(page.locator(".operation-feedback")).toContainText("Your fleet is ready to launch");
  await page.getByRole("button", { name: "Shuffle your fleet" }).click();
  await expect(page.locator(".operation-feedback")).toBeEmpty();
  await page.getByRole("button", { name: "Launch game", exact: true }).click();
  const target = page.getByRole("button", { name: /^Target A1:/ });
  await target.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: /^Target A2:/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Fire at A2", exact: true }).click();
  await expect(page.locator(".game-status")).toContainText("Turn 2");
  await expect(page.locator(".operation-feedback")).not.toContainText(
    "Shuffle your fleet or launch",
  );
  await expect(page.getByRole("button", { name: /^Target A2:/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  const range = page.getByRole("slider", { name: /Epistemic weight/ });
  await range.focus();
  await range.press("Home");
  await range.press("ArrowRight");
  await expect(range).toHaveValue("0.05");
  await page.getByRole("button", { name: "Fire suggested shot", exact: true }).click();
  await expect(page.locator(".game-status")).toContainText("Turn 3");
  await capture(page, info.outputPath("playing.png"));
  await page.getByRole("button", { name: "Diagnostics", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Agent diagnostics" })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Fleet belief entropy:/ })).toBeVisible();
  const before = (await page.locator(".metrics-grid").textContent()) ?? "";
  await page.getByLabel("Inspect agent").selectOption("opponent");
  await expect(page.getByText(/Opponent agent diagnostics\./)).toBeVisible();
  await capture(page, info.outputPath("opponent-diagnostics.png"));
  await page.getByLabel("Inspect agent").selectOption("player");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export replay", exact: true }).click();
  const download = await downloadPromise;
  const path = info.outputPath("replay.json");
  await download.saveAs(path);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await page.getByLabel("Import replay file").setInputFiles(path);
  await expect(page.locator(".game-status")).toContainText("Turn 3");
  await expect(page.locator(".operation-feedback")).toContainText(
    "Continue the game when you are ready",
  );
  await page.getByRole("button", { name: "Diagnostics", exact: true }).click();
  await expect(page.locator(".metrics-grid")).toHaveText(before);
  await page.getByRole("button", { name: "Model & guide", exact: true }).click();
  await page.getByText("Read the imported GNN specification", { exact: true }).click();
  await expect(page.locator(".source-code")).toContainText("BattleshipFiniteCatalogue");
  await capture(page, info.outputPath("expanded-model.png"));
  expect(errors).toEqual([]);
});

test("autoplays a full game, stops at terminal, and rejects a malformed replay", async ({
  page,
}, info) => {
  await page.goto("/");
  const gameSeed = info.project.name === "desktop" ? "0" : "42";
  await page.getByLabel("Game seed").fill(gameSeed);
  await page.getByLabel("Fleet catalog size").selectOption("256");
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await page.getByRole("slider", { name: /Autoplay interval/ }).focus();
  await page.getByRole("slider", { name: /Autoplay interval/ }).press("Home");
  await page.getByRole("button", { name: "Launch game", exact: true }).click();
  await expect(page.locator(".operation-feedback")).not.toContainText(
    "Shuffle your fleet or launch",
  );
  await page.getByRole("button", { name: "Autoplay both agents", exact: true }).click();
  await page.getByRole("button", { name: "Pause autoplay", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Autoplay both agents", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Autoplay both agents", exact: true }).click();
  await expect(page.locator(".game-status")).toContainText(
    gameSeed === "0" ? "Victory" : "Defeat",
    { timeout: 35000 },
  );
  await expect(
    page.getByRole("button", { name: "Fire suggested shot", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Autoplay both agents", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".operation-feedback")).not.toContainText(
    "Shuffle your fleet or launch",
  );
  await capture(page, info.outputPath("terminal.png"));
  const terminalDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export replay", exact: true }).click();
  const terminalPath = info.outputPath("terminal-replay.json");
  await (await terminalDownload).saveAs(terminalPath);
  await page.getByLabel("Import replay file").setInputFiles(terminalPath);
  await expect(page.locator(".operation-feedback")).toContainText("This game has ended");
  await expect(page.locator(".operation-feedback")).not.toContainText("ready to resume");
  await page.screenshot({ path: info.outputPath("terminal-import-feedback.png") });
  await page.getByLabel("Import replay file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("not a supported Battleship replay");
  expect(((await page.getByRole("alert").textContent()) ?? "").length).toBeLessThan(200);
});

test("preserves a resident game through offline guide navigation and pauses outside Play", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Launch game", exact: true }).click();
  await page.getByRole("button", { name: "Autoplay both agents", exact: true }).click();
  await page.getByRole("button", { name: "Diagnostics", exact: true }).click();
  const metrics = (await page.locator(".metrics-grid").textContent()) ?? "";
  await page.waitForTimeout(900);
  await expect(page.locator(".metrics-grid")).toHaveText(metrics);
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Model & guide", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Model & guide", exact: true })).toBeVisible();
  await capture(page, info.outputPath("resident-offline-guide.png"));
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Autoplay both agents", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Fire suggested shot", exact: true }).click();
  await expect(page.locator(".game-status")).toContainText("Turn 2");
  await page.context().setOffline(false);
});

for (const tab of ["Diagnostics", "Decision explorer", "Model & guide"])
  test(`shows import progress and cancels a real pending worker from ${tab}`, async ({
    page,
  }, info) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Launch game", exact: true })).toBeVisible();
    const replay = {
      version: 1,
      modelSha256: generated.source.specificationSha256,
      seed: 999,
      catalogueSize: 256,
      events: [{ type: "begin" }, { type: "shot", cell: 0 }],
    };
    {
      await page.getByRole("button", { name: tab, exact: true }).click();
      const held: Route[] = [];
      await page.route("**/assets/session.worker-*.js", (route) => {
        held.push(route);
      });
      await page.getByLabel("Import replay file").setInputFiles({
        name: "pending.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(replay)),
      });
      await expect(page.locator('.operation-feedback [role="status"]')).toContainText(
        "Importing replay",
      );
      await page.waitForTimeout(1200);
      await capture(page, info.outputPath(`pending-${tab.replaceAll(/[^a-z]/gi, "-")}.png`));
      await page.getByRole("button", { name: "Cancel operation", exact: true }).click();
      await expect(page.locator('.operation-feedback [role="status"]')).toContainText(
        "Operation canceled",
      );
      await expect.poll(() => page.workers().length).toBe(0);
      for (const route of held) await route.abort();
      await page.unroute("**/assets/session.worker-*.js");
    }
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByLabel("Game seed")).toHaveValue("1943");
    await expect(page.getByRole("button", { name: "Launch game", exact: true })).toBeEnabled();
    await page.getByLabel("Import replay file").setInputFiles({
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(replay)),
    });
    await expect(page.locator(".game-status")).toContainText("Turn 2");
    await expect(page.getByLabel("Game seed")).toHaveValue("999");
  });

test("reports a real worker loading failure and retries startup", async ({ page }, info) => {
  const boot = await page.context().newPage();
  const held: Route[] = [];
  try {
    await boot.route("**/assets/index-*.js", (route) => {
      held.push(route);
    });
    await boot.goto("/", { waitUntil: "commit" });
    const loading = boot.locator('[data-phase="interface"]');
    await expect(loading.getByRole("status")).toContainText("Loading the game interface");
    await expect(loading.locator(".overline")).toHaveText(
      "BATTLESHIP / ACTIVE INFERENCE INSTITUTE",
    );
    expect(await boot.locator("html").evaluate((e) => e.hasAttribute("data-theme"))).toBe(false);
    for (const theme of ["light", "dark"] as const) {
      await boot.emulateMedia({ colorScheme: theme });
      const bg = await boot
        .locator("html")
        .evaluate((e) => getComputedStyle(e).getPropertyValue("--bg").trim());
      expect(bg).toBe(theme === "light" ? "#f2f6f7" : "#0b1520");
      await expect(loading.getByRole("link", { name: "Reload page", exact: true })).toBeVisible();
      await boot.screenshot({ path: info.outputPath(`${theme}-before-javascript.png`) });
    }
  } finally {
    for (const route of held) await route.abort();
    await boot.close();
  }
  await page.route("**/assets/session.worker-*.js", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("could not load or run the fleet worker");
  await expect(page.getByRole("alert")).not.toContainText("undefined");
  await expect(page.locator(".startup .overline")).toHaveText(
    "BATTLESHIP / ACTIVE INFERENCE INSTITUTE",
  );
  await capture(page, info.outputPath("worker-load-error.png"));
  await page.unroute("**/assets/session.worker-*.js");
  await page.getByRole("button", { name: "Retry startup", exact: true }).click();
  await expect(page.getByRole("button", { name: "Launch game", exact: true })).toBeVisible();
});

test("keeps the newest worker request when replay import overlaps a large new game", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Launch game", exact: true })).toBeVisible();
  await page.getByLabel("Fleet catalog size").selectOption("16384");
  await page.getByRole("button", { name: "New game", exact: true }).click();
  const replay = {
    version: 1,
    modelSha256: generated.source.specificationSha256,
    seed: 999,
    catalogueSize: 256,
    events: [{ type: "begin" }, { type: "shot", cell: 0 }],
  };
  await page.getByLabel("Import replay file").setInputFiles({
    name: "race.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(replay)),
  });
  await expect(page.getByLabel("Game seed")).toHaveValue("999");
  await expect.poll(() => page.workers().length).toBe(0);
  await expect(page.getByLabel("Game seed")).toHaveValue("999");
  await expect(page.locator(".game-status")).toContainText("Turn 2");
});

for (const theme of ["dark", "light"]) {
  for (const tab of ["Play", "Diagnostics", "Decision explorer", "Model & guide"]) {
    test(`renders every view: ${tab} in ${theme} without overflow or accessibility violations`, async ({
      page,
    }, info) => {
      const evidence = info.outputPath("surfaces");
      await mkdir(evidence, { recursive: true });
      await page.goto("/");
      await page.getByLabel("Color theme").selectOption(theme);
      await page.getByRole("button", { name: tab, exact: true }).click();
      await expect(page.locator("h1")).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await capture(page, `${evidence}/${theme}-${tab.replaceAll(/[^a-z]/gi, "-")}.png`);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await capture(page, `${evidence}/${theme}-${tab.replaceAll(/[^a-z]/gi, "-")}-end.png`, false);
    });
  }
}
test("follows system theme, orders header focus, and honors reduced motion", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Color theme").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Launch game", exact: true }).click();
  const cell = page.getByRole("button", { name: /^Target A1:/ });
  await cell.hover();
  expect(await cell.evaluate((node) => getComputedStyle(node).transform)).toBe("none");
});

test("keeps secondary labels and disabled controls legible in both themes", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Launch game", exact: true }).click();
  for (const theme of ["light", "dark"]) {
    await page.getByLabel("Color theme").selectOption(theme);
    const appearance = await page
      .getByRole("button", { name: "Fire selected target", exact: true })
      .evaluate((node) => {
        const style = getComputedStyle(node);
        const rgb = (value: string) =>
          value
            .match(/[\d.]+/g)
            ?.slice(0, 3)
            .map(Number) ?? [];
        const luminance = (value: string) =>
          rgb(value)
            .map((v) => v / 255)
            .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
            .reduce((sum, v, i) => sum + v * ([0.2126, 0.7152, 0.0722][i] ?? 0), 0);
        const contrast = (a: string, b: string) =>
          (Math.max(luminance(a), luminance(b)) + 0.05) /
          (Math.min(luminance(a), luminance(b)) + 0.05);
        return {
          opacity: style.opacity,
          textContrast: contrast(style.color, style.backgroundColor),
          edgeContrast: contrast(style.borderColor, style.backgroundColor),
        };
      });
    expect(appearance.opacity).toBe("1");
    expect(appearance.textContrast).toBeGreaterThanOrEqual(4.5);
    expect(appearance.edgeContrast).toBeGreaterThanOrEqual(3);
    for (const selector of [".metric small", ".dial", ".dial small"]) {
      const sizes = await page
        .locator(selector)
        .evaluateAll((nodes) =>
          nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize)),
        );
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(15);
    }
    await capture(page, info.outputPath(`${theme}-legible-disabled.png`));
  }
});

import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import { z } from "zod";
import { controlsSchema } from "../src/core/inference";
import generated from "../src/generated/model.json" with { type: "json" };
import { capture } from "./capture";

const snapshotSchema = z.object({
  format: z.literal("battleship-analysis"),
  modelSha256: z.string(),
  actor: z.enum(["player", "opponent"]),
  observations: z.array(z.object({ cell: z.number(), hit: z.boolean() })),
  liveControls: controlsSchema,
  sandboxControls: controlsSchema,
  selectedCell: z.number(),
  actions: z.array(z.object({ cell: z.number(), probability: z.number() })),
  sweep: z.object({
    parameter: z.string(),
    points: z.array(z.object({ value: z.number(), probability: z.number() })),
  }),
});

async function download(page: Page, label: string, path: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: label, exact: true }).click();
  await (await pending).saveAs(path);
  return readFile(path, "utf8");
}

test("explains both actors, compares a sandbox, and applies settings without firing", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Launch game", exact: true }).click();
  await page.getByRole("button", { name: /^Target A1:/ }).click();
  await page.getByRole("button", { name: "Fire at A1", exact: true }).click();
  const before = await download(page, "Export replay", info.outputPath("before.json"));
  await page.getByRole("button", { name: "Decision explorer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Decision explorer", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Analysis target A1:/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.getByLabel("Inspect coordinate", { exact: true }).selectOption("1");
  await expect(page.locator(".decision-receipt .tag")).toHaveText("A2");
  await page.getByLabel("Color theme").selectOption("light");
  const selectedMapCell = page.getByRole("button", { name: /^Analysis target A2:/ });
  await selectedMapCell.focus();
  await selectedMapCell.press("ArrowDown");
  await expect(page.getByRole("button", { name: /^Analysis target B2:/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Inspect coordinate", { exact: true })).toHaveValue("11");
  await page.getByLabel("Inspect coordinate", { exact: true }).selectOption("1");
  await page.getByRole("link", { name: "Jump to what-if controls", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "What-if controls", exact: true }),
  ).toBeInViewport();
  await page.getByRole("link", { name: "Return to decision map", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A map of the decision", exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Uniform choices", exact: true }).click();
  await page.getByLabel("Sweep parameter").selectOption("policyPrecision");
  await page.getByText("Sweep values and ranking", { exact: true }).click();
  await expect(page.locator(".sensitivity-panel tbody tr")).toHaveCount(9);
  await page.getByText("Inspect A / B / C / D / E / G / q_pi", { exact: true }).click();
  await expect(page.locator(".factor-inspector .source-code")).toContainText("q_pi(u) = softmax");
  const snapshot = snapshotSchema.parse(
    JSON.parse(
      await download(page, "Export analysis JSON", info.outputPath("player-analysis.json")),
    ),
  );
  expect(snapshot.format).toBe("battleship-analysis");
  expect(snapshot.modelSha256).toBe(generated.source.specificationSha256);
  expect(snapshot.observations).toEqual([{ cell: 0, hit: snapshot.observations[0]?.hit }]);
  expect(snapshot.selectedCell).toBe(1);
  expect(snapshot.actions).toHaveLength(99);
  expect(snapshot.actions.every((action) => Math.abs(action.probability - 1 / 99) < 1e-12)).toBe(
    true,
  );
  expect(snapshot.sandboxControls.policyPrecision).toBe(0);
  expect(snapshot.liveControls.policyPrecision).toBe(8);
  expect(snapshot.sweep.parameter).toBe("policyPrecision");
  expect(await download(page, "Export replay", info.outputPath("sandbox-replay.json"))).toBe(
    before,
  );
  await page
    .getByRole("heading", { name: "Why this action?", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("lab-explanation.png") });

  await page.getByLabel("Inspect agent", { exact: true }).selectOption("opponent");
  await expect(page.getByRole("button", { name: "Select on game board", exact: true })).toHaveCount(
    0,
  );
  const opponent = snapshotSchema.parse(
    JSON.parse(
      await download(page, "Export analysis JSON", info.outputPath("opponent-analysis.json")),
    ),
  );
  expect(opponent.actor).toBe("opponent");
  expect(opponent.observations).toHaveLength(1);
  expect(opponent.actions.some((action) => action.cell === opponent.observations[0]?.cell)).toBe(
    false,
  );
  await page.getByRole("button", { name: "Apply settings to both agents", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply settings to both agents", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".game-status")).toContainText("Turn 2");
  await expect(page.getByRole("slider", { name: /Policy precision/ })).toHaveValue("0");
  await expect(page.getByRole("slider", { name: /Center habit/ })).toHaveValue("0");
  expect(errors).toEqual([]);
});

test("discards unapplied experiments and opens the lab in a resident offline game", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Launch game", exact: true }).waitFor();
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Decision explorer", exact: true }).click();
  await page.getByRole("button", { name: "Immediate hits", exact: true }).click();
  await expect(page.getByRole("slider", { name: /Epistemic weight/ })).toHaveValue("0");
  await page.getByRole("button", { name: "Copy live settings", exact: true }).click();
  await expect(page.getByRole("slider", { name: /Epistemic weight/ })).toHaveValue("1");
  await page.getByRole("button", { name: "Habit only", exact: true }).click();
  await page.getByRole("button", { name: "Diagnostics", exact: true }).click();
  await page.getByRole("button", { name: "Decision explorer", exact: true }).click();
  await expect(page.getByRole("slider", { name: /Policy precision/ })).toHaveValue("8");
  await expect(
    page.getByRole("button", { name: "Apply settings to both agents", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("heading", { name: "A map of the decision", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("resident-offline-lab.png") });
  await page.context().setOffline(false);
});

test("renders every decision map layer and the expanded factor explanation", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Launch game", exact: true }).click();
  await page.getByRole("button", { name: /^Target A1:/ }).click();
  await page.getByRole("button", { name: "Fire at A1", exact: true }).click();
  const mapReplayBefore = await download(page, "Export replay", info.outputPath("map-before.json"));
  await page.getByRole("button", { name: "Decision explorer", exact: true }).click();
  await page.getByLabel("Inspect coordinate", { exact: true }).selectOption("1");
  for (const theme of ["dark", "light"]) {
    await page.getByLabel("Color theme").selectOption(theme);
    for (const [key, label] of [
      ["occupancy", "Ship probability"],
      ["predictedHit", "Hit forecast"],
      ["informationGain", "Expected information"],
      ["risk", "Preference cost"],
      ["expectedFreeEnergy", "Generalized G"],
      ["probability", "Choice probability"],
    ]) {
      if (!key || !label) throw new Error("Missing layer fixture");
      await page.getByLabel("Map layer", { exact: true }).selectOption(key);
      await expect(
        page.getByRole("button", { name: new RegExp(`^Analysis target A2: unknown, ${label}`) }),
      ).toHaveAttribute("aria-pressed", "true");
      await page
        .getByRole("heading", { name: "A map of the decision", exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`${theme}-map-${key}.png`) });
    }
  }

  await page.getByRole("button", { name: "Uniform choices", exact: true }).click();
  await page.getByLabel("Sweep parameter").selectOption("policyPrecision");
  await page.getByText("Sweep values and ranking", { exact: true }).click();
  await expect(page.locator(".sensitivity-panel tbody tr")).toHaveCount(9);
  await page.getByText("Inspect A / B / C / D / E / G / q_pi", { exact: true }).click();
  await expect(page.locator(".factor-inspector .source-code")).toContainText("q_pi(u) = softmax");
  await capture(page, info.outputPath("expanded-lab.png"));
  expect(await download(page, "Export replay", info.outputPath("map-after.json"))).toBe(
    mapReplayBefore,
  );
  expect(errors).toEqual([]);
});

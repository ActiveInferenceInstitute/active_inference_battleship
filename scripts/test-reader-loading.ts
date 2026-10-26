/** Exercise the real reader's dependency, startup, recovery and timeout paths. */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, expect, type Page } from "@playwright/test";
import { waitForReader } from "./manuscript-menus";
import { externalEnvironment } from "./paths";

const allowed = new Set(["--hide-loading", "--hide-error"]);
for (const option of process.argv.slice(2))
  if (!allowed.has(option)) throw new Error(`Unknown loading option: ${option}`);
const hiddenState = process.argv.includes("--hide-loading")
  ? "loading"
  : process.argv.includes("--hide-error")
    ? "error"
    : null;
const env = externalEnvironment();
const output = await mkdtemp(join(env["TMPDIR"] ?? "", "reader-loading-"));
const url = process.env["MANUSCRIPT_URL"] ?? "http://127.0.0.1:5196";
const dependency = "https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-chtml.js";
const context = await chromium.launchPersistentContext(join(output, "chrome"), {
  channel: "chrome",
  headless: true,
  viewport: { width: 390, height: 844 },
  env: { ...env, TMPDIR: output, XDG_CACHE_HOME: join(output, "cache") },
});
const errors: string[] = [];
const captures: string[] = [];
const checks: unknown[] = [];
const report = {
  completed: false,
  hiddenState,
  errors,
  checks,
  captures,
  failure: null as string | null,
};

function contrast(first: string, second: string): number {
  const luminance = (color: string) => {
    const channels = color
      .match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number);
    if (channels?.length !== 3) throw new Error(`Unsupported reader color: ${color}`);
    return channels.reduce((sum, channel, index) => {
      const value = channel / 255;
      return (
        sum +
        (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) *
          ([0.2126, 0.7152, 0.0722][index] ?? 0)
      );
    }, 0);
  };
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function newPage(width: number, theme: "light" | "dark") {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ colorScheme: theme });
  page.on("pageerror", (error) => errors.push(error.message));
  if (hiddenState)
    await page.route(url, async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: (await response.text()).replace(
          "</head>",
          `<style>.paper-math-loading[data-state=${hiddenState}]{display:none!important}</style></head>`,
        ),
      });
    });
  return page;
}

async function inspect(page: Page, phase: "loading" | "ready" | "error") {
  const panel = page.getByRole("complementary", { name: "Mathematical notation", exact: true });
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-state", phase);
  await expect(panel).toHaveAttribute("aria-busy", String(phase === "loading"));
  const status = panel.locator("#paper-math-status");
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("role", phase === "error" ? "alert" : "status");
  await expect(status).toHaveText(
    phase === "ready"
      ? "Mathematical notation is ready."
      : phase === "loading"
        ? "Loading mathematical notation."
        : /could not load|timed out/,
  );
  const retry = panel.getByRole("button", { name: "Retry notation", exact: true });
  if (phase === "error") await expect(retry).toBeEnabled();
  else await expect(retry).toBeDisabled();
  const state = await panel.evaluate((node) => {
    const background = getComputedStyle(node).backgroundColor;
    return {
      text: node.textContent,
      rect: node.getBoundingClientRect().toJSON(),
      viewport: document.documentElement.clientWidth,
      raw: document.querySelectorAll(".math").length,
      rendered: document.querySelectorAll("mjx-container").length,
      labels: [...node.querySelectorAll("p,button,a")].map((label) => {
        const style = getComputedStyle(label);
        return {
          text: label.textContent,
          color: style.color,
          background,
          size: Number.parseFloat(style.fontSize),
        };
      }),
      targets: [...node.querySelectorAll("button,a")].map((target) => {
        const style = getComputedStyle(target);
        return {
          ...target.getBoundingClientRect().toJSON(),
          border: target.tagName === "BUTTON" ? style.borderTopColor : null,
          background: style.backgroundColor,
        };
      }),
    };
  });
  expect(state.rect.left).toBeGreaterThanOrEqual(0);
  expect(state.rect.right).toBeLessThanOrEqual(state.viewport);
  for (const label of state.labels) {
    expect(label.size).toBeGreaterThanOrEqual(15);
    expect(contrast(label.color, label.background)).toBeGreaterThanOrEqual(4.5);
  }
  for (const target of state.targets) {
    expect(target.height).toBeGreaterThanOrEqual(44);
    if (target.border) {
      expect(contrast(target.border, target.background)).toBeGreaterThanOrEqual(3);
      expect(contrast(target.border, state.labels[0]?.background ?? "")).toBeGreaterThanOrEqual(3);
    }
  }
  return state;
}

async function capture(page: Page, name: string) {
  await page.locator(".paper-math-loading").scrollIntoViewIfNeeded();
  const path = join(output, `${name}.png`);
  await page.screenshot({ path });
  captures.push(path);
}

try {
  await mkdir(join(output, "cache"));
  for (const width of [390, 1440, 1920])
    for (const theme of ["light", "dark"] as const) {
      const page = await newPage(width, theme);
      let release: () => void = () => {
        throw new Error("Dependency request was not held");
      };
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let held = false;
      await page.route(dependency, async (route) => {
        held = true;
        await gate;
        await route.continue();
      });
      try {
        await page.goto(url, { waitUntil: "commit" });
        await expect.poll(() => held).toBe(true);
        const pending = await inspect(page, "loading");
        expect(pending.raw).toBe(112);
        expect(pending.rendered).toBe(0);
        await capture(page, `${theme}-${width}-loading`);
        release();
        await waitForReader(page);
        const ready = await inspect(page, "ready");
        expect(ready.rendered).toBe(112);
        checks.push({
          width,
          theme,
          case: "actual held dependency and normal readiness",
          pending,
          ready,
        });
      } finally {
        release();
        await page.close();
      }

      const blocked = await newPage(width, theme);
      let attempts = 0;
      await blocked.route(dependency, (route) =>
        ++attempts === 1 ? route.abort("internetdisconnected") : route.continue(),
      );
      try {
        await blocked.goto(url, { waitUntil: "networkidle" });
        const failure = await inspect(blocked, "error");
        expect(failure.raw).toBe(112);
        expect(failure.rendered).toBe(0);
        const rejected = await blocked.evaluate(async () => {
          try {
            await Reflect.get(window, "battleshipMathMenuReady");
            return false;
          } catch {
            return true;
          }
        });
        expect(rejected).toBe(true);
        await capture(blocked, `${theme}-${width}-failed`);
        const alternatives = [];
        for (const name of ["Open PDF", "Open Word"]) {
          const href = await blocked.getByRole("link", { name, exact: true }).getAttribute("href");
          if (!href) throw new Error(`Missing ${name} link`);
          const response = await blocked.request.get(new URL(href, url).href);
          expect(response.ok()).toBe(true);
          const bytes = await response.body();
          expect(bytes.subarray(0, name === "Open PDF" ? 4 : 2).toString()).toBe(
            name === "Open PDF" ? "%PDF" : "PK",
          );
          alternatives.push({ name, href, bytes: bytes.length });
        }
        await Promise.all([
          blocked.waitForNavigation({ waitUntil: "domcontentloaded" }),
          blocked.getByRole("button", { name: "Retry notation", exact: true }).click(),
        ]);
        await waitForReader(blocked);
        const recovered = await inspect(blocked, "ready");
        expect(recovered.rendered).toBe(112);
        await expect(blocked.locator("main")).toContainText("All planned comparisons");
        await capture(blocked, `${theme}-${width}-recovered`);
        checks.push({
          width,
          theme,
          case: "blocked actual dependency, alternatives and real reload retry",
          failure,
          recovered,
          attempts,
          alternatives,
        });
      } finally {
        await blocked.close();
      }
    }

  const invalid = await newPage(390, "dark");
  try {
    await invalid.addInitScript(() =>
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          const engine = Reflect.get(window, "MathJax");
          engine.startup.promise.then(() =>
            engine.startup.document.menu.menu.constructor.DynamicSubmenus.delete("Clearspeak"),
          );
        },
        { once: true },
      ),
    );
    await invalid.goto(url, { waitUntil: "networkidle" });
    const state = await inspect(invalid, "error");
    expect(
      await invalid.evaluate(() => Reflect.get(window, "battleshipMathReaderState").cause),
    ).toContain("Unsupported MathJax");
    await capture(invalid, "dark-390-startup-contract-error");
    checks.push({ case: "real native startup contract failure", state });
  } finally {
    await invalid.close();
  }

  const timeout = await newPage(390, "light");
  let releaseTimeout: () => void = () => {
    throw new Error("Timeout dependency was not held");
  };
  const timeoutGate = new Promise<void>((resolve) => {
    releaseTimeout = resolve;
  });
  try {
    await timeout.route(dependency, async (route) => {
      await timeoutGate;
      await route.continue();
    });
    await timeout.goto(url, { waitUntil: "commit" });
    await inspect(timeout, "loading");
    const start = Date.now();
    await expect(timeout.locator("#paper-math-status")).toContainText(
      "timed out after 30 seconds",
      { timeout: 35000 },
    );
    const state = await inspect(timeout, "error");
    const elapsedMs = Date.now() - start;
    expect(elapsedMs).toBeGreaterThanOrEqual(29000);
    await capture(timeout, "light-390-real-timeout");
    releaseTimeout();
    await timeout.waitForLoadState("networkidle");
    await expect(timeout.locator(".paper-math-loading")).toHaveAttribute("data-state", "error");
    checks.push({ case: "real 30-second deadline and late request isolation", elapsedMs, state });
  } finally {
    releaseTimeout();
    await timeout.close();
  }
  expect(errors).toEqual([]);
  report.completed = true;
} catch (error) {
  report.failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
  throw error;
} finally {
  await context.close();
  await writeFile(join(output, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      output,
      completed: report.completed,
      checks: checks.length,
      captures: captures.length,
      errors,
      failure: report.failure,
    }),
  );
}

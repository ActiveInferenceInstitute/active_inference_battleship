import { createHash } from "node:crypto";
import { mkdir, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";
import {
  checkClearSpeakPreferences,
  checkMathDialog,
  checkMenus,
  checkPreferenceEscapeOutside,
  waitForReader,
} from "./manuscript-menus";
import { externalEnvironment, projectRoot } from "./paths";
import { assertMathHelpContained } from "./reader-math";
import { captureReadingFrame, verifyReadingFrames } from "./reader-paint";
import { assertAllTableReadingOrigins } from "./reader-table";

if (await Bun.file(join(projectRoot, "output/native-zoom.json")).exists())
  throw new Error("Preserve the accepted native-zoom manifest before recapturing");
const paintFrames: Awaited<ReturnType<typeof captureReadingFrame>>[] = [];
const env = externalEnvironment();
const profile = await mkdtemp(join(env["TMPDIR"] ?? "", "paper-native-zoom-"));
const context = await chromium.launchPersistentContext(profile, {
  channel: "chrome",
  headless: false,
  viewport: null,
  env,
  args: ["--window-size=1440,1080"],
});
const output = join(projectRoot, "output/qa/zoom");
await mkdir(output, { recursive: true });
try {
  const page = await context.newPage();
  const errors: { phase: string; message: string; stack: string | undefined }[] = [];
  let phase = "loading";
  page.on("pageerror", (error) =>
    errors.push({ phase, message: error.message, stack: error.stack }),
  );
  const url = process.env["MANUSCRIPT_URL"] ?? "http://127.0.0.1:5196";
  const geometry = () =>
    page.evaluate(() => ({
      width: innerWidth,
      outerWidth,
      ratio: devicePixelRatio,
      scroll: document.documentElement.scrollWidth,
      viewport: innerHeight,
      height: document.documentElement.scrollHeight,
      cssZoom: getComputedStyle(document.documentElement).zoom,
    }));
  await page.goto(url, { waitUntil: "networkidle" });
  const before = await geometry();
  const settings = await context.newPage();
  await settings.goto("chrome://settings/appearance");
  await settings.getByRole("combobox", { name: "Page zoom", exact: true }).selectOption("2");
  await expect(settings.getByRole("combobox", { name: "Page zoom", exact: true })).toHaveValue("2");
  const captures: { path: string; sha256: string; theme: string; y: number }[] = [];
  const record = async (bytes: Buffer, path: string, theme: string, y: number) => {
    await Bun.write(path, bytes);
    captures.push({
      path: path.slice(projectRoot.length + 1),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      theme,
      y,
    });
  };
  await settings.getByRole("combobox", { name: "Page zoom", exact: true }).scrollIntoViewIfNeeded();
  const settingsCdp = await context.newCDPSession(settings);
  const method = await settingsCdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await record(
    Buffer.from(method.data, "base64"),
    join(output, "chrome-page-zoom-200.png"),
    "method",
    0,
  );
  await page.bringToFront();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelectorAll("mjx-container").length > 10);
  await waitForReader(page);
  const after = await geometry();
  expect(after.width * 2).toBeCloseTo(before.width, 0);
  expect(after.ratio / before.ratio).toBeCloseTo(2, 5);
  expect(after.outerWidth).toBe(before.outerWidth);
  expect(after.cssZoom).toBe("1");
  const cdp = await context.newCDPSession(page);
  const menuChecks = [];
  for (const theme of ["light", "dark"] as const) {
    phase = `reading-${theme}`;
    await page.emulateMedia({ colorScheme: theme });
    await page.evaluate(() => document.fonts.ready);
    const state = await geometry();
    expect(state.scroll).toBeLessThanOrEqual(state.width);
    for (let y = 0, index = 0; y < state.height; y += Math.max(1, state.viewport - 160), index++) {
      await page.evaluate((value) => scrollTo(0, value), y);
      const actualY = await page.evaluate(() => scrollY);
      const path = join(output, `${theme}-${String(index).padStart(2, "0")}.png`);
      const frame = await captureReadingFrame(page, path, async () => {
        const raw = await cdp.send("Page.captureScreenshot", {
          format: "png",
          fromSurface: true,
          captureBeyondViewport: false,
        });
        const bytes = Buffer.from(raw.data, "base64");
        expect(bytes.readUInt32BE(16)).toBe(Math.round(before.width * before.ratio));
        return bytes;
      });
      paintFrames.push(frame);
      captures.push({ ...frame, theme });
      if (actualY + state.viewport >= state.height) break;
    }
    await page.evaluate(() => scrollTo(0, 0));
    const recordMenu = async (name: string) => {
      const raw = await cdp.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false,
      });
      await record(
        Buffer.from(raw.data, "base64"),
        join(output, `${theme}-${name}.png`),
        `${theme}-menu`,
        await page.evaluate(() => scrollY),
      );
    };
    phase = `menus-${theme}`;
    await assertAllTableReadingOrigins(page);
    await page.locator('mjx-container[display="true"]').first().focus();
    await assertMathHelpContained(page);
    const states = await checkMenus(page, recordMenu);
    phase = `dialog-${theme}`;
    menuChecks.push({
      theme,
      states,
      dialog: await checkMathDialog(page, recordMenu),
      preferences: await checkClearSpeakPreferences(page, recordMenu),
      preferencesEscape: await checkPreferenceEscapeOutside(page, recordMenu),
    });
  }
  expect(errors).toEqual([]);
  await verifyReadingFrames(paintFrames, "reader-paint-native");
  await Bun.write(
    join(projectRoot, "output/native-zoom.json"),
    JSON.stringify({ completed: true, before, after, menuChecks, errors, captures }, null, 2),
  );
  console.log(JSON.stringify({ before, after, captures: captures.length }));
} finally {
  await context.close();
}

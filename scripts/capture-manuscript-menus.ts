import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";
import {
  checkClearSpeakPreferences,
  checkExpandedRejections,
  checkMathDialog,
  checkMenus,
  checkPreferenceEscapeOutside,
  checkRejectedMenuStyles,
} from "./manuscript-menus";
import { externalEnvironment, projectRoot } from "./paths";

if (await Bun.file(join(projectRoot, "output/menu-captures.json")).exists())
  throw new Error("Preserve the accepted menu manifest before recapturing");
let completed = false;
let failure: string | null = null;
const env = externalEnvironment();
const profile = await mkdtemp(join(env["TMPDIR"] ?? "", "paper-menu-"));
const output = join(projectRoot, "output/qa/menus");
await mkdir(output, { recursive: true });
const context = await chromium.launchPersistentContext(profile, {
  channel: "chrome",
  headless: true,
  env,
  viewport: { width: 1440, height: 1000 },
});
const captures: { path: string; sha256: string; width: number; theme: string; y: number }[] = [];
const checks = [];
const negativeControls = [];
const errors: { phase: string; message: string; stack: string | undefined }[] = [];
let phase = "loading";
try {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) =>
    errors.push({ phase, message: error.message, stack: error.stack }),
  );
  for (const width of [390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"] as const) {
      phase = `load-${width}-${theme}`;
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(process.env["MANUSCRIPT_URL"] ?? "http://127.0.0.1:5196", {
        waitUntil: "networkidle",
      });
      await page.waitForFunction(
        () => document.querySelectorAll("mjx-container").length > 10,
        undefined,
        { timeout: 30000 },
      );
      const record = async (name: string) => {
        const path = join(output, `${theme}-${width}-${name}.png`);
        await page.screenshot({ path });
        captures.push({
          path: path.slice(projectRoot.length + 1),
          sha256: createHash("sha256")
            .update(await readFile(path))
            .digest("hex"),
          theme,
          width,
          y: await page.evaluate(() => scrollY),
        });
      };
      phase = `menus-${width}-${theme}`;
      const states = await checkMenus(page, record);
      phase = `dialog-${width}-${theme}`;
      const dialog = await checkMathDialog(page, record);
      const preferences = await checkClearSpeakPreferences(page, record);
      const preferencesEscape = await checkPreferenceEscapeOutside(page, record);
      checks.push({ width, theme, states, dialog, preferences, preferencesEscape });
      if (width === 390 && theme === "dark")
        negativeControls.push(...(await checkRejectedMenuStyles(page)));
      if (width === 1440 && theme === "dark")
        negativeControls.push(...(await checkExpandedRejections(page)));
      console.log(JSON.stringify({ width, theme, menus: states.paths.length }));
    }
  }
  expect(errors).toEqual([]);
  completed = true;
} catch (error) {
  failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
  throw error;
} finally {
  await context.close();
  await writeFile(
    join(
      projectRoot,
      completed ? "output/menu-captures.json" : "output/menu-captures-rejected.json",
    ),
    `${JSON.stringify({ completed, failure, checks, negativeControls, errors, captures }, null, 2)}\n`,
  );
}

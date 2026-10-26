/** Traverse every enabled native menu from a fresh profile per configuration. */
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";
import type * as MenuHelpers from "./manuscript-menus";
import { externalEnvironment, projectRoot } from "./paths";

for (const option of process.argv.slice(2))
  if (option !== "--legacy-reset") throw new Error(`Unknown cascade option: ${option}`);
const legacy = process.argv.includes("--legacy-reset");
const env = externalEnvironment();
const output = await mkdtemp(join(env["TMPDIR"] ?? "", "reader-cascades-"));
let helpers: typeof MenuHelpers;
if (legacy) {
  const original = await readFile(join(projectRoot, "scripts/manuscript-menus.ts"), "utf8");
  const mutated = original.replace(
    / {2}\/\* Native incidental cascade reset: begin \*\/[\s\S]*? {2}\/\* Native incidental cascade reset: end \*\//,
    `  await page.locator('[role="menu"]').last().focus();\n  await page.keyboard.press("ArrowLeft");`,
  );
  if (mutated === original) throw new Error("Cascade reset control target is missing");
  const script = join(output, "legacy-menus.ts");
  await writeFile(
    script,
    mutated.replace(
      'from "@playwright/test"',
      `from ${JSON.stringify(pathToFileURL(join(projectRoot, "node_modules/@playwright/test/index.mjs")).href)}`,
    ),
  );
  helpers = (await import(pathToFileURL(script).href)) as typeof MenuHelpers;
} else helpers = await import("./manuscript-menus");
const errors: string[] = [];
const captures: { path: string; sha256: string; theme: string; width: number }[] = [];
const configurations: unknown[] = [];
const report = {
  completed: false,
  legacy,
  errors,
  captures,
  configurations,
  failure: null as string | null,
};
try {
  for (const width of [1440, 390, 1920])
    for (const theme of ["light", "dark"] as const) {
      const context = await chromium.launchPersistentContext(
        join(output, `${theme}-${width}-profile`),
        {
          channel: "chrome",
          headless: true,
          viewport: { width, height: 1000 },
          env: { ...env, TMPDIR: output, XDG_CACHE_HOME: join(output, `${theme}-${width}-cache`) },
        },
      );
      try {
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(error.message));
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(process.env["MANUSCRIPT_URL"] ?? "http://127.0.0.1:5196", {
          waitUntil: "networkidle",
        });
        await helpers.waitForReader(page);
        await page.locator('mjx-container[display="true"]').first().focus();
        const result = await helpers.checkMenus(page, async (name) => {
          if (name !== "menu-keyboard") return;
          const path = join(output, `${theme}-${width}-cold-keyboard.png`);
          const bytes = await page.screenshot({ path });
          captures.push({
            path,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            theme,
            width,
          });
        });
        const paths = new Set(result.paths.map((row) => JSON.stringify(row.path)));
        expect(paths.size).toBe(23);
        expect(paths.has(JSON.stringify(["Explorer►", "Highlight►"]))).toBe(true);
        for (const reset of result.cascadeResets) expect(reset.after).toBe(reset.before - 1);
        expect(result.focusChecks).toHaveLength(2);
        await expect(page.locator('[role="menu"]')).toHaveCount(0);
        configurations.push({ width, theme, paths: [...paths], result });
        console.log(
          JSON.stringify({
            width,
            theme,
            uniquePaths: paths.size,
            cascadeResets: result.cascadeResets.length,
          }),
        );
      } finally {
        await context.close();
      }
    }
  expect(errors).toEqual([]);
  report.completed = true;
} catch (error) {
  report.failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
  throw error;
} finally {
  await writeFile(join(output, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      output,
      completed: report.completed,
      legacy,
      configurations: configurations.length,
      errors,
      failure: report.failure,
    }),
  );
}

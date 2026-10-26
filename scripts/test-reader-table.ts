import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";
import { waitForReader } from "./manuscript-menus";
import { externalEnvironment } from "./paths";

const { assertTableReadingOrigin, checkAndResetTableScroll, tableReadingOrigin } = await import(
  process.argv.includes("--legacy-settle")
    ? "../tests/fixtures/reader-table-before-scroll-drain"
    : "./reader-table"
);

const env = externalEnvironment();
const output = await mkdtemp(join(env["TMPDIR"] ?? "", "reader-table-"));
const context = await chromium.launchPersistentContext(join(output, "profile"), {
  channel: "chrome",
  headless: true,
  env,
  viewport: { width: 390, height: 1000 },
});
const rows = [];
try {
  for (const theme of ["light", "dark"] as const) {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(process.env["MANUSCRIPT_URL"] ?? "http://127.0.0.1:5196", {
      waitUntil: "networkidle",
    });
    await waitForReader(page);
    const cycles = [];
    const count = await page.locator(".table-scroll").count();
    expect(count).toBeGreaterThan(0);
    const controls = [];
    for (let index = 0; index < count; index++) {
      const caption = page.locator(".table-scroll").nth(index).locator("caption");
      const previous = await caption.getAttribute("style");
      await caption.evaluate((element) =>
        element.setAttribute("style", "width:1600px;max-width:none"),
      );
      let captionRejection: string | null = null;
      try {
        await assertTableReadingOrigin(page, index);
      } catch (error) {
        captionRejection = String(error);
      }
      expect(captionRejection).toContain("Every table caption glyph");
      await caption.evaluate(
        (element, style) =>
          style === null ? element.removeAttribute("style") : element.setAttribute("style", style),
        previous,
      );
      await assertTableReadingOrigin(page, index);
      for (let cycle = 0; cycle < 8; cycle++)
        cycles.push({ index, ...(await checkAndResetTableScroll(page, index)) });
      await page
        .locator(".table-scroll")
        .nth(index)
        .evaluate((element) => element.scrollTo({ left: 2, behavior: "instant" }));
      const residual = await tableReadingOrigin(page, index);
      expect(residual.scrollLeft).toBe(2);
      let rejection: string | null = null;
      try {
        await assertTableReadingOrigin(page, index);
      } catch (error) {
        rejection = String(error);
      }
      expect(rejection).toContain("horizontal offset zero");
      const restored = await checkAndResetTableScroll(page, index);
      controls.push({ index, residual, rejection, captionRejection, restored });
    }
    expect(errors).toEqual([]);
    rows.push({ theme, cycles, controls, errors });
    await page.close();
  }
  const receipt = join(output, "results.json");
  await writeFile(receipt, `${JSON.stringify({ completed: true, rows }, null, 2)}\n`);
  console.log(
    JSON.stringify({
      receipt,
      completed: true,
      cycles: rows.reduce((n, r) => n + r.cycles.length + r.controls.length, 0),
      controlsRejected: rows.reduce((n, r) => n + 2 * r.controls.length, 0),
    }),
  );
} finally {
  await context.close();
}

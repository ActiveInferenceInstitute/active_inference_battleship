import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";
import { externalEnvironment } from "./paths";
import { inspectReadyFigures } from "./reader-images";

const legacy = process.argv.includes("--legacy-measure");
for (const option of process.argv.slice(2))
  if (option !== "--legacy-measure") throw new Error(`Unknown image option: ${option}`);
const env = externalEnvironment(),
  output = await mkdtemp(join(env["TMPDIR"] ?? "", "reader-images-"));
const context = await chromium.launchPersistentContext(join(output, "chrome"), {
  channel: "chrome",
  headless: true,
  viewport: { width: 390, height: 1000 },
  env: { ...env, TMPDIR: output, XDG_CACHE_HOME: join(output, "cache") },
});
const report = {
  completed: false,
  legacy,
  held: false,
  decoded: 0,
  brokenRejected: false,
  legacyNonfinite: false,
  failure: null as string | null,
};
let release: () => void = () => {
  throw new Error("No held image request");
};
try {
  const page = await context.newPage();
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/figures/graphical-abstract.png", async (route) => {
    report.held = true;
    await gate;
    await route.continue();
  });
  await page.goto(process.env["MANUSCRIPT_URL"] ?? "http://127.0.0.1:5196", {
    waitUntil: "commit",
  });
  await expect(page.locator("figure img")).toHaveCount(10);
  await expect.poll(() => report.held).toBe(true);
  let settled = false;
  const ready = legacy
    ? page.locator("figure img").evaluateAll((elements) =>
        elements.map((element) => {
          const image = element as HTMLImageElement;
          const box = image.getBoundingClientRect();
          return {
            difference: Math.abs(box.width / box.height - image.naturalWidth / image.naturalHeight),
          };
        }),
      )
    : inspectReadyFigures(page, 10);
  ready.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  if (legacy && settled)
    report.legacyNonfinite = (await ready).some((image) => !Number.isFinite(image.difference));
  expect(settled, "An unfinished image must not reach aspect measurement").toBe(false);
  release();
  const decoded = await ready;
  expect(decoded).toHaveLength(10);
  report.decoded = decoded.length;
  await page.close();
  const broken = await context.newPage();
  await broken.route("**/figures/graphical-abstract.png", (route) =>
    route.fulfill({ contentType: "image/png", body: "This is not a PNG" }),
  );
  await broken.goto(process.env["MANUSCRIPT_URL"] ?? "http://127.0.0.1:5196", {
    waitUntil: "networkidle",
  });
  try {
    await inspectReadyFigures(broken, 10);
  } catch (error) {
    report.brokenRejected =
      String(error).includes("Figure could not decode:") &&
      String(error).includes("graphical-abstract.png");
  }
  expect(report.brokenRejected).toBe(true);
  await broken.close();
  report.completed = true;
} catch (error) {
  report.failure = String(error);
  throw error;
} finally {
  release();
  await context.close();
  await writeFile(join(output, "results.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output, ...report }));
}

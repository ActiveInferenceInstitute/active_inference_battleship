import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { externalEnvironment, projectRoot } from "./paths";

const env = externalEnvironment();
const evidence = join(
  projectRoot,
  ".cache/performance",
  new Date().toISOString().replaceAll(":", "-"),
);
await mkdir(evidence, { recursive: true });
const profile = await mkdtemp(join(env["TMPDIR"] ?? "", "lighthouse-chrome-"));
const browser = await chromium.launchPersistentContext(profile, {
  channel: "chrome",
  headless: true,
  args: ["--remote-debugging-port=0"],
  env,
});
const results: {
  preset: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}[] = [];
try {
  const port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]);
  for (const preset of ["mobile", "desktop"]) {
    for (let run = 0; run < 3; run++) {
      const report = await lighthouse(
        "http://127.0.0.1:5187",
        {
          port,
          output: "json",
          logLevel: "error",
          onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        },
        preset === "desktop" ? desktopConfig : undefined,
      );
      if (!report) throw new Error("Lighthouse returned no report");
      if (report.lhr.configSettings.formFactor !== preset)
        throw new Error("Lighthouse form-factor mismatch");
      await writeFile(join(evidence, `${preset}-${run}.json`), JSON.stringify(report.lhr, null, 2));
      const score = (key: string) => Math.round((report.lhr.categories[key]?.score ?? 0) * 100);
      results.push({
        preset,
        performance: score("performance"),
        accessibility: score("accessibility"),
        bestPractices: score("best-practices"),
        seo: score("seo"),
      });
      console.log(JSON.stringify(results.at(-1)));
    }
  }
} finally {
  await browser.close();
}
await writeFile(join(evidence, "summary.json"), JSON.stringify(results, null, 2));
console.log(`Performance evidence: ${evidence}`);
const median = (values: number[]) => values.sort((a, b) => a - b)[1] ?? 0;
for (const preset of ["mobile", "desktop"]) {
  const samples = results.filter((r) => r.preset === preset);
  for (const key of ["performance", "accessibility", "bestPractices", "seo"] as const) {
    if (median(samples.map((s) => s[key])) < 100)
      throw new Error(`${preset} median ${key} is below 100; inspect the retained reports`);
  }
}

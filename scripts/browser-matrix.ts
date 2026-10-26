import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  type BrowserCase,
  browserCaseKey,
  collectBrowserCases,
  requireExactBrowserCases,
  requireReportDigest,
} from "./browser-receipts";
import { externalEnvironment, projectRoot } from "./paths";

const destination = join(projectRoot, ".cache/browser-matrix");
await mkdir(destination, { recursive: true });
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const receiptSchema = z.object({ inputDigest: z.string(), reportSha256: z.string() });
const legacySchema = z.object({
  inputDigest: z.string(),
  sourceBindings: z.record(z.string(), z.string()),
  completedCases: z.number().int().nonnegative(),
});
const legacyReceiptSchema = receiptSchema.extend({ passed: z.number().int().positive() });
const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, "utf8"));
const inputs = ["playwright.config.ts", "project.json", "index.html"];
for (const directory of ["src", "models", "e2e", "dist"])
  for await (const file of new Bun.Glob("**/*").scan({
    cwd: join(projectRoot, directory),
    onlyFiles: true,
  }))
    inputs.push(join(directory, file));
const sourceBindings = Object.fromEntries(
  await Promise.all(
    inputs.sort().map(async (path) => [path, hash(await readFile(join(projectRoot, path)))]),
  ),
);
const orchestrationBindings = Object.fromEntries(
  await Promise.all(
    ["scripts/browser-matrix.ts", "scripts/browser-receipts.ts"].map(async (path) => [
      path,
      hash(await readFile(join(projectRoot, path))),
    ]),
  ),
);
const inputDigest = hash(JSON.stringify({ sourceBindings, orchestrationBindings }));
async function requireUnchanged() {
  for (const [path, digest] of Object.entries({ ...sourceBindings, ...orchestrationBindings }))
    if (hash(await readFile(join(projectRoot, path))) !== digest)
      throw new Error(`Browser input changed: ${path}`);
}
const inventoryPath = join(destination, `inventory-${inputDigest}.json`);
if (!(await Bun.file(inventoryPath).exists())) {
  const list = Bun.spawn(
    ["bun", "x", "--no-install", "playwright", "test", "--list", "--reporter=json"],
    {
      cwd: projectRoot,
      env: externalEnvironment(),
      stdout: Bun.file(inventoryPath),
      stderr: Bun.file(inventoryPath + ".stderr"),
    },
  );
  if ((await list.exited) !== 0) throw new Error(`Browser inventory failed: ${inventoryPath}`);
}
const inventory = collectBrowserCases(await readJson(inventoryPath));
if (inventory.length !== 70) throw new Error(`Expected70 configured cases, got${inventory.length}`);
const configured = new Map(inventory.map((item) => [browserCaseKey(item), item]));
interface Evidence {
  origin: "completed-batch" | "isolated-case";
  report: string;
  reportSha256: string;
  cases: BrowserCase[];
}
const evidence: Evidence[] = [];
const covered = new Set<string>();
function accept(item: Evidence) {
  for (const entry of item.cases) {
    const key = browserCaseKey(entry);
    if (!configured.has(key) || covered.has(key))
      throw new Error(`Unexpected or repeated browser case: ${key}`);
    covered.add(key);
  }
  evidence.push(item);
}
// Optional, explicit migration: only clean completed reports with identical test/build bytes qualify.
const legacyPath = join(destination, "legacy-inputs.json");
if (await Bun.file(legacyPath).exists()) {
  const legacy = legacySchema.parse(await readJson(legacyPath));
  if (hash(JSON.stringify(legacy.sourceBindings)) !== legacy.inputDigest)
    throw new Error("Legacy binding digest mismatch");
  const runner = "scripts/browser-matrix.ts";
  if (
    hash(await readFile(join(destination, "history/runner-v1.ts"))) !==
    legacy.sourceBindings[runner]
  )
    throw new Error("Legacy runner changed");
  const previous = Object.fromEntries(
    Object.entries(legacy.sourceBindings).filter(([path]) => path !== runner),
  );
  if (JSON.stringify(previous) !== JSON.stringify(sourceBindings))
    throw new Error("Legacy application/test/build inputs differ");
  let imported = 0;
  for await (const receiptName of new Bun.Glob("*-receipt.json").scan(
    join(destination, "history"),
  )) {
    const receipt = legacyReceiptSchema.parse(
      await readJson(join(destination, "history", receiptName)),
    );
    const report = join(
      ".cache/browser-matrix/history",
      receiptName.replace("-receipt.json", ".json"),
    );
    const bytes = await readFile(join(projectRoot, report));
    if (receipt.inputDigest !== legacy.inputDigest)
      throw new Error(`Invalid legacy report: ${report}`);
    requireReportDigest(bytes, receipt.reportSha256);
    const cases = collectBrowserCases(JSON.parse(bytes.toString()), true);
    if (cases.length !== receipt.passed) throw new Error(`Legacy count mismatch: ${report}`);
    accept({ origin: "completed-batch", report, reportSha256: receipt.reportSha256, cases });
    imported += cases.length;
  }
  if (imported !== legacy.completedCases) throw new Error("Incomplete legacy adoption");
  console.log(`Verified${imported} completed cases with identical application/test/build inputs`);
}
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const item of inventory) {
  const key = browserCaseKey(item);
  if (covered.has(key)) continue;
  const name = `${item.project}-${hash(key).slice(0, 16)}`;
  const report = join(destination, `${name}.json`),
    receiptPath = join(destination, `${name}-receipt.json`);
  if (await Bun.file(receiptPath).exists()) {
    const receipt = receiptSchema.parse(await readJson(receiptPath));
    const bytes = await readFile(report);
    if (receipt.inputDigest !== inputDigest)
      throw new Error(`Completed case input/report drift: ${name}`);
    requireReportDigest(bytes, receipt.reportSha256);
    requireExactBrowserCases(JSON.parse(bytes.toString()), [item]);
    accept({
      origin: "isolated-case",
      report: join(".cache/browser-matrix", `${name}.json`),
      reportSha256: receipt.reportSha256,
      cases: [item],
    });
    continue;
  }
  // Nonaccepted attempts remain available even when a later isolated execution passes.
  const rejected = join(destination, `unaccepted-${name}-${Date.now()}`);
  await mkdir(rejected);
  for (const path of [
    report,
    join(destination, `${name}.log`),
    join(projectRoot, "test-results/cases", name),
  ]) {
    try {
      await rename(path, join(rejected, path.split("/").at(-1) ?? "artifact"));
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  }
  const argv = [
    "bun",
    "x",
    "--no-install",
    "playwright",
    "test",
    join(projectRoot, "e2e", item.file),
    "--project",
    item.project,
    "--grep",
    escapeRegex(item.title) + "$",
    "--reporter=json",
    "--output",
    `test-results/cases/${name}`,
  ];
  const child = Bun.spawn(argv, {
    cwd: projectRoot,
    env: externalEnvironment(),
    stdout: Bun.file(report),
    stderr: Bun.file(join(destination, `${name}.log`)),
  });
  const code = await child.exited;
  await requireUnchanged();
  if (code !== 0) throw new Error(`Browser case exited${code}: ${name}; see${report}`);
  const bytes = await readFile(report);
  requireExactBrowserCases(JSON.parse(bytes.toString()), [item]);
  const reportSha256 = hash(bytes);
  await writeFile(
    receiptPath,
    JSON.stringify({ inputDigest, reportSha256, case: item, argv }, null, 2) + "\n",
  );
  accept({
    origin: "isolated-case",
    report: join(".cache/browser-matrix", `${name}.json`),
    reportSha256: reportSha256,
    cases: [item],
  });
  console.log(`Completed${covered.size}/70: ${item.project}/${item.title}`);
}
await requireUnchanged();
if (covered.size !== inventory.length) throw new Error("Incomplete browser case coverage");
await writeFile(
  join(destination, "results.json"),
  JSON.stringify(
    {
      protocol: 2,
      inputDigest,
      sourceBindings,
      orchestrationBindings,
      inventory: { path: inventoryPath, sha256: hash(await readFile(inventoryPath)) },
      passed: covered.size,
      evidence,
      retainedFailures:
        "Earlier failed/partial reports remain in history and external task receipts; this is complete passing-case coverage, not a claim that every prior process passed.",
    },
    null,
    2,
  ) + "\n",
);
console.log(`Complete browser coverage: ${covered.size} unique configured cases passed`);

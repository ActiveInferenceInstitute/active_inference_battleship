import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { chromium, expect, type Locator } from "@playwright/test";
import { externalEnvironment, projectRoot } from "./paths";

const env = externalEnvironment();
const base = process.env["BATTLESHIP_CAPTURE_URL"] ?? "http://127.0.0.1:5186";
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))
  throw new Error("Capture requires an explicit loopback preview");
const output = join(projectRoot, "manuscript/figures/dashboard");
const replayPath = join(projectRoot, "research/generated/dashboard-replay.json");
const analysisPath = join(projectRoot, "research/generated/dashboard-analysis.json");
await mkdir(output, { recursive: true });
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const served: Record<string, string> = {};
async function bind(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await bind(path);
    else if (entry.isFile()) {
      const name = relative(join(projectRoot, "dist"), path);
      const response = await fetch(`${base}/${name}`);
      if (!response.ok) throw new Error(`Preview asset unavailable: ${name}`);
      const actual = hash(new Uint8Array(await response.arrayBuffer()));
      if (actual !== hash(await readFile(path)))
        throw new Error(`Preview differs from staged build: ${name}`);
      served[name] = actual;
    } else throw new Error(`Nonregular build asset: ${path}`);
  }
}
await bind(join(projectRoot, "dist"));
const profile = await mkdtemp(join(env["TMPDIR"] ?? "", "battleship-paper-capture-"));
const browser = await chromium.launchPersistentContext(profile, {
  channel: "chrome",
  headless: true,
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: "light",
  reducedMotion: "reduce",
  acceptDownloads: true,
});
const page = browser.pages()[0] ?? (await browser.newPage());
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
const captures: { path: string; sha256: string; region: string; width: number; height: number }[] =
  [];
async function capture(name: string, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
  const bounds = await locator.boundingBox();
  if (
    !bounds ||
    bounds.width < 1 ||
    bounds.height < 1 ||
    Math.max(bounds.width, bounds.height) * 2 > 8192
  )
    throw new Error(`Invalid bounded capture: ${name}`);
  const path = join(output, `${name}.png`);
  await locator.screenshot({ path });
  captures.push({
    path: relative(projectRoot, path),
    sha256: hash(await readFile(path)),
    region: (await locator.getAttribute("class")) ?? name,
    width: bounds.width,
    height: bounds.height,
  });
}
try {
  await page.goto(base);
  await expect(page.getByRole("button", { name: "Launch game", exact: true })).toBeVisible();
  await page.getByLabel("Color theme").selectOption("light");
  await page.getByLabel("Game seed").fill("1943");
  await page.getByLabel("Fleet catalog size").selectOption("256");
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await expect(page.locator(".operation-feedback")).toContainText("New game ready");
  await page.getByRole("button", { name: "Launch game", exact: true }).click();
  for (const cell of ["A1", "C4", "F6", "D8", "H3", "J10"]) {
    await page.getByRole("button", { name: new RegExp(`^Target ${cell}:`) }).click();
    await page.getByRole("button", { name: `Fire at ${cell}`, exact: true }).click();
  }
  await expect(page.locator(".game-status")).toContainText("Turn 7");
  await capture("play-boards", page.locator(".board-panel"));
  await capture("play-metrics", page.locator(".metrics-strip"));
  await capture("play-dials", page.locator(".dials"));
  await capture("masthead", page.locator(".masthead"));
  const replay = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export replay", exact: true }).click();
  await (await replay).saveAs(replayPath);
  await page.getByRole("button", { name: "Decision explorer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Decision explorer", exact: true })).toBeVisible();
  await capture("decision-map", page.locator(".lab-map-panel"));
  await capture("decision-receipt", page.locator(".decision-receipt"));
  await capture("action-tradeoff", page.locator(".action-tradeoff"));
  await capture("action-tradeoff-plot", page.locator(".action-tradeoff figure"));
  const analysis = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export analysis JSON", exact: true }).click();
  await (await analysis).saveAs(analysisPath);
  const snapshot = JSON.parse(await readFile(analysisPath, "utf8"));
  if (
    snapshot.seed !== 1943 ||
    snapshot.catalogueSize !== 256 ||
    snapshot.observations.length !== 6
  )
    throw new Error("Unexpected dashboard experiment state");
  if (errors.length) throw new Error(`Dashboard errors: ${errors.join("; ")}`);
  const receipt = {
    format: "battleship-manuscript-dashboard-capture",
    version: 1,
    captureScriptSha256: hash(await readFile(import.meta.path)),
    url: base,
    capturedAt: new Date().toISOString(),
    browser: browser.browser()?.version(),
    userAgent: await page.evaluate(() => navigator.userAgent),
    viewport: { width: 1440, height: 1000, deviceScaleFactor: 2 },
    seed: 1943,
    catalogueSize: 256,
    actor: snapshot.actor,
    observations: snapshot.observations,
    controls: snapshot.liveControls,
    servedAssets: served,
    captures,
    replaySha256: hash(await readFile(replayPath)),
    analysisSha256: hash(await readFile(analysisPath)),
    errors,
    scope:
      "Cropped screenshots of the running production UI; illustrative local state, not benchmark outcomes or altered mock screens.",
  };
  await writeFile(
    join(projectRoot, "research/generated/dashboard-capture.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      captures: captures.length,
      observations: snapshot.observations.length,
      errors,
    }),
  );
} finally {
  await browser.close();
}

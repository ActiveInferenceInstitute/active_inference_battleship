import { readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { projectRoot } from "./paths";

const probeResults = process.argv.slice(2);
if (probeResults.length !== 2)
  throw new Error(
    "Usage: bun scripts/capture-evidence.ts browser-state-results.json native-zoom-results.json",
  );
const roots = [join(projectRoot, "test-results"), ...probeResults.map((path) => dirname(path))];
const sourcePaths: string[] = [];
for (const directory of ["src", "scripts", "tests", "e2e", "models"]) {
  for await (const path of new Bun.Glob("**/*.{ts,tsx,css,json,md,py}").scan(
    join(projectRoot, directory),
  ))
    sourcePaths.push(join(directory, path));
}
sourcePaths.push(
  "package.json",
  "project.json",
  "bun.lock",
  "biome.json",
  "tsconfig.json",
  "vite.config.ts",
  "playwright.config.ts",
  "index.html",
);
const sourceManifest = await Promise.all(
  sourcePaths.sort().map(async (path) => ({
    path,
    sha256: new Bun.CryptoHasher("sha256")
      .update(await readFile(join(projectRoot, path)))
      .digest("hex"),
  })),
);
const rendered = sourcePaths.filter(
  (path) =>
    path.startsWith("src/") ||
    path.startsWith("models/") ||
    path === "project.json" ||
    path === "index.html",
);
const latestSource = Math.max(
  ...(await Promise.all(
    rendered.map(async (path) => (await stat(join(projectRoot, path))).mtimeMs),
  )),
);
const captures = [];
for (const root of roots) {
  for await (const name of new Bun.Glob("**/*.png").scan(root)) {
    const path = join(root, name);
    const bytes = await readFile(path);
    if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
      throw new Error(`Invalid PNG: ${path}`);
    const width = bytes.readUInt32BE(16),
      height = bytes.readUInt32BE(20);
    if (width < 1 || height < 1 || height > 12000)
      throw new Error(`Unsafe capture dimensions: ${path}`);
    const metadata = await stat(path);
    if (metadata.mtimeMs < latestSource) throw new Error(`Stale capture: ${path}`);
    captures.push({
      path: relative(projectRoot, path),
      width,
      height,
      mtime: metadata.mtime.toISOString(),
      sha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
      kind: name === "chrome-native-zoom-setting.png" ? "browser-setup" : "application",
    });
  }
}
captures.sort((a, b) => a.path.localeCompare(b.path));
await writeFile(
  join(projectRoot, ".cache/source-manifest.json"),
  JSON.stringify(sourceManifest, null, 2),
);
await writeFile(
  join(projectRoot, ".cache/capture-manifest.json"),
  JSON.stringify(captures, null, 2),
);
console.log(
  JSON.stringify({
    sourceFiles: sourceManifest.length,
    captures: captures.length,
    applicationFrames: captures.filter((capture) => capture.kind === "application").length,
    maximumHeight: Math.max(...captures.map((capture) => capture.height)),
  }),
);

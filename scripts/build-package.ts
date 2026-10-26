import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { project } from "../src/project";
import { normalizeDeclaration } from "./declarations";
import { packageInputPaths } from "./package-inputs";
import { requireLocalOutput } from "./package-output";
import { externalEnvironment, projectRoot } from "./paths";

const output = join(projectRoot, "lib"),
  env = externalEnvironment();
const sourcePaths = await packageInputPaths(projectRoot);
const hash = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const sources = Object.fromEntries(
  await Promise.all(
    sourcePaths.sort().map(async (path) => [path, await hash(join(projectRoot, path))]),
  ),
);
await requireLocalOutput(projectRoot, output);
// Preserve earlier builds rather than leaving stale declaration files in the new package.
try {
  await stat(output);
  const history = join(projectRoot, ".cache/package-builds");
  await requireLocalOutput(projectRoot, history);
  await mkdir(history, { recursive: true });
  await rename(output, join(history, `${Date.now()}-${randomUUID()}`));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}
await mkdir(output, { recursive: true });
const types = Bun.spawn(["bun", "x", "--no-install", "tsc", "--project", "tsconfig.package.json"], {
  cwd: projectRoot,
  env,
  stdout: "inherit",
  stderr: "inherit",
});
if ((await types.exited) !== 0) throw new Error("Public package declarations failed");
const typeRoot = join(output, "types");
for await (const name of new Bun.Glob("**/*.d.ts").scan(typeRoot)) {
  const path = join(typeRoot, name);
  const source = await readFile(path, "utf8");
  const updated = normalizeDeclaration(source, (specifier) => {
    const withoutExtension = specifier.replace(/\.(?:js|mjs|cjs)$/, "");
    const target = resolve(dirname(path), `${withoutExtension}.d.ts`);
    const offset = relative(typeRoot, target);
    if (offset.startsWith("..") || isAbsolute(offset) || !Bun.file(target).size)
      throw new Error(`Unresolved public declaration: ${name} -> ${specifier}`);
  });
  await writeFile(path, updated);
}
for (const [entry, target] of [
  ["src/index.ts", "browser"],
  ["scripts/cli.ts", "node"],
] as const) {
  const result = await Bun.build({
    entrypoints: [join(projectRoot, entry)],
    outdir: output,
    target,
    format: "esm",
    external: ["zod"],
    sourcemap: "none",
    naming: entry.endsWith("index.ts") ? "index.js" : "cli.js",
  });
  if (!result.success) throw new AggregateError(result.logs, `Package ${entry} build failed`);
}
await chmod(join(output, "cli.js"), 0o755);
if (JSON.stringify(await packageInputPaths(projectRoot)) !== JSON.stringify(sourcePaths))
  throw new Error("Package source inventory changed during build");
for (const [path, expected] of Object.entries(sources))
  if ((await hash(join(projectRoot, path))) !== expected)
    throw new Error(`Package input changed during build: ${path}`);
const artifacts: Record<string, string> = {};
for await (const name of new Bun.Glob("**/*").scan({ cwd: output, onlyFiles: true }))
  artifacts[name] = await hash(join(output, name));
await writeFile(
  join(output, "manifest.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      sources,
      artifacts,
      runtime: { bun: Bun.version },
      releaseStatus: project.releaseStatus,
      notes: "Local build receipt, not publication or scientific validation",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Built ESM package: ${Object.keys(artifacts).length} artifacts (${project.releaseStatus})`,
);

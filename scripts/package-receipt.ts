import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { z } from "zod";
import { compiledModelSchema } from "../src/model/schema";
import { packageInputPaths } from "./package-inputs";
import { requireLocalOutput } from "./package-output";

const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const manifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sources: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
  artifacts: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
  runtime: z.strictObject({ bun: z.string().min(1) }),
  releaseStatus: z.enum(["unreleased", "published"]),
  notes: z.string(),
});

async function checkedPath(root: string, name: string): Promise<string> {
  const path = resolve(root, name),
    offset = relative(root, path);
  if (!name || isAbsolute(name) || offset.startsWith("..") || isAbsolute(offset))
    throw new Error("Unsafe package manifest path");
  await requireLocalOutput(root, path);
  if (!(await lstat(path)).isFile())
    throw new Error(`Package manifest input is not a regular file: ${name}`);
  return path;
}

export async function verifyPackageBuild(root: string) {
  const output = join(root, "lib");
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(await checkedPath(root, "lib/manifest.json"), "utf8")),
  );
  const metadata = JSON.parse(await readFile(await checkedPath(root, "project.json"), "utf8"));
  if (manifest.releaseStatus !== metadata.releaseStatus)
    throw new Error("Package release status differs from source metadata");
  for (const required of ["index.js", "cli.js", "types/index.d.ts"])
    if (!(required in manifest.artifacts))
      throw new Error(`Missing required package artifact: ${required}`);
  for (const required of [
    "src/index.ts",
    "src/generated/model.json",
    "package.json",
    "bun.lock",
    "models/battleship.gnn.md",
  ])
    if (!(required in manifest.sources))
      throw new Error(`Missing required package input: ${required}`);
  for (const name of Object.keys(manifest.sources)) await checkedPath(root, name);
  const expectedSources = await packageInputPaths(root);
  if (JSON.stringify(Object.keys(manifest.sources).sort()) !== JSON.stringify(expectedSources))
    throw new Error("Incomplete or unexpected package source inventory");
  const actual: string[] = [];
  for await (const name of new Bun.Glob("**/*").scan({ cwd: output, onlyFiles: true }))
    if (name !== "manifest.json") actual.push(name);
  if (JSON.stringify(actual.sort()) !== JSON.stringify(Object.keys(manifest.artifacts).sort()))
    throw new Error("Unbound or missing package artifacts");
  for (const [base, rows] of [
    [root, manifest.sources],
    [output, manifest.artifacts],
  ] as const)
    for (const [name, expected] of Object.entries(rows))
      if (digest(await readFile(await checkedPath(base, name))) !== expected)
        throw new Error(`Package digest mismatch: ${name}`);
  const model = compiledModelSchema.parse(
    JSON.parse(await readFile(join(root, "src/generated/model.json"), "utf8")),
  );
  if (
    digest(await readFile(join(root, "models/battleship.gnn.md"))) !==
    model.source.specificationSha256
  )
    throw new Error("Package GNN specification differs from the compiled model");
  return {
    manifest,
    sourceFiles: Object.keys(manifest.sources).length,
    artifactFiles: actual.length,
    specificationSha256: model.source.specificationSha256,
  };
}

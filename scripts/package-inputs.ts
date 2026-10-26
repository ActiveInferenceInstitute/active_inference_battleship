import { lstat, readdir } from "node:fs/promises";
import { join, posix } from "node:path";
import { requireLocalOutput } from "./package-output";

// Mandatory current build closure; discovery also binds additions in the package namespaces.
const requiredInputs = [
  "package.json",
  "bun.lock",
  "project.json",
  "tsconfig.json",
  "tsconfig.package.json",
  "src/project.ts",
  "src/index.ts",
  "src/generated/model.json",
  "scripts/build-package.ts",
  "scripts/package-inputs.ts",
  "scripts/package-output.ts",
  "scripts/package-receipt.ts",
  "scripts/check-package.ts",
  "scripts/declarations.ts",
  "scripts/cli.ts",
  "scripts/paths.ts",
  "src/core/analysis.ts",
  "src/core/fleet.ts",
  "src/core/game.ts",
  "src/core/inference.ts",
  "src/core/math.ts",
  "src/core/random.ts",
  "src/core/report.ts",
  "src/core/session.ts",
  "src/model/default.ts",
  "src/model/schema.ts",
  "src/research/search.ts",
  "src/cli/arguments.ts",
  "models/battleship.gnn.md",
] as const;

/** Compute expected inputs from the build contract and disk, never from receipt keys. */
export async function packageInputPaths(root: string): Promise<string[]> {
  const names = new Set<string>(requiredInputs);
  async function discover(directory: string): Promise<void> {
    const path = join(root, directory);
    await requireLocalOutput(root, path);
    if (!(await lstat(path)).isDirectory())
      throw new Error(`Package source directory is not a directory: ${directory}`);
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const name = posix.join(directory, entry.name);
      await requireLocalOutput(root, join(root, name));
      if (entry.isDirectory()) await discover(name);
      else if (entry.isFile()) names.add(name);
      else throw new Error(`Package input is not a regular file: ${name}`);
    }
  }
  for (const directory of ["src/core", "src/model", "src/research", "src/cli", "models"])
    await discover(directory);
  const result = [...names].sort();
  for (const name of result) {
    const path = join(root, name);
    await requireLocalOutput(root, path);
    if (!(await lstat(path)).isFile())
      throw new Error(`Package input is not a regular file: ${name}`);
  }
  return result;
}

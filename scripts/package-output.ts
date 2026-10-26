import { lstat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

/** Refuse symlinked ignored output/cache descendants before package generators write. */
export async function requireLocalOutput(root: string, path: string): Promise<void> {
  const base = resolve(root),
    destination = resolve(base, path),
    offset = relative(base, destination);
  if (offset.startsWith("..") || isAbsolute(offset))
    throw new Error("Package output is outside the project");
  for (let current = destination; ; current = dirname(current)) {
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) throw new Error(`Symlinked package output: ${current}`);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    if (current === base) break;
  }
}

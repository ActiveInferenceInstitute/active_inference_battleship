import { existsSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const projectRoot = resolve(import.meta.dir, "..");

export function vaultRoot(): string {
  let current = realpathSync(projectRoot);
  while (dirname(current) !== current) {
    if (existsSync(join(current, "vault.toml")) && existsSync(join(current, "Username")))
      return current;
    current = dirname(current);
  }
  throw new Error("Project must reside on the mounted GitVault volume");
}

export function externalEnvironment(): Record<string, string> {
  const root = vaultRoot();
  return {
    ...process.env,
    TMPDIR: join(root, "Local/cache/active-inference-battleship/tmp"),
    BUN_INSTALL_CACHE_DIR: join(root, "Local/cache/active-inference-battleship/bun"),
    UV_CACHE_DIR: join(root, "Local/cache/active-inference-battleship/uv"),
    UV_PYTHON_INSTALL_DIR: join(root, "Local/runtimes/uv-python"),
    UV_LINK_MODE: "copy",
    PYTHONDONTWRITEBYTECODE: "1",
  };
}

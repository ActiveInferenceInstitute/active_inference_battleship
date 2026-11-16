import { join } from "node:path";
import { externalEnvironment, projectRoot, vaultRoot } from "./paths";

/** Use the selected existing interpreter; retain child status and await signals before cleanup. */
export async function runTemplatePython(
  args: readonly string[],
  env = externalEnvironment(),
  cwd = projectRoot,
  signal?: AbortSignal,
): Promise<number> {
  const template = env["TEMPLATE_ROOT"] ?? join(vaultRoot(), "Username/docxology/Public/template");
  const python = env["TEMPLATE_PYTHON"] ?? join(template, ".venv/bin/python");
  const child = Bun.spawn(
    ["uv", "run", "--no-project", "--no-sync", "--python", python, "python", "-B", ...args],
    {
      cwd,
      env: { ...env, UV_PYTHON_DOWNLOADS: "never" },
      stdout: "inherit",
      stderr: "inherit",
      ...(signal ? { signal } : {}),
    },
  );
  const interrupt = () => child.kill("SIGINT"), terminate = () => child.kill("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  try {
    return await child.exited;
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
  }
}

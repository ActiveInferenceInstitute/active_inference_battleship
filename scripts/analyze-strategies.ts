import { join } from "node:path";
import { externalEnvironment, projectRoot, vaultRoot } from "./paths";

const template =
  process.env["TEMPLATE_ROOT"] ?? join(vaultRoot(), "Username/docxology/Public/template");
const child = Bun.spawn(
  [
    "uv",
    "run",
    "--no-project",
    "--python",
    join(template, ".venv/bin/python"),
    "python",
    "-B",
    "-m",
    "research.strategy_analysis",
  ],
  { cwd: projectRoot, env: externalEnvironment(), stdout: "inherit", stderr: "inherit" },
);
process.on("SIGINT", () => child.kill("SIGINT"));
process.exit(await child.exited);

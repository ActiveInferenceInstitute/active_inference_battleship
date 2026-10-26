import { mkdir } from "node:fs/promises";
import { externalEnvironment, projectRoot } from "./paths";

const env = externalEnvironment();
await mkdir(env["TMPDIR"] ?? "", { recursive: true });
const check = Bun.spawn(["bun", "run", "model:check"], {
  cwd: projectRoot,
  env,
  stdout: "inherit",
  stderr: "inherit",
});
if ((await check.exited) !== 0) process.exit(1);
const server = Bun.spawn(["bun", "x", "--no-install", "vite"], {
  cwd: projectRoot,
  env,
  stdout: "inherit",
  stderr: "inherit",
});
process.on("SIGINT", () => server.kill("SIGINT"));
process.on("SIGTERM", () => server.kill("SIGTERM"));
process.exit(await server.exited);

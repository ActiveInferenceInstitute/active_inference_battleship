import { mkdir } from "node:fs/promises";
import { externalEnvironment, projectRoot } from "./paths";

const tasks: Readonly<Record<string, readonly (readonly string[])[]>> = {
  package: [
    ["bun", "run", "model:check"],
    ["bun", "run", "scripts/build-package.ts"],
    ["bun", "run", "scripts/check-package.ts"],
  ],
  research: [
    ["bun", "run", "model:check"],
    ["bun", "run", "scripts/research.ts"],
  ],
  typecheck: [["bun", "x", "--no-install", "tsc", "--noEmit"]],
  lint: [
    [
      "bun",
      "x",
      "--no-install",
      "biome",
      "check",
      "src",
      "scripts",
      "tests",
      "e2e",
      "vite.config.ts",
      "playwright.config.ts",
    ],
  ],
  format: [
    [
      "bun",
      "x",
      "--no-install",
      "biome",
      "check",
      "--write",
      "src",
      "scripts",
      "tests",
      "e2e",
      "vite.config.ts",
      "playwright.config.ts",
    ],
  ],
  test: [
    ["bun", "run", "build:package"],
    ["bun", "test", "tests", "--coverage"],
  ],
  build: [
    ["bun", "run", "model:check"],
    ["bun", "run", "typecheck"],
    ["bun", "x", "--no-install", "vite", "build"],
  ],
  preview: [
    [
      "bun",
      "x",
      "--no-install",
      "vite",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "5186",
      "--strictPort",
    ],
  ],
  check: [
    ["bun", "run", "lint"],
    ["bun", "run", "test"],
    ["bun", "run", "build"],
  ],
  e2e: [["bun", "x", "--no-install", "playwright", "test"]],
  doctor: [
    [
      "bun",
      "x",
      "--no-install",
      "react-doctor",
      "src",
      "--scope",
      "full",
      "--no-telemetry",
      "--no-supply-chain",
      "--verbose",
    ],
  ],
  negative: [["bun", "run", "scripts/negative-controls.ts"]],
  performance: [["bun", "run", "scripts/audit-performance.ts"]],
  hmr: [["bun", "run", "scripts/test-hmr.ts"]],
};
const name = process.argv[2] ?? "";
const commands = tasks[name];
if (!commands) throw new Error(`Unknown task: ${name}`);
const env = externalEnvironment();
await mkdir(env["TMPDIR"] ?? "", { recursive: true });
for (const argv of commands) {
  const child = Bun.spawn([...argv], {
    cwd: projectRoot,
    env,
    stdout: "inherit",
    stderr: "inherit",
  });
  process.on("SIGINT", () => child.kill("SIGINT"));
  const status = await child.exited;
  if (status !== 0) process.exit(status);
}

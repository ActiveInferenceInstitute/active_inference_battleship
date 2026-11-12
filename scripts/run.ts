import { mkdir, readdir } from "node:fs/promises";
import { externalEnvironment, projectRoot } from "./paths";

// Keep commands and compositions here: package scripts and CI select this registry.
// Only the parser and installed-tarball suites require the integration environment.
const integration: Readonly<Record<string, true>> = {
  "model.test.ts": true,
  "package.test.ts": true,
};
const fastTests = (await readdir(`${projectRoot}/tests`))
  .filter((name) => name.endsWith(".test.ts") && !integration[name])
  .sort()
  .map((name) => `./tests/${name}`);
if (fastTests.length === 0) throw new Error("Fast test selection is empty");

const tasks: Readonly<Record<string, readonly (string | readonly string[])[]>> = {
  gnn: [["bun", "run", "scripts/import-model.ts", "--check"]],
  types: [["bun", "x", "--no-install", "tsc", "--noEmit"]],
  typecheck: ["types"],
  docs: [["bun", "run", "scripts/check-docs.ts"]],
  "test:fast": [["bun", "test", ...fastTests]],
  "test:full": ["test"],
  fast: ["lint", "types", "docs", "test:fast"],
  check: ["fast"],
  all: ["lint", "types", "docs", "test:full", "build"],
  package: [
    "gnn",
    ["bun", "run", "scripts/build-package.ts"],
    ["bun", "run", "scripts/check-package.ts"],
  ],
  research: ["gnn", ["bun", "run", "scripts/research.ts"]],
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
  test: ["package", ["bun", "test", "tests", "--coverage"]],
  build: ["gnn", "types", ["bun", "x", "--no-install", "vite", "build"]],
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
const names = process.argv.slice(2);
if (names[0] === "--list") {
  console.log(Object.keys(tasks).join("\n"));
  process.exit(0);
}
const commands: string[][] = [];
const visited = new Set<string>();
function select(name: string): void {
  const steps = tasks[name];
  if (!steps) throw new Error(`Unknown task: ${name}. Use --list.`);
  if (visited.has(name)) return;
  visited.add(name);
  for (const step of steps) {
    if (typeof step === "string") select(step);
    else commands.push([...step]);
  }
}
for (const name of names.length ? names : ["fast"]) select(name);
const env = externalEnvironment();
await mkdir(env["TMPDIR"] ?? "", { recursive: true });
for (const argv of commands) {
  const child = Bun.spawn([...argv], {
    cwd: projectRoot,
    env,
    stdout: "inherit",
    stderr: "inherit",
  });
  const interrupt = () => child.kill("SIGINT");
  process.on("SIGINT", interrupt);
  const status = await child.exited;
  process.off("SIGINT", interrupt);
  if (status !== 0) process.exit(status);
}

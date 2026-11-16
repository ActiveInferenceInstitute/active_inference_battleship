import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { externalEnvironment, projectRoot } from "./paths";

// Online setup only. A frozen root install need not populate registry manifests
// needed by the later unlocked, strictly offline installed-archive consumer.
const env = externalEnvironment();
const project = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
};
const nodeTypes = JSON.parse(
  await readFile(join(projectRoot, "node_modules/@types/node/package.json"), "utf8"),
) as { version: string };
await mkdir(env["TMPDIR"] ?? "", { recursive: true });
const directory = await mkdtemp(join(env["TMPDIR"] ?? "", "package-cache-seed-"));
await writeFile(
  join(directory, "package.json"),
  `${JSON.stringify(
    {
      private: true,
      dependencies: project.dependencies,
      devDependencies: { "@types/node": nodeTypes.version },
    },
    null,
    2,
  )}\n`,
);
// Resolve and cache complete real payloads, including tooling transitives, in
// this private setup consumer. Never forge cache records or relax offline tests.
const child = Bun.spawn([process.execPath, "install", "--ignore-scripts"], {
  cwd: directory,
  env,
  stdout: "inherit",
  stderr: "inherit",
});
const interrupt = () => child.kill("SIGINT"),
  terminate = () => child.kill("SIGTERM");
process.on("SIGINT", interrupt);
process.on("SIGTERM", terminate);
try {
  process.exitCode = await child.exited;
  if (process.exitCode === 0) console.log(`Real package cache prepared from ${directory}`);
} finally {
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", terminate);
}

import { cp, mkdir, mkdtemp, readFile, rename, stat, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { externalEnvironment, projectRoot } from "./paths";

const env = externalEnvironment();
const root = await mkdtemp(join(env["TMPDIR"] ?? "", "reader-failure-"));
await cp(join(projectRoot, "scripts"), join(root, "scripts"), { recursive: true });
await symlink(join(projectRoot, "node_modules"), join(root, "node_modules"), "dir");
await mkdir(join(root, "output"));
const script = join(root, "scripts/capture-manuscript.ts");
const original = await readFile(script, "utf8");
const target = "const page = context.pages()[0] ?? (await context.newPage());";
if (!original.includes(target)) throw new Error("Reader fault-injection target changed");
await writeFile(
  script,
  original.replace(
    target,
    `throw new Error("Intentional reader failure before capture");\n  ${target}`,
  ),
);
const accepted = join(root, "output/html-captures.json");
const sentinel = '{"owner":"preserve existing accepted bytes"}\n';
await writeFile(accepted, sentinel);
async function run() {
  const child = Bun.spawn(["bun", script], { cwd: root, env, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, status };
}
const conflict = await run();
if (
  conflict.status === 0 ||
  !(conflict.stdout + conflict.stderr).includes("Preserve the accepted reader manifest") ||
  (await readFile(accepted, "utf8")) !== sentinel
)
  throw new Error("Reader overwrote or accepted an existing manifest");
await rename(accepted, join(root, "output/preserved-existing.json"));
const failure = await run();
if (
  failure.status === 0 ||
  !(failure.stdout + failure.stderr).includes("Intentional reader failure before capture")
)
  throw new Error(`Wrong reader failure: ${failure.stdout}${failure.stderr}`);
try {
  await stat(accepted);
  throw new Error("Failed reader emitted an accepted manifest");
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}
const rejected = JSON.parse(
  await readFile(join(root, "output/html-captures-rejected.json"), "utf8"),
);
if (rejected.completed !== false || !rejected.failure?.includes("Intentional reader failure"))
  throw new Error("Reader rejection receipt is incomplete");
await mkdir(join(projectRoot, "output/reports"), { recursive: true });
await writeFile(
  join(projectRoot, "output/reports/reader-failure.log"),
  `EXISTING MANIFEST\n${conflict.stdout}${conflict.stderr}\nINTERRUPTED PRODUCER\n${failure.stdout}${failure.stderr}`,
);
const result = {
  existingAcceptedPreserved: true,
  nonzeroExit: failure.status,
  rejectedReceiptWritten: true,
  noPrematureAcceptedManifest: true,
  fixtureRoot: root,
};
await writeFile(
  join(projectRoot, "output/reports/reader-failure.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result));

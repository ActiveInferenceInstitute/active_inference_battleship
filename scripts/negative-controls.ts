import { cp, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { externalEnvironment, projectRoot } from "./paths";

const env = externalEnvironment();
const directory = await mkdtemp(join(env["TMPDIR"] ?? "", "negative-controls-"));
const mutants = [
  {
    name: "analysis-nonfinite-guard-disabled",
    file: "report.ts",
    before: "!Number.isFinite(value)",
    after: "false",
    suite: "report",
    pattern: "serialization rejects unexpected report kinds and nonfinite values",
  },
  {
    name: "bayes-update-disabled",
    file: "inference.ts",
    before: "weights = logs.map(Math.exp);",
    after: "weights = prior;",
    suite: "inference",
    pattern: "selects the compatible fleet",
  },
  {
    name: "epistemic-sign-reversed",
    file: "inference.ts",
    before: "risk - controls.epistemicWeight * informationGain",
    after: "risk + controls.epistemicWeight * informationGain",
    suite: "inference",
    pattern: "values an uncertain shot",
  },
  {
    name: "forecast-outcome-inverted",
    file: "analysis.ts",
    before: "fleet.occupied[cell] === hit",
    after: "fleet.occupied[cell] !== hit",
    suite: "analysis",
    pattern: "agrees with an independent noisy binary entropy",
  },
  {
    name: "repeat-shot-guard-disabled",
    file: "game.ts",
    before:
      'if (shots.some((shot) => shot.cell === cell)) throw new Error("Cell already fired upon");',
    after: 'if (false) throw new Error("Cell already fired upon");',
    suite: "game",
    pattern: "enforces launch, actor",
  },
];
const results = [];
for (const mutant of mutants) {
  const root = join(directory, mutant.name);
  await mkdir(root);
  await cp(join(projectRoot, "src"), join(root, "src"), { recursive: true });
  await cp(join(projectRoot, "tests"), join(root, "tests"), { recursive: true });
  await symlink(join(projectRoot, "node_modules"), join(root, "node_modules"), "dir");
  const path = join(root, "src/core", mutant.file);
  const original = await readFile(path, "utf8");
  if (!original.includes(mutant.before)) throw new Error(`Mutation target missing: ${mutant.name}`);
  await writeFile(path, original.replace(mutant.before, mutant.after));
  const child = Bun.spawn(
    ["bun", "test", `tests/${mutant.suite}.test.ts`, "--test-name-pattern", mutant.pattern],
    { cwd: root, env, stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  await writeFile(join(root, "result.log"), stdout + stderr);
  const detected = exitCode !== 0 && (stdout + stderr).includes("(fail)");
  results.push({ name: mutant.name, detected, exitCode, log: join(root, "result.log") });
}
await writeFile(join(directory, "results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ directory, results }, null, 2));
if (results.some((result) => !result.detected))
  throw new Error("At least one broken implementation escaped its regression check");

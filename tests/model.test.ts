import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { validateContract } from "../scripts/contract";
import { externalEnvironment, projectRoot, vaultRoot } from "../scripts/paths";
import { modelDefaults } from "../src/model/schema";
import { model } from "./fixtures";

async function parse(source: string) {
  const upstream =
    process.env["GNN_ROOT"] ??
    join(vaultRoot(), "Username/ActiveInferenceInstitute/Public/Generalized_Notation_Notation");
  const child = Bun.spawn(
    [
      "uv",
      "run",
      "--no-project",
      "--no-sync",
      "--python",
      join(upstream, ".venv/bin/python"),
      "python",
      "-B",
      "scripts/parse_gnn.py",
      upstream,
      source,
      vaultRoot(),
    ],
    { cwd: projectRoot, env: externalEnvironment(), stdout: "pipe", stderr: "pipe" },
  );
  const [text, error, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(error);
  return JSON.parse(text);
}

test("rejects unsupported time and duplicate-variable declarations from the real upstream parser", async () => {
  const source = await Bun.file(join(projectRoot, "models/battleship.gnn.md")).text();
  const root = await mkdtemp(join(externalEnvironment()["TMPDIR"] ?? "", "gnn-rejections-"));
  for (const [name, content] of [
    ["horizon", source.replace("ModelTimeHorizon=1", "ModelTimeHorizon=2")],
    ["continuous", source.replace("DiscreteTime", "ContinuousTime")],
    ["duplicate", source.replace("s[4096,type=float]", "s[999,type=float]\ns[4096,type=float]")],
  ]) {
    if (!name || !content) throw new Error("Missing GNN rejection fixture");
    const path = join(root, `${name}.md`);
    await Bun.write(path, content);
    const raw = await parse(path);
    expect(() => validateContract(raw)).toThrow();
  }
}, 30_000);

test("imports the actual upstream parser and binds executable model defaults", async () => {
  const raw = await parse("models/battleship.gnn.md");
  const { parameters } = validateContract(raw);
  expect(parameters).toEqual(model.parameters);
  expect(modelDefaults(model).rules.shipLengths).toEqual([5, 4, 3, 3, 2]);
});
test("rejects unsupported semantics, dimensions, duplicate parameters, and graph changes", async () => {
  const raw = await parse("models/battleship.gnn.md");
  expect(() => validateContract({ ...raw, equations: "G = random()" })).toThrow("equations");
  expect(() => validateContract({ ...raw, variables: [] })).toThrow("dimensions");
  expect(() =>
    validateContract({ ...raw, parameters: [...raw.parameters, raw.parameters[0]] }),
  ).toThrow("Duplicate");
  expect(() => validateContract({ ...raw, connections: [] })).toThrow("graph");
});

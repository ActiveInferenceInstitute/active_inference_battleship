import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { validateContract } from "../scripts/contract";
import { materializePinned, pinTransport } from "../scripts/gnn-source";
import { externalEnvironment, gnnPython, projectRoot, vaultRoot } from "../scripts/paths";
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
      gnnPython(upstream),
      "python",
      "-B",
      "scripts/parse_gnn.py",
      "--source",
      upstream,
      "--specification",
      source,
      "--repo",
      projectRoot,
      "--vault",
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
test("binds the compiled artifact to the revision the pinned fetch names", async () => {
  const transport = await pinTransport();
  expect(transport.commit).toBe(model.source.upstreamCommit);
});
test("materializes the pinned reader from the pinned revision only", async () => {
  const root = await mkdtemp(join(externalEnvironment()["TMPDIR"] ?? "", "gnn-pinned-"));
  try {
    const materialized = await materializePinned(root);
    expect(materialized.revision).toBe(materialized.transport.commit);
    expect(await Bun.file(join(materialized.source, "src/gnn/importers.py")).exists()).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
test("refuses a pin that cannot name the fetch, leaving the verdict to the reader", async () => {
  const root = await mkdtemp(join(externalEnvironment()["TMPDIR"] ?? "", "gnn-transport-"));
  try {
    const pin = join(root, "gnn.pin.json");
    await Bun.write(pin, JSON.stringify({ schema: "gnn-importer-pin/v1", tag: "v5.1.0" }));
    await expect(pinTransport(pin)).rejects.toThrow("must name repository, tag and commit");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

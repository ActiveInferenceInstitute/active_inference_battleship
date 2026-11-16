import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateContract } from "../scripts/contract";
import {
  materializePinned,
  type PinnedGnnSource,
  pinnedRevision,
  pinTransport,
} from "../scripts/gnn-source";
import { externalEnvironment, gnnPython, projectRoot, vaultRoot } from "../scripts/paths";
import { modelDefaults } from "../src/model/schema";
import { model } from "./fixtures";

let suiteRoot: string;
let python: string;
let fixture: PinnedGnnSource;
let provider: string;

async function git(...args: string[]): Promise<string> {
  const child = Bun.spawn(["git", "-c", "core.fsmonitor=false", ...args], {
    env: { ...externalEnvironment(), GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [output, errors, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`Fixture git failed (${code}): ${errors}`);
  return output.trim();
}

beforeAll(async () => {
  const { upstream, transport } = await pinnedRevision();
  python = gnnPython(upstream);
  const temporary = externalEnvironment()["TMPDIR"] as string;
  await mkdir(temporary, { recursive: true });
  suiteRoot = await mkdtemp(join(temporary, "gnn-suite-"));
  provider = join(suiteRoot, "provider");
  await git("init", "--quiet", provider);
  // Transfer the actual local pinned objects, not invented parser implementations.
  await git(
    "-C",
    provider,
    "fetch",
    "--quiet",
    "--no-tags",
    "--depth=1",
    upstream,
    transport.commit,
    `refs/tags/${transport.tag}:refs/tags/${transport.tag}`,
  );
  const parser = join(provider, "src/gnn/parsers/markdown_parser.py");
  await mkdir(join(parser, ".."), { recursive: true });
  await writeFile(parser, 'raise RuntimeError("mutable provider parser must never execute")\n');
  fixture = await materializePinned(join(suiteRoot, "pinned"), provider);
}, 60_000);

afterAll(async () => {
  if (suiteRoot) await rm(suiteRoot, { recursive: true, force: true });
});

async function parse(source: string) {
  if (!fixture) throw new Error("Pinned parser fixture was not admitted");
  const child = Bun.spawn(
    [
      "uv",
      "run",
      "--no-project",
      "--no-sync",
      "--python",
      python,
      "python",
      "-B",
      "scripts/parse_gnn.py",
      "--source",
      fixture.source,
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
  const root = await mkdtemp(join(suiteRoot, "gnn-rejections-"));
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
test("parses pinned objects despite incompatible provider working-tree bytes", async () => {
  const relative = "src/gnn/parsers/markdown_parser.py";
  expect(await readFile(join(provider, relative), "utf8")).toContain("must never execute");
  expect((await readFile(join(fixture.source, relative), "utf8")).trim()).toBe(
    await git("-C", provider, "show", `${fixture.revision}:${relative}`),
  );
  expect(fixture.revision).toBe(fixture.transport.commit);
  expect(validateContract(await parse("models/battleship.gnn.md")).parameters).toEqual(
    model.parameters,
  );
}, 30_000);
test("refuses a pin that cannot name the fetch, leaving the verdict to the reader", async () => {
  const root = await mkdtemp(join(suiteRoot, "gnn-transport-"));
  try {
    const pin = join(root, "gnn.pin.json");
    await Bun.write(pin, JSON.stringify({ schema: "gnn-importer-pin/v1", tag: "v5.1.0" }));
    await expect(pinTransport(pin)).rejects.toThrow("must name repository, tag and commit");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

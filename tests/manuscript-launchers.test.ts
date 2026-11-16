import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, readFile, realpath, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { upstreamRoot } from "../scripts/gnn-source";
import { withManuscriptEnvironment } from "../scripts/manuscript";
import { externalEnvironment, gnnPython, projectRoot, vaultRoot } from "../scripts/paths";
import { runTemplatePython } from "../scripts/template-process";

async function environment(): Promise<Record<string, string>> {
  const provider = await upstreamRoot();
  return { ...externalEnvironment(), GNN_ROOT: provider, TEMPLATE_PYTHON: gnnPython(provider) };
}

test("the template process uses the explicit existing Python and returns its failure", async () => {
  const env = await environment();
  await mkdir(env["TMPDIR"] as string, { recursive: true });
  const root = await mkdtemp(join(env["TMPDIR"] as string, "template-interpreter-"));
  try {
    const receipt = join(root, "interpreter.json");
    const code = await runTemplatePython(
      [
        "-c",
        "import json, pathlib, sys; pathlib.Path(sys.argv[1]).write_text(json.dumps({'executable': sys.executable, 'prefix': sys.prefix})); sys.exit(17)",
        receipt,
      ],
      { ...env, TEMPLATE_ROOT: join(root, "no-default-environment") },
    );
    expect(code).toBe(17);
    const actual = JSON.parse(await readFile(receipt, "utf8"));
    expect(await realpath(actual.executable)).toBe(
      await realpath(env["TEMPLATE_PYTHON"] as string),
    );
    expect(await realpath(actual.prefix)).toBe(
      await realpath(dirname(dirname(env["TEMPLATE_PYTHON"] as string))),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test("overlapping invocations isolate pinned parsers and failed-child cleanup", async () => {
  const environmentVariables = await environment();
  let outerRoot = "",
    innerRoot = "";
  await withManuscriptEnvironment(async (outer) => {
    outerRoot = dirname(outer["TMPDIR"] as string);
    const parser = join(outerRoot, "gnn-pinned/src/gnn/parsers/markdown_parser.py");
    const original = await readFile(parser);
    const innerCode = await withManuscriptEnvironment(async (inner) => {
      innerRoot = dirname(inner["TMPDIR"] as string);
      expect(innerRoot).not.toBe(outerRoot);
      for (const key of [
        "TMPDIR",
        "FONTCONFIG_FILE",
        "MPLCONFIGDIR",
        "TEXMFVAR",
        "TEXMFCONFIG",
        "XDG_CACHE_HOME",
      ])
        expect(inner[key]).not.toBe(outer[key]);
      expect(
        await readFile(join(innerRoot, "gnn-pinned/src/gnn/parsers/markdown_parser.py")),
      ).toEqual(original);
      return runTemplatePython(
        [
          "-c",
          "from gnn.parsers.markdown_parser import MarkdownGNNParser; import sys; sys.exit(23)",
        ],
        inner,
      );
    }, environmentVariables);
    expect(innerCode).toBe(23);
    expect(await Bun.file(join(innerRoot, "fonts.conf")).exists()).toBe(false);
    expect(await readFile(parser)).toEqual(original);
    expect(
      await runTemplatePython(
        ["-c", "from gnn.parsers.markdown_parser import MarkdownGNNParser"],
        outer,
      ),
    ).toBe(0);
    let failedRoot = "";
    await expect(
      withManuscriptEnvironment(async (failed) => {
        failedRoot = dirname(failed["TMPDIR"] as string);
        throw new Error("Invocation failure before child launch");
      }, environmentVariables),
    ).rejects.toThrow("Invocation failure");
    expect(await Bun.file(join(failedRoot, "fonts.conf")).exists()).toBe(false);
    expect(await readFile(parser)).toEqual(original);
  }, environmentVariables);
  expect(await Bun.file(join(outerRoot, "fonts.conf")).exists()).toBe(false);
}, 60_000);

test("SIGTERM retains invocation ownership from handler installation through cleanup", async () => {
  const env = await environment();
  const parent = join(vaultRoot(), "Local/cache/active-inference-battleship/manuscript");
  await mkdir(parent, { recursive: true });
  const previous = new Set(await readdir(parent));
  const child = Bun.spawn(
    [
      process.execPath,
      "-e",
      `import { withManuscriptEnvironment } from ${JSON.stringify(join(projectRoot, "scripts/manuscript.ts"))};
     // Observe actual handler installation, not a guessed filesystem-event delay.
     process.on("newListener", (event) => {
       if (event === "SIGTERM") queueMicrotask(() => console.log("preparing"));
     });
     await withManuscriptEnvironment(async (_env, signal) => {
       signal.throwIfAborted();
       const { promise, reject } = Promise.withResolvers();
       signal.addEventListener("abort", () => reject(signal.reason), { once: true });
       await promise;
     });`,
    ],
    { cwd: projectRoot, env, stdout: "pipe", stderr: "pipe" },
  );
  try {
    const reader = child.stdout.getReader();
    const ready = await reader.read();
    reader.releaseLock();
    expect(new TextDecoder().decode(ready.value)).toContain("preparing");
    child.kill("SIGTERM");
    const [code] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect(code).not.toBe(0);
    expect((await readdir(parent)).filter((name) => !previous.has(name))).toEqual([]);
  } finally {
    if (child.exitCode === null) child.kill("SIGTERM");
    await child.exited;
  }
}, 30_000);

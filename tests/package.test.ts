import { beforeAll, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { verifyPackageBuild } from "../scripts/package-receipt";
import { externalEnvironment, projectRoot } from "../scripts/paths";
import {
  analyzeReplay,
  applyEvent,
  assistant,
  createSession,
  exportSession,
  importSession,
  loadDefaultModel,
} from "../src/index";

const env = externalEnvironment();
let directory = "",
  consumer = "",
  replayPath = "",
  replay = "";
async function command(argv: string[], cwd = projectRoot, input?: string) {
  const child = Bun.spawn(argv, {
    cwd,
    env,
    stdin: input === undefined ? "ignore" : new Blob([input]),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, exitCode };
}
async function success(argv: string[], cwd = projectRoot, input?: string) {
  const result = await command(argv, cwd, input);
  if (result.exitCode !== 0)
    throw new Error(
      `${argv.join(" ")} exited ${result.exitCode}: ${result.stderr}\n${result.stdout}`,
    );
  return result;
}

function compareNumbers(actual: unknown, expected: unknown, path = "report"): number {
  if (typeof actual === "number" && typeof expected === "number") {
    const error = Math.abs(actual - expected);
    if (!Number.isFinite(actual) || !Number.isFinite(expected) || error > 2e-12)
      throw new Error(`Numeric mismatch at ${path}: ${error}`);
    return error;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) throw new Error(`Array length mismatch at ${path}`);
    const byCell = (value: unknown): number => {
      if (typeof value !== "object" || value === null) throw new Error("Invalid action record");
      const cell: unknown = Reflect.get(value, "cell");
      if (typeof cell !== "number" || !Number.isInteger(cell))
        throw new Error("Invalid action identity");
      return cell;
    };
    // Near-tied floating-point probabilities can sort differently across JS engines.
    const a = path === "report.actions" ? actual.toSorted((x, y) => byCell(x) - byCell(y)) : actual;
    const b =
      path === "report.actions" ? expected.toSorted((x, y) => byCell(x) - byCell(y)) : expected;
    return Math.max(
      0,
      ...a.map((value, index) => compareNumbers(value, b[index], `${path}[${index}]`)),
    );
  }
  if (
    actual !== null &&
    expected !== null &&
    typeof actual === "object" &&
    typeof expected === "object"
  ) {
    const values = new Map(Object.entries(actual)),
      wanted = Object.entries(expected);
    if (values.size !== wanted.length || wanted.some(([key]) => !values.has(key)))
      throw new Error(`Field mismatch at ${path}`);
    return Math.max(
      0,
      ...wanted.map(([key, value]) => compareNumbers(values.get(key), value, `${path}.${key}`)),
    );
  }
  if (actual !== expected) throw new Error(`Value mismatch at ${path}`);
  return 0;
}

beforeAll(async () => {
  await verifyPackageBuild(projectRoot);
  directory = await mkdtemp(join(env["TMPDIR"] ?? "", "package-consumer-"));
  consumer = join(directory, "consumer");
  await mkdir(consumer);
  const archive = join(directory, "battleship.tgz");
  await success(["bun", "pm", "pack", "--ignore-scripts", "--filename", archive, "--quiet"]);
  const listing = (await success(["tar", "-tzf", archive])).stdout.trim().split("\n");
  for (const name of listing) {
    if (
      !name.startsWith("package/") ||
      name.split("/").includes("..") ||
      /(?:^|\/)(?:\.env|\.cache|node_modules|test-results|output|\.git)(?:\/|$)/.test(name)
    )
      throw new Error(`Unsafe archive member: ${name}`);
  }
  expect(listing).toContain("package/lib/index.js");
  expect(listing).toContain("package/lib/types/index.d.ts");
  expect(listing).toContain("package/lib/cli.js");
  expect(listing).toContain("package/models/battleship.gnn.md");
  expect(listing).toContain("package/docs/PACKAGE.md");
  expect(listing).toContain("package/examples/headless.mjs");
  const verbose = (await success(["tar", "-tvzf", archive])).stdout.trim().split("\n");
  expect(verbose.every((line) => line.startsWith("-") || line.startsWith("d"))).toBe(true);
  const nodeTypes = JSON.parse(
    await readFile(join(projectRoot, "node_modules/@types/node/package.json"), "utf8"),
  );
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: { "active-inference-battleship": `file:${archive}` },
      devDependencies: { "@types/node": nodeTypes.version },
    }),
  );
  await success(["bun", "install", "--production", "--ignore-scripts"], consumer);
  const installed = join(consumer, "node_modules/active-inference-battleship");
  const metadata = JSON.parse(await readFile(join(installed, "package.json"), "utf8"));
  expect(metadata.private).toBe(true);
  expect(Object.keys(metadata.dependencies)).toEqual(["zod"]);
  expect(await readdir(join(consumer, "node_modules"))).not.toContain("react");
  // Production installation above proves runtime dependency scope; Node types are consumer tooling.
  await success(["bun", "install", "--ignore-scripts"], consumer);
  const model = loadDefaultModel();
  let session = applyEvent(createSession(model, 1943, 16), { type: "begin" });
  session = applyEvent(session, { type: "shot", cell: 0 });
  replay = exportSession(session, model);
  replayPath = join(directory, "playing.json");
  await writeFile(replayPath, replay);
  await writeFile(
    join(directory, "archive-receipt.json"),
    JSON.stringify(
      {
        files: listing,
        sha256: createHash("sha256")
          .update(await readFile(archive))
          .digest("hex"),
        installedRuntimeDependencies: Object.keys(metadata.dependencies),
      },
      null,
      2,
    ),
  );
}, 30000);

test("installed archive works in Node, Bun, and an ordinary NodeNext TypeScript consumer", async () => {
  const source = `import { analyzeReplay, createSession, exportSession, loadDefaultModel, type ReplayAnalysis } from "active-inference-battleship";\nconst model = loadDefaultModel();\nconst report: ReplayAnalysis = analyzeReplay(exportSession(createSession(model, 1943, 16), model));\nconst entropy: number = report.belief.entropy;\nexport { entropy };\n`;
  await writeFile(join(consumer, "consumer.ts"), source);
  await writeFile(
    join(consumer, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2023",
        lib: ["ES2023"],
        types: ["node"],
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      files: ["consumer.ts"],
    }),
  );
  await success(["bun", "x", "--no-install", "tsc", "--project", join(consumer, "tsconfig.json")]);
  await writeFile(
    join(consumer, "consumer.ts"),
    source.replace("const entropy: number", "const entropy: string"),
  );
  const negative = await command([
    "bun",
    "x",
    "--no-install",
    "tsc",
    "--project",
    join(consumer, "tsconfig.json"),
  ]);
  expect(negative.exitCode).not.toBe(0);
  expect(negative.stdout + negative.stderr).toContain("TS2322");
  await writeFile(join(consumer, "consumer.ts"), source);
  await writeFile(
    join(consumer, "browser-tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2023",
        lib: ["ES2023", "DOM"],
        types: [],
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      files: ["consumer.ts"],
    }),
  );
  await success([
    "bun",
    "x",
    "--no-install",
    "tsc",
    "--project",
    join(consumer, "browser-tsconfig.json"),
  ]);
  const js = `import {analyzeReplay, createSession, exportSession, loadDefaultModel} from "active-inference-battleship";const m=loadDefaultModel();const r=analyzeReplay(exportSession(createSession(m,1943,16),m));if(r.actions.length!==100)throw Error("Incomplete policy");console.log(r.kind);`;
  for (const runtime of ["node", "bun"])
    expect(
      (await success([runtime, "--input-type=module", "-e", js], consumer)).stdout.trim(),
    ).toBe("active-inference-battleship/analysis");
  const example = await success(
    ["node", "node_modules/active-inference-battleship/examples/headless.mjs"],
    consumer,
  );
  expect(JSON.parse(example.stdout).observations).toHaveLength(1);
}, 30000);

test("CLI analysis equals the public report and does not replace input or output files", async () => {
  const cli = join(consumer, "node_modules/active-inference-battleship/lib/cli.js");
  for (const actor of ["player", "opponent"] as const) {
    const result = await success(["node", cli, "analyze", replayPath, "--actor", actor], consumer);
    const { producer, ...report } = JSON.parse(result.stdout);
    expect(producer.runtime).toBe("node");
    expect(producer.version).toMatch(/^26\./);
    const error = compareNumbers(report, analyzeReplay(replay, { actor }));
    expect(error).toBeLessThanOrEqual(2e-12);
    expect(result.stderr).toBe("");
    const corrupted = structuredClone(report);
    corrupted.belief.entropy += 1e-5;
    expect(() => compareNumbers(corrupted, analyzeReplay(replay, { actor }))).toThrow(
      "Numeric mismatch",
    );
    const wrongCells = structuredClone(report);
    wrongCells.actions[0].cell = -1;
    expect(() => compareNumbers(wrongCells, analyzeReplay(replay, { actor }))).toThrow(
      "Numeric mismatch",
    );
    await writeFile(
      join(directory, `cross-engine-${actor}.json`),
      JSON.stringify({
        maximumAbsoluteError: error,
        tolerance: 2e-12,
        corruptEntropyRejected: true,
        producer,
      }),
    );
  }
  const stdin = await success(["node", cli, "analyze", "-"], consumer, replay);
  const { producer: stdinProducer, ...stdinReport } = JSON.parse(stdin.stdout);
  expect(stdinProducer.runtime).toBe("node");
  compareNumbers(stdinReport, analyzeReplay(replay));
  const output = join(directory, "analysis.json");
  expect(
    (await success(["node", cli, "analyze", replayPath, "--output", output], consumer)).stdout,
  ).toBe("");
  const saved = await readFile(output, "utf8");
  const { producer: savedProducer, ...savedReport } = JSON.parse(saved);
  expect(savedProducer.runtime).toBe("node");
  compareNumbers(savedReport, analyzeReplay(replay));
  const collision = await command(
    ["node", cli, "analyze", replayPath, "--output", output],
    consumer,
  );
  expect(collision.exitCode).toBe(1);
  expect(collision.stderr).toContain("EEXIST");
  expect(await readFile(output, "utf8")).toBe(saved);
  const inputCollision = await command(
    ["node", cli, "analyze", replayPath, "--output", replayPath],
    consumer,
  );
  expect(inputCollision.exitCode).toBe(1);
  expect(await readFile(replayPath, "utf8")).toBe(replay);
  expect((await readdir(directory)).some((name) => name.startsWith(".battleship-"))).toBe(false);
}, 30000);

test("CLI supports coordinates and validated what-if controls and produces resumable terminal games", async () => {
  const cli = join(consumer, "node_modules/active-inference-battleship/lib/cli.js");
  const controls = join(directory, "controls.json");
  await writeFile(controls, JSON.stringify({ policyPrecision: 0 }));
  const report = JSON.parse(
    (
      await success(
        ["bun", cli, "analyze", replayPath, "--cell", "A2", "--controls", controls],
        consumer,
      )
    ).stdout,
  );
  expect(report.producer.runtime).toBe("bun");
  expect(report.selected.coordinate).toBe("A2");
  expect(report.overrides).toEqual({ policyPrecision: 0 });
  const model = loadDefaultModel();
  for (const mode of ["sample", "greedy"]) {
    const text = (
      await success(
        [
          "node",
          cli,
          "play",
          "--seed",
          "42",
          "--catalog-size",
          "16",
          "--mode",
          mode,
          "--controls",
          controls,
        ],
        consumer,
      )
    ).stdout;
    const session = importSession(text, model);
    expect(["won", "lost"]).toContain(session.game.phase);
    expect(session.game.playerShots.length).toBeLessThanOrEqual(100);
    expect(session.controls.policyPrecision).toBe(0);
    expect(assistant(session).belief.history.length).toBe(session.game.playerShots.length);
  }
}, 30000);

test("CLI errors are nonzero, bounded, and do not emit misleading JSON", async () => {
  const cli = join(consumer, "node_modules/active-inference-battleship/lib/cli.js");
  const invalid = join(directory, "invalid.json"),
    oversized = join(directory, "oversized.json"),
    badControls = join(directory, "bad-controls.json");
  await writeFile(invalid, "{invalid}");
  await writeFile(oversized, "x".repeat(1000001));
  await writeFile(badControls, JSON.stringify({ sensorNoise: -1 }));
  for (const args of [
    ["analyze", invalid],
    ["analyze", oversized],
    ["analyze", join(directory, "missing.json")],
    ["analyze", replayPath, "--cell", "A1"],
    ["analyze", replayPath, "--controls", badControls],
    ["analyze", directory],
  ]) {
    const result = await command(["node", cli, ...args], consumer);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr.startsWith("battleship:")).toBe(true);
    expect(result.stderr.length).toBeLessThan(2000);
  }
  const usage = await command(["node", cli, "play", "--seed", "-1"], consumer);
  expect(usage.exitCode).toBe(2);
  const huge = await command(["node", cli, "analyze", "-"], consumer, "x".repeat(1000001));
  expect(huge.exitCode).toBe(1);
  expect(huge.stderr).toContain("1000000");
  expect((await success(["node", cli, "--help"], consumer)).stdout).toContain(
    "Active Inference Institute",
  );
  expect((await success(["node", cli, "--version"], consumer)).stdout.trim()).toBe("0.4.0");
}, 30000);

test("CLI rejects named pipes without waiting for a writer", async () => {
  const cli = join(consumer, "node_modules/active-inference-battleship/lib/cli.js");
  const fifo = join(directory, "input.pipe");
  const alias = join(directory, "input-alias.pipe");
  await success(["mkfifo", fifo]);
  await symlink(fifo, alias);
  for (const runtime of ["node", "bun"])
    for (const args of [
      ["analyze", fifo],
      ["analyze", alias],
      ["analyze", replayPath, "--controls", fifo],
      ["play", "--controls", fifo],
    ]) {
      let timedOut = false;
      const child = Bun.spawn([runtime, cli, ...args], {
        cwd: consumer,
        env,
        stdin: "ignore",
        stdout: "pipe",
        stderr: "pipe",
      });
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, 3000);
      try {
        const [stdout, stderr, exitCode] = await Promise.all([
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
          child.exited,
        ]);
        expect(timedOut).toBe(false);
        expect(exitCode).toBe(1);
        expect(stdout).toBe("");
        expect(stderr).toContain("regular file");
      } finally {
        clearTimeout(timer);
        if (child.exitCode === null) child.kill("SIGKILL");
        await child.exited;
      }
    }
}, 30000);

test("a real source or artifact mutation cannot reuse a successful package receipt", async () => {
  const receipt = await verifyPackageBuild(projectRoot),
    root = join(directory, "changed-copy");
  await mkdir(root);
  for (const name of Object.keys(receipt.manifest.sources)) {
    const target = join(root, name);
    await mkdir(join(target, ".."), { recursive: true });
    await cp(join(projectRoot, name), target);
  }
  await cp(join(projectRoot, "lib"), join(root, "lib"), { recursive: true });
  await verifyPackageBuild(root);
  const releaseManifestPath = join(root, "lib/manifest.json");
  const releaseManifestText = await readFile(releaseManifestPath, "utf8");
  const staleRelease = JSON.parse(releaseManifestText);
  staleRelease.releaseStatus = "unreleased";
  await writeFile(releaseManifestPath, JSON.stringify(staleRelease));
  await expect(verifyPackageBuild(root)).rejects.toThrow("release status differs");
  await writeFile(releaseManifestPath, releaseManifestText);
  await verifyPackageBuild(root);
  const entry = join(root, "lib/index.js"),
    old = await readFile(entry);
  await writeFile(entry, Buffer.concat([old, Buffer.from("\n")]));
  await expect(verifyPackageBuild(root)).rejects.toThrow("digest mismatch");
  await writeFile(entry, old);
  const input = join(root, "models/battleship.gnn.md");
  await writeFile(input, "changed source");
  await expect(verifyPackageBuild(root)).rejects.toThrow("digest mismatch");
  const manifestPath = join(root, "lib/manifest.json");
  const originalManifest = await readFile(manifestPath, "utf8");
  const coordinated = JSON.parse(originalManifest);
  coordinated.sources["models/battleship.gnn.md"] = createHash("sha256")
    .update("changed source")
    .digest("hex");
  await writeFile(manifestPath, JSON.stringify(coordinated));
  await expect(verifyPackageBuild(root)).rejects.toThrow("differs from the compiled model");
  await writeFile(manifestPath, originalManifest);
  await cp(join(projectRoot, "models/battleship.gnn.md"), input);
  await writeFile(join(root, "lib/unbound.js"), "export {};");
  await expect(verifyPackageBuild(root)).rejects.toThrow("Unbound");
  await unlink(join(root, "lib/unbound.js"));
  const manifest = JSON.parse(originalManifest);
  delete manifest.artifacts["index.js"];
  await writeFile(manifestPath, JSON.stringify(manifest));
  await expect(verifyPackageBuild(root)).rejects.toThrow("required package artifact");
  await writeFile(manifestPath, originalManifest);
  const missingInput = JSON.parse(originalManifest);
  delete missingInput.sources["package.json"];
  await writeFile(manifestPath, JSON.stringify(missingInput));
  await expect(verifyPackageBuild(root)).rejects.toThrow("required package input");
  const escaping = JSON.parse(originalManifest);
  escaping.sources["../outside.txt"] = "0".repeat(64);
  await writeFile(manifestPath, JSON.stringify(escaping));
  await expect(verifyPackageBuild(root)).rejects.toThrow("Unsafe");
  const notAFile = JSON.parse(originalManifest);
  notAFile.sources["src"] = "0".repeat(64);
  await writeFile(manifestPath, JSON.stringify(notAFile));
  await expect(verifyPackageBuild(root)).rejects.toThrow("not a regular file");
  const reportPath = join(root, "src/core/report.ts");
  const originalReport = await readFile(reportPath);
  await writeFile(reportPath, Buffer.concat([originalReport, Buffer.from("\nchanged source\n")]));
  const omitted = JSON.parse(originalManifest);
  delete omitted.sources["src/core/report.ts"];
  await writeFile(manifestPath, JSON.stringify(omitted));
  await expect(verifyPackageBuild(root)).rejects.toThrow("source inventory");
  await writeFile(reportPath, originalReport);
  await unlink(reportPath);
  await expect(verifyPackageBuild(root)).rejects.toThrow("ENOENT");
  await writeFile(reportPath, originalReport);
  await writeFile(manifestPath, originalManifest);
  const added = join(root, "src/core/added.ts");
  await writeFile(added, "export const additionalSource = 1;\n");
  await expect(verifyPackageBuild(root)).rejects.toThrow("source inventory");
  await unlink(added);
  for (const relative of ["src/core/.hidden.ts", "src/core/.hidden/nested.ts"]) {
    const hidden = join(root, relative);
    await mkdir(join(hidden, ".."), { recursive: true });
    await writeFile(hidden, "export const hidden = 1;\n");
    await expect(verifyPackageBuild(root)).rejects.toThrow("source inventory");
    await writeFile(hidden, "export const hidden = 2;\n");
    await expect(verifyPackageBuild(root)).rejects.toThrow("source inventory");
    await unlink(hidden);
  }
  const unexpected = JSON.parse(originalManifest);
  await writeFile(join(root, "unrelated.txt"), "unrelated source\n");
  unexpected.sources["unrelated.txt"] = createHash("sha256")
    .update("unrelated source\n")
    .digest("hex");
  await writeFile(manifestPath, JSON.stringify(unexpected));
  await expect(verifyPackageBuild(root)).rejects.toThrow("source inventory");
});

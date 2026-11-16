import { createHash } from "node:crypto";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, posix, resolve } from "node:path";
import { requireLocalOutput } from "./package-output";
import { externalEnvironment, projectRoot } from "./paths";

export type Study = "descriptive" | "strategy" | "prepare";
type Binding = { sha256: string; identity: string };
type Bindings = Record<string, Binding>;
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function binding(root: string, name: string): Promise<Binding> {
  const path = join(root, name);
  await requireLocalOutput(root, path);
  const before = await lstat(path, { bigint: true });
  if (!before.isFile()) throw new Error(`Research input is not a regular file: ${name}`);
  const identity = (info: typeof before) =>
    [info.dev, info.ino, info.mode, info.size, info.mtimeNs, info.ctimeNs].join(":");
  const sha256 = digest(await readFile(path));
  if (identity(before) !== identity(await lstat(path, { bigint: true })))
    throw new Error(`Research input changed while reading: ${name}`);
  return { sha256, identity: identity(before) };
}

/** Independent of receipt keys; includes additions in every executable namespace. */
export async function researchInputPaths(root: string, study: Study): Promise<string[]> {
  const inventory = JSON.parse(
    await readFile(join(root, "research/source-inventory.json"), "utf8"),
  ) as {
    files: string[];
    trees: string[];
    studies: Record<Study, string[]>;
  };
  const names = new Set([...inventory.files, ...inventory.studies[study]]);
  async function discover(name: string): Promise<void> {
    const path = join(root, name);
    await requireLocalOutput(root, path);
    if (!(await lstat(path)).isDirectory()) throw new Error(`Missing research directory: ${name}`);
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = posix.join(name, entry.name);
      if (entry.isDirectory()) await discover(child);
      else if (entry.isFile()) names.add(child);
      else throw new Error(`Research input is not a regular file: ${child}`);
    }
  }
  for (const name of inventory.trees) await discover(name);
  for (const name of names) {
    if (
      !name ||
      name.startsWith("/") ||
      name.split("/").some((part) => part === ".." || part === ".")
    )
      throw new Error(`Unsafe research input: ${name}`);
    await requireLocalOutput(root, join(root, name));
    if (!(await lstat(join(root, name))).isFile())
      throw new Error(`Missing research input: ${name}`);
  }
  return [...names].sort();
}

export type ResearchSnapshot = {
  root: string;
  source: string;
  output: string;
  context: string;
  study: Study;
  sources: Readonly<Record<string, string>>;
  inputs: Readonly<Record<string, string>>;
  assertUnchanged(): Promise<void>;
  dispose(): Promise<void>;
};

export async function createResearchSnapshot(
  root: string,
  study: Study,
  extraInputs: readonly string[] = [],
  temporaryParent = externalEnvironment()["TMPDIR"] as string,
  signal?: AbortSignal,
): Promise<ResearchSnapshot> {
  root = resolve(root);
  const paths = await researchInputPaths(root, study);
  signal?.throwIfAborted();
  const names = [...new Set([...paths, ...extraInputs])].sort();
  await mkdir(temporaryParent, { recursive: true });
  const workspace = await mkdtemp(join(temporaryParent, "research-"));
  const source = join(workspace, "source"),
    output = join(workspace, "output");
  const original: Bindings = {},
    copied: Bindings = {};
  const directories = new Set([source]);
  const dispose = async () => {
    // Only this invocation's directories were made read-only.
    for (const directory of [...directories].sort((a, b) => a.length - b.length))
      await chmod(directory, 0o700).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    await rm(workspace, { recursive: true, force: true });
  };
  try {
    signal?.throwIfAborted();
    await mkdir(source);
    await mkdir(output);
    for (const name of names) {
      signal?.throwIfAborted();
      original[name] = await binding(root, name);
      const target = join(source, name);
      await mkdir(dirname(target), { recursive: true });
      const bytes = await readFile(join(root, name));
      if (digest(bytes) !== original[name].sha256)
        throw new Error(`Research input changed while copying: ${name}`);
      await writeFile(target, bytes, { flag: "wx", mode: 0o444 });
      for (let directory = dirname(target); directory !== source; directory = dirname(directory))
        directories.add(directory);
      copied[name] = await binding(source, name);
    }
    const recordedHashes = (selected: readonly string[]): Record<string, string> =>
      Object.fromEntries(
        selected.map((name) => {
          const captured = original[name];
          if (!captured) throw new Error(`Missing captured research input: ${name}`);
          return [name, captured.sha256];
        }),
      );
    const sources = Object.freeze(recordedHashes(paths));
    const inputs = Object.freeze(recordedHashes(extraInputs));
    const assertUnchanged = async () => {
      if (
        JSON.stringify(await researchInputPaths(root, study)) !== JSON.stringify(paths) ||
        JSON.stringify(await researchInputPaths(source, study)) !== JSON.stringify(paths)
      )
        throw new Error("Research source inventory changed during computation");
      for (const [base, expected] of [
        [root, original],
        [source, copied],
      ] as const)
        for (const name of names) {
          const actual = await binding(base, name);
          if (actual.sha256 !== expected[name]?.sha256 || actual.identity !== expected[name]?.identity)
            throw new Error(`Research input changed during computation: ${name}`);
        }
    };
    signal?.throwIfAborted();
    for (const directory of directories) await chmod(directory, 0o555);
    const context = join(workspace, "context.json");
    const runtime = {
      bun: Bun.version,
      nodeCompatibility: process.version,
      platform: process.platform,
      arch: process.arch,
    };
    await writeFile(context, JSON.stringify({ study, source, output, sources, inputs, runtime }), {
      flag: "wx",
      mode: 0o400,
    });
    await assertUnchanged();
    signal?.throwIfAborted();
    return { root, source, output, context, study, sources, inputs, assertUnchanged, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}

export async function requireNewResearchOutputs(
  root: string,
  outputs: readonly string[],
): Promise<void> {
  for (const name of outputs) {
    const path = join(root, name);
    await requireLocalOutput(root, path);
    try {
      await lstat(path);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
    throw new Error(
      `Research output already exists; preserve it before an authorized rerun: ${name}`,
    );
  }
}

/** Publish complete staged files exclusively, with the terminal receipt last. */
export async function publishResearchSnapshot(
  snapshot: ResearchSnapshot,
  outputs: readonly string[],
): Promise<void> {
  await snapshot.assertUnchanged();
  await requireNewResearchOutputs(snapshot.root, outputs);
  for (const name of outputs) await binding(snapshot.output, name);
  for (const name of outputs) {
    await snapshot.assertUnchanged();
    await mkdir(dirname(join(snapshot.root, name)), { recursive: true });
    // A same-vault hard link is atomic and refuses existing paths, including racing writers.
    await link(join(snapshot.output, name), join(snapshot.root, name));
  }
}

async function runResearchSnapshot(study: Study, entry: string, args: string[]): Promise<number> {
  const arm = args[0];
  const outputs =
    study === "descriptive"
      ? ["research/generated/summary.csv", "research/generated/results.json"]
      : study === "prepare"
        ? ["research/strategy-cases.json", "research/strategy-protocol.json"]
        : arm === "pilot"
          ? ["research/generated/strategy-study/pilot.json"]
          : [
              "research/generated/strategy-study/preexecution.json",
              "research/generated/strategy-study/results.json",
            ];
  const cancellation = new AbortController();
  const cancel = () => cancellation.abort(new Error("Research invocation interrupted"));
  process.on("SIGINT", cancel);
  process.on("SIGTERM", cancel);
  let snapshot: ResearchSnapshot | undefined;
  try {
    await requireNewResearchOutputs(projectRoot, outputs);
    cancellation.signal.throwIfAborted();
    const extra =
      study === "strategy" && arm === "run" ? ["research/generated/strategy-study/pilot.json"] : [];
    snapshot = await createResearchSnapshot(
      projectRoot,
      study,
      extra,
      externalEnvironment()["TMPDIR"] as string,
      cancellation.signal,
    );
    cancellation.signal.throwIfAborted();
    const child = Bun.spawn([process.execPath, join(snapshot.source, entry), ...args], {
      cwd: snapshot.source,
      env: { ...externalEnvironment(), BATTLESHIP_RESEARCH_CONTEXT: snapshot.context },
      stdout: "inherit",
      stderr: "inherit",
      signal: cancellation.signal,
    });
    const code = await child.exited;
    if (code !== 0) return code;
    cancellation.signal.throwIfAborted();
    await publishResearchSnapshot(snapshot, outputs);
    return 0;
  } finally {
    try {
      await snapshot?.dispose();
    } finally {
      process.off("SIGINT", cancel);
      process.off("SIGTERM", cancel);
    }
  }
}

/** The live checkout only launches; computation resumes in the sealed source copy. */
export async function researchExecution(study: Study, entry: string) {
  const context = process.env["BATTLESHIP_RESEARCH_CONTEXT"];
  if (!context) process.exit(await runResearchSnapshot(study, entry, process.argv.slice(2)));
  const record = JSON.parse(await readFile(context, "utf8")) as {
    study: Study;
    source: string;
    output: string;
    sources: Record<string, string>;
    inputs: Record<string, string>;
    runtime: { bun: string; nodeCompatibility: string; platform: string; arch: string };
  };
  if (record.study !== study || resolve(record.source) !== projectRoot)
    throw new Error("Research execution must use its owned source snapshot");
  if (
    JSON.stringify(record.runtime) !==
    JSON.stringify({
      bun: Bun.version,
      nodeCompatibility: process.version,
      platform: process.platform,
      arch: process.arch,
    })
  )
    throw new Error("Research execution runtime differs from its admitted snapshot");
  const expected = await researchInputPaths(projectRoot, study);
  if (JSON.stringify(Object.keys(record.sources).sort()) !== JSON.stringify(expected))
    throw new Error("Incomplete research execution inventory");
  for (const [name, expectedHash] of Object.entries({ ...record.sources, ...record.inputs }))
    if ((await binding(projectRoot, name)).sha256 !== expectedHash)
      throw new Error(`Changed research execution input: ${name}`);
  return record;
}

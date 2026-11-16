import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  createResearchSnapshot, publishResearchSnapshot, requireNewResearchOutputs, researchInputPaths,
} from "../scripts/research-custody";
import { externalEnvironment, projectRoot } from "../scripts/paths";

async function fixture() {
  const temporary = externalEnvironment()["TMPDIR"] as string;
  await mkdir(temporary, { recursive: true });
  const root = await mkdtemp(join(temporary, "research-custody-fixture-"));
  try {
    for (const name of await researchInputPaths(projectRoot, "descriptive")) {
      await mkdir(dirname(join(root, name)), { recursive: true });
      await copyFile(join(projectRoot, name), join(root, name));
    }
    return root;
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

test("a fresh descriptive fixture binds executed bytes and refuses to replace its receipt", async () => {
  const root = await fixture();
  try {
    const protocolPath = join(root, "research/protocol.json");
    const protocol = JSON.parse(await readFile(protocolPath, "utf8"));
    // Only this owned regression fixture changes case count; the shipped protocol is untouched.
    protocol.catalogueSizes = [16];
    protocol.seeds = [17];
    await writeFile(protocolPath, JSON.stringify(protocol));
    async function run() {
      const child = Bun.spawn([process.execPath, join(root, "scripts/research.ts")], {
        cwd: root, env: { ...externalEnvironment(), BATTLESHIP_RESEARCH_CONTEXT: "" },
        stdout: "pipe", stderr: "pipe",
      });
      const [code, stdout, stderr] = await Promise.all([
        child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
      ]);
      return { code, stdout, stderr };
    }
    const first = await run();
    expect(first.code).toBe(0);
    const receipt = await readFile(join(root, "research/generated/results.json"));
    const result = JSON.parse(receipt.toString());
    expect(result.protocolSha256).toBe(createHash("sha256").update(await readFile(protocolPath)).digest("hex"));
    expect(result.sources["research/protocol.json"]).toBe(result.protocolSha256);
    expect(result.cases.map((row: { policy: string }) => row.policy).sort()).toEqual(["efe", "hit", "information", "random"]);
    for (const row of result.cases) {
      expect(row.trace.filter((step: { hit: boolean }) => step.hit)).toHaveLength(17);
      expect(new Set(row.trace.map((step: { cell: number }) => step.cell)).size).toBe(row.shots);
    }
    const second = await run();
    expect(second.code).not.toBe(0);
    expect(second.stderr).toContain("already exists");
    expect(await readFile(join(root, "research/generated/results.json"))).toEqual(receipt);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);

test("computation reads the owned source copy and changed live input prevents publication", async () => {
  const root = await fixture();
  const snapshot = await createResearchSnapshot(root, "descriptive");
  try {
    const name = "src/core/math.ts";
    const original = await readFile(join(root, name));
    await writeFile(join(root, name), "export const entropy = () => 123;\n");
    const child = Bun.spawn([process.execPath, "--eval",
      `import { entropy } from ${JSON.stringify(join(snapshot.source, name))}; console.log(entropy([0.5, 0.5]));`,
    ], { cwd: snapshot.source, stdout: "pipe", stderr: "pipe" });
    const [code, value, error] = await Promise.all([
      child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
    ]);
    expect(code).toBe(0);
    expect(error).toBe("");
    expect(Number(value)).toBeCloseTo(Math.log(2), 14);
    expect(snapshot.sources[name]).toBe(createHash("sha256").update(original).digest("hex"));
    const destination = "research/generated/results.json";
    await mkdir(dirname(join(snapshot.output, destination)), { recursive: true });
    await writeFile(join(snapshot.output, destination), '{"fixture":"must not publish"}\n');
    await expect(publishResearchSnapshot(snapshot, [destination])).rejects.toThrow("changed during computation");
    expect(await Bun.file(join(root, destination)).exists()).toBe(false);
  } finally {
    await snapshot.dispose();
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test("added source files and changed-then-restored inputs invalidate captured custody", async () => {
  const root = await fixture();
  const snapshot = await createResearchSnapshot(root, "descriptive");
  try {
    const added = join(root, "src/core/new-input.ts");
    await writeFile(added, "export const changed = true;\n");
    await expect(snapshot.assertUnchanged()).rejects.toThrow("inventory changed");
    await rm(added);
    const path = join(root, "research/protocol.json");
    const bytes = await readFile(path);
    await writeFile(path, `${bytes.toString()}\n`);
    await writeFile(path, bytes);
    await expect(snapshot.assertUnchanged()).rejects.toThrow("changed during computation");
  } finally {
    await snapshot.dispose();
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test("strategy publication admission preserves every existing receipt byte", async () => {
  const root = await fixture();
  try {
    const names = ["pilot.json", "preexecution.json", "results.json"].map((name) => `research/generated/strategy-study/${name}`);
    for (const name of names) {
      await mkdir(dirname(join(root, name)), { recursive: true });
      await writeFile(join(root, name), `preserved fixture ${name}\n`);
    }
    await expect(requireNewResearchOutputs(root, names)).rejects.toThrow("already exists");
    for (const name of names) expect(await readFile(join(root, name), "utf8")).toBe(`preserved fixture ${name}\n`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cancelled snapshot preparation leaves no owned workspace", async () => {
  const root = await fixture();
  const temporary = await mkdtemp(join(externalEnvironment()["TMPDIR"] as string, "cancelled-snapshot-"));
  const cancellation = new AbortController();
  try {
    const preparing = createResearchSnapshot(root, "descriptive", [], temporary, cancellation.signal);
    cancellation.abort(new Error("cancelled preparation"));
    await expect(preparing).rejects.toThrow("cancelled preparation");
    expect(await readdir(temporary)).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(temporary, { recursive: true, force: true });
  }
}, 30_000);

test("a changed snapshot runtime is rejected before any research computation", async () => {
  const root = await fixture();
  const snapshot = await createResearchSnapshot(root, "descriptive");
  try {
    const context = JSON.parse(await readFile(snapshot.context, "utf8"));
    context.runtime.bun = "different-runtime";
    const changedContext = join(snapshot.output, "changed-context.json");
    await writeFile(changedContext, JSON.stringify(context));
    const child = Bun.spawn([process.execPath, join(snapshot.source, "scripts/research.ts")], {
      cwd: snapshot.source,
      env: { ...externalEnvironment(), BATTLESHIP_RESEARCH_CONTEXT: changedContext },
      stdout: "pipe", stderr: "pipe",
    });
    const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
    expect(code).not.toBe(0);
    expect(stderr).toContain("runtime differs");
    expect(await Bun.file(join(snapshot.output, "research/generated/results.json")).exists()).toBe(false);
  } finally {
    await snapshot.dispose();
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

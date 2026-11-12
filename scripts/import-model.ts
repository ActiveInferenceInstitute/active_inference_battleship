import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, realpath, rm } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
import { compiledModelSchema } from "../src/model/schema";
import { validateContract } from "./contract";
import { externalEnvironment, gnnPython, projectRoot, vaultRoot } from "./paths";
import { pinSchema } from "./pin";

const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const vault = vaultRoot();
const upstream = await realpath(
  process.env["GNN_ROOT"] ??
    join(vault, "Username/ActiveInferenceInstitute/Public/Generalized_Notation_Notation"),
);
const containment = relative(vault, upstream);
if (containment.startsWith("..") || isAbsolute(containment))
  throw new Error("GNN_ROOT is outside GitVault");
const specification = process.env["GNN_SPEC"] ?? join(projectRoot, "models/battleship.gnn.md");
const python = gnnPython(upstream);
const pinPath = process.env["GNN_PIN"] ?? join(projectRoot, "models/gnn.pin.json");
const pin = pinSchema.parse(JSON.parse(await readFile(pinPath, "utf8")));

async function git(...args: string[]): Promise<string> {
  const child = Bun.spawn(["git", "-C", upstream, ...args], { stdout: "pipe", stderr: "pipe" });
  const [output, errors, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`git ${args.join(" ")} failed (${code}): ${errors}`);
  return output.trim();
}

const revision = await git("rev-parse", "--verify", `${pin.commit}^{commit}`);
if (revision !== pin.commit)
  throw new Error(`Pinned commit resolves to ${revision}, not ${pin.commit}`);
const tagCommit = await git("rev-parse", "--verify", `${pin.tag}^{commit}`);
if (tagCommit !== pin.commit)
  throw new Error(`Pinned tag ${pin.tag} resolves to ${tagCommit}, not ${pin.commit}`);

const environment = externalEnvironment();
const temporary = environment["TMPDIR"] ?? "";
await mkdir(temporary, { recursive: true });
const source = await mkdtemp(join(temporary, "gnn-pinned-"));
try {
  // Run and hash the pinned revision itself, never the checkout's working tree.
  const archive = Bun.spawn(["git", "-C", upstream, "archive", revision, "src/gnn"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const extract = Bun.spawn(["tar", "-xf", "-", "-C", source], {
    stdin: archive.stdout,
    stderr: "pipe",
  });
  const [archiveErrors, archiveCode, extractErrors, extractCode] = await Promise.all([
    new Response(archive.stderr).text(),
    archive.exited,
    new Response(extract.stderr).text(),
    extract.exited,
  ]);
  if (archiveCode !== 0 || extractCode !== 0)
    throw new Error(
      `Cannot materialize ${revision} (archive ${archiveCode}, extract ${extractCode}): ${archiveErrors}${extractErrors}`,
    );
  const processResult = Bun.spawn(
    [
      "uv",
      "run",
      "--no-project",
      "--no-sync",
      "--python",
      python,
      "python",
      "-B",
      join(projectRoot, "scripts/parse_gnn.py"),
      source,
      specification,
      vault,
    ],
    { env: environment, stdout: "pipe", stderr: "pipe" },
  );
  const [output, errors, code] = await Promise.all([
    new Response(processResult.stdout).text(),
    new Response(processResult.stderr).text(),
    processResult.exited,
  ]);
  if (code !== 0) throw new Error(`Upstream GNN import failed (${code}): ${errors}`);
  const { parameters } = validateContract(JSON.parse(output));
  const paths = ["src/gnn/__init__.py"];
  async function pythonFiles(directory: string): Promise<void> {
    for (const entry of await readdir(join(source, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory() && entry.name !== "__pycache__") await pythonFiles(path);
      if (entry.isFile() && entry.name.endsWith(".py")) paths.push(path);
    }
  }
  await pythonFiles("src/gnn/parsers");
  const parserFiles = await Promise.all(
    paths.sort().map(async (path) => ({ path, sha256: sha(await readFile(join(source, path))) })),
  );
  const model = compiledModelSchema.parse({
    schemaVersion: 1,
    contract: "binary-static-fleet-v1",
    modelName: "BattleshipFiniteCatalogue",
    parameters,
    source: {
      specificationSha256: sha(await readFile(specification)),
      upstreamCommit: revision,
      parserClosureSha256: sha(JSON.stringify(parserFiles)),
      parserFiles,
    },
  });
  const compiled = `${JSON.stringify(model, null, 2)}\n`;
  const destination = join(projectRoot, "src/generated/model.json");
  if (process.argv.includes("--check")) {
    if ((await readFile(destination, "utf8")) !== compiled)
      throw new Error("Compiled GNN model is stale; run bun run model:import");
    console.log(`GNN model current: ${model.source.specificationSha256}`);
  } else {
    await mkdir(join(projectRoot, "src/generated"), { recursive: true });
    await Bun.write(destination, compiled);
    console.log(
      `Imported ${model.modelName} from ${pin.tag} (${revision}) via the upstream MarkdownGNNParser`,
    );
  }
} finally {
  await rm(source, { recursive: true, force: true });
}

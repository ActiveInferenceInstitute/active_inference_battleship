import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
import { compiledModelSchema } from "../src/model/schema";
import { validateContract } from "./contract";
import { externalEnvironment, projectRoot, vaultRoot } from "./paths";

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
const python = process.env["GNN_PYTHON"] ?? join(upstream, ".venv/bin/python");
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
    upstream,
    specification,
    vault,
  ],
  { env: externalEnvironment(), stdout: "pipe", stderr: "pipe" },
);
const [output, errors, code] = await Promise.all([
  new Response(processResult.stdout).text(),
  new Response(processResult.stderr).text(),
  processResult.exited,
]);
if (code !== 0) throw new Error(`Upstream GNN import failed (${code}): ${errors}`);
const { parameters } = validateContract(JSON.parse(output));
const git = Bun.spawn(["git", "-C", upstream, "rev-parse", "HEAD"], {
  stdout: "pipe",
  stderr: "pipe",
});
const [commit, gitErrors, gitCode] = await Promise.all([
  new Response(git.stdout).text(),
  new Response(git.stderr).text(),
  git.exited,
]);
if (gitCode !== 0) throw new Error(`Cannot bind upstream revision: ${gitErrors}`);
const paths = ["src/gnn/__init__.py"];
async function pythonFiles(directory: string): Promise<void> {
  for (const entry of await readdir(join(upstream, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory() && entry.name !== "__pycache__") await pythonFiles(path);
    if (entry.isFile() && entry.name.endsWith(".py")) paths.push(path);
  }
}
await pythonFiles("src/gnn/parsers");
const parserFiles = await Promise.all(
  paths.sort().map(async (path) => ({ path, sha256: sha(await readFile(join(upstream, path))) })),
);
const model = compiledModelSchema.parse({
  schemaVersion: 1,
  contract: "binary-static-fleet-v1",
  modelName: "BattleshipFiniteCatalogue",
  parameters,
  source: {
    specificationSha256: sha(await readFile(specification)),
    upstreamCommit: commit.trim(),
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
    `Imported ${model.modelName} using the upstream MarkdownGNNParser (${commit.trim()})`,
  );
}

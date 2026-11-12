import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { compiledModelSchema } from "../src/model/schema";
import { validateContract } from "./contract";
import { materializePinned } from "./gnn-source";
import { externalEnvironment, gnnPython, projectRoot, vaultRoot } from "./paths";

const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const vault = vaultRoot();
const specification = process.env["GNN_SPEC"] ?? join(projectRoot, "models/battleship.gnn.md");

const environment = externalEnvironment();
const temporary = environment["TMPDIR"] ?? "";
await mkdir(temporary, { recursive: true });
const source = await mkdtemp(join(temporary, "gnn-pinned-"));
try {
  // Run and hash the pinned revision itself, never the checkout's working tree.
  const { transport, revision } = await materializePinned(source);
  const python = gnnPython(
    process.env["GNN_ROOT"] ??
      join(vault, "Username/ActiveInferenceInstitute/Public/Generalized_Notation_Notation"),
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
      "--source",
      source,
      "--specification",
      specification,
      "--repo",
      projectRoot,
      "--vault",
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
      `Imported ${model.modelName} from ${transport.tag} (${revision}) via the upstream MarkdownGNNParser`,
    );
  }
} finally {
  await rm(source, { recursive: true, force: true });
}

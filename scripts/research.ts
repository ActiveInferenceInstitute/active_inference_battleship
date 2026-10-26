import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { makeCatalogue, makeFleet } from "../src/core/fleet";
import { controlsSchema, infer, scoreActions } from "../src/core/inference";
import { pick, SeededRandom } from "../src/core/random";
import { policies, type SearchPolicy, type SearchStep, searchFleet } from "../src/research/search";
import { projectRoot } from "./paths";

const protocolPath = join(projectRoot, "research/protocol.json");
const protocolBytes = await readFile(protocolPath);
const protocol = z
  .object({
    schemaVersion: z.literal(1),
    boardSize: z.literal(10),
    shipLengths: z.tuple([z.literal(5), z.literal(4), z.literal(3), z.literal(3), z.literal(2)]),
    catalogueSizes: z.array(z.number().int().min(16).max(16384)).min(1),
    seeds: z.array(z.number().int().min(0).max(1000000)).min(1),
    policies: z.tuple([
      z.literal("random"),
      z.literal("hit"),
      z.literal("information"),
      z.literal("efe"),
    ]),
    controls: controlsSchema,
  })
  .parse(JSON.parse(protocolBytes.toString()));
if (
  new Set(protocol.seeds).size !== protocol.seeds.length ||
  new Set(protocol.catalogueSizes).size !== protocol.catalogueSizes.length
)
  throw new Error("Protocol cases must be unique");
const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const rules = { boardSize: protocol.boardSize, shipLengths: protocol.shipLengths };
const cases: {
  seed: number;
  count: number;
  policy: SearchPolicy;
  catalogueSha256: string;
  shots: number;
  trace: readonly SearchStep[];
}[] = [];
for (const count of protocol.catalogueSizes) {
  for (const seed of protocol.seeds) {
    const catalogue = makeCatalogue(rules, count, seed);
    const truth = pick(catalogue, new SeededRandom(seed + 1000003));
    const catalogueSha256 = digest(JSON.stringify(catalogue.map((f) => f.ships)));
    for (const policy of policies) {
      const trace = searchFleet(
        catalogue,
        rules,
        (cell) => truth.occupied[cell] === true,
        policy,
        protocol.controls,
        new SeededRandom(seed + 2000003),
      );
      cases.push({ seed, count, policy, catalogueSha256, shots: trace.length, trace });
    }
    process.stdout.write(`Completed catalog ${count}, seed ${seed}\n`);
  }
}
const summaries = protocol.catalogueSizes.flatMap((count) =>
  policies.map((policy) => {
    const selected = cases.filter((c) => c.count === count && c.policy === policy);
    const values = selected.map((c) => c.shots).toSorted((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const middle = Math.floor(values.length / 2);
    const median =
      values.length % 2 ? values[middle] : ((values[middle - 1] ?? 0) + (values[middle] ?? 0)) / 2;
    const paired = selected.map((c) => {
      const baseline = cases.find(
        (b) => b.count === count && b.seed === c.seed && b.policy === "hit",
      );
      if (!baseline) throw new Error("Missing paired baseline");
      return c.shots - baseline.shots;
    });
    return {
      count,
      policy,
      n: values.length,
      mean,
      median,
      min: values[0],
      max: values.at(-1),
      pairedDifferenceFromHit: paired.reduce((a, b) => a + b, 0) / paired.length,
    };
  }),
);

const smallRules = { boardSize: 6, shipLengths: [2] };
const smallCatalogue = [makeFleet([[0, 1]], smallRules), makeFleet([[1, 2]], smallRules)];
const analytic = [0, 0.05, 0.15, 0.25].flatMap((noise) =>
  Array.from({ length: 81 }, (_, i) => {
    const preference = i / 10;
    const belief = infer(smallCatalogue, [], noise);
    const scores = scoreActions(belief, [], 6, {
      ...protocol.controls,
      sensorNoise: noise,
      hitPreference: preference,
    });
    const common = scores.find((a) => a.cell === 1);
    const uncertain = scores.find((a) => a.cell === 0);
    if (!common || !uncertain) throw new Error("Missing analytic actions");
    return {
      noise,
      preference,
      commonG: common.expectedFreeEnergy,
      uncertainG: uncertain.expectedFreeEnergy,
      uncertainInformation: uncertain.informationGain,
      commonProbability: common.probability,
      uncertainProbability: uncertain.probability,
    };
  }),
);

const sourcePaths = [
  "research/protocol.json",
  "scripts/research.ts",
  "src/research/search.ts",
  "src/core/fleet.ts",
  "src/core/inference.ts",
  "src/core/math.ts",
  "src/core/random.ts",
  "models/battleship.gnn.md",
  "src/generated/model.json",
];
const sources = Object.fromEntries(
  await Promise.all(
    sourcePaths.map(async (path) => [path, digest(await readFile(join(projectRoot, path)))]),
  ),
);
const result = {
  schemaVersion: 1,
  protocolSha256: digest(protocolBytes),
  sources,
  runtime: { bun: Bun.version },
  cases,
  summaries,
  analytic,
};
const output = join(projectRoot, "research/generated");
await mkdir(output, { recursive: true });
await writeFile(join(output, "results.json"), `${JSON.stringify(result, null, 2)}\n`);
const csv = [
  "catalog,policy,n,mean_shots,median_shots,min,max,mean_paired_difference_from_hit",
  ...summaries.map((s) =>
    [s.count, s.policy, s.n, s.mean, s.median, s.min, s.max, s.pairedDifferenceFromHit].join(","),
  ),
].join("\n");
await writeFile(join(output, "summary.csv"), `${csv}\n`);
console.log(csv);

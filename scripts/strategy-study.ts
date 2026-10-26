import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { makeCatalogue } from "../src/core/fleet";
import type { Observation } from "../src/core/game";
import { infer, scoreActions } from "../src/core/inference";
import { SeededRandom } from "../src/core/random";
import {
  pairedSearch,
  profiles,
  studyControls,
  survivingLabels,
} from "../src/research/paired-search";
import { projectRoot } from "./paths";

const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const save = async (path: string, value: unknown) =>
  writeFile(join(projectRoot, path), `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
const read = async (path: string) => JSON.parse(await readFile(join(projectRoot, path), "utf8"));
const directory = "research/generated/strategy-study";
const sourceFiles = [
  "research/strategy-protocol.json",
  "research/strategy-cases.json",
  "scripts/strategy-study.ts",
  "src/research/paired-search.ts",
  "src/core/fleet.ts",
  "src/core/inference.ts",
  "src/core/math.ts",
  "src/core/random.ts",
  "src/generated/model.json",
  "models/battleship.gnn.md",
  "research/strategy_analysis.py",
  "research/strategy_figures.py",
];
const sources = async () =>
  Object.fromEntries(
    await Promise.all(
      sourceFiles.map(async (p) => [p, hash(await readFile(join(projectRoot, p)))]),
    ),
  );
const rules = { boardSize: 10, shipLengths: [5, 4, 3, 3, 2] };
const pilotSeeds = [900001, 900002, 900003, 900004, 900005, 900006];

if (process.argv[2] === "prepare") {
  await mkdir(join(projectRoot, directory), { recursive: true });
  const old = await read("research/protocol.json");
  const used = new Set<number>([
    ...pilotSeeds,
    ...old.seeds.flatMap((s: number) => [s, s + 1000003, s + 2000003]),
  ]);
  const cases = [];
  for (const count of [256, 4096])
    for (let index = 0; index < 128; index++) {
      const record: Record<string, number> = { count, index };
      for (const role of ["catalog", "truth", "random"]) {
        let counter = 0,
          seed: number;
        do {
          seed = Number.parseInt(
            hash(`aib-strategy-v1|20261025|final|${count}|${index}|${role}|${counter}`).slice(0, 8),
            16,
          );
          counter++;
        } while (used.has(seed));
        used.add(seed);
        record[`${role}Seed`] = seed;
        record[`${role}CollisionCounter`] = counter - 1;
      }
      cases.push(record);
    }
  await save("research/strategy-cases.json", {
    schemaVersion: 1,
    masterSeed: 20261025,
    derivation:
      "SHA256 aib-strategy-v1|20261025|final|N|i|role|j; first 4 bytes unsigned big-endian; global collision rejection",
    pilotSeeds,
    cases,
  });
  await save("research/strategy-protocol.json", {
    schemaVersion: 1,
    status: "prospectively specified private follow-up; not public preregistration",
    task: "Single-fleet search until 17 public hits; not competitive win rate",
    boardSize: 10,
    shipLengths: rules.shipLengths,
    catalogueSizes: [256, 4096],
    casesPerSize: 128,
    profiles,
    controls: studyControls,
    weightedBeta: 4,
    tieBand: 1e-12,
    selection:
      "global maximum-score absolute band, then global maximum-hit absolute band, then lowest cell; random seeded uniform ascending available index",
    unit: "independently seeded catalog and in-catalog selected label; paired profiles within unit; strata distinct distributions",
    endpoints: {
      primary: "shots at 17th hit",
      secondary: ["hits after 5 shots", "label entropy after 5 shots divided by ln(N)"],
    },
    comparisons:
      "4 profiles versus pragmatic x 2 sizes x 3 endpoints = 24, one Holm family alpha .05",
    signTest:
      "exact two-sided non-tied conditional sign balance p=.5; integer ties exact; normalized entropy tolerance 1e-10; all ties p=1; not a mean test",
    bootstrap:
      "10000 paired-case percentile resamples, raw mean differences including ties; SHA256 aib-bootstrap|20261025|N|profile|endpoint first 8 bytes; NumPy default_rng; descriptive 95% nonsimultaneous intervals",
    curves:
      "all 128 means, shots 0..30; carry 17 hits and actual terminal entropy after completion; no tests or bands on curves",
    visuals: [
      "completion all cases with conditional sign annotations",
      "informed mean effects and sign-count annotations; random in full table",
      "all-case hit/label-entropy trajectories",
    ],
    failures:
      "abort without exclusions or seed replacement; no optional stopping; bug amendments require consistent rerun",
    samplingLimits:
      "biased finite-catalog generator, uniform labels including duplicate layouts, pseudorandom stream independence assumed; no held-out truths, efficacy or optimality claims",
    historicalStudy:
      "original 16 cases per size retained unmodified; no retrospective significance",
  });
  console.log(JSON.stringify({ prepared: cases.length, productionRun: false }));
} else if (process.argv[2] === "pilot") {
  let checks = 0,
    maximum = 0;
  for (const [i, count] of [256, 4096].entries()) {
    const fleets = makeCatalogue(rules, count, pilotSeeds[i * 3] ?? 0);
    const truthIndex = Math.floor(new SeededRandom(pilotSeeds[i * 3 + 1] ?? 0).next() * count);
    const truth = fleets[truthIndex];
    if (!truth) throw new Error("Missing pilot truth");
    for (const profile of profiles) {
      const trace = pairedSearch(
        fleets,
        rules,
        (c) => truth.occupied[c] === true,
        profile,
        new SeededRandom(pilotSeeds[i * 3 + 2] ?? 0),
      );
      const full = pairedSearch(
        fleets,
        rules,
        (c) => truth.occupied[c] === true,
        profile,
        new SeededRandom(pilotSeeds[i * 3 + 2] ?? 0),
        true,
      );
      if (JSON.stringify(trace.map((s) => s.cell)) !== JSON.stringify(full.map((s) => s.cell)))
        throw new Error("Pilot selector disagreement");
      const observations: Observation[] = [];
      for (const step of trace) {
        const a = infer(fleets, observations, 0),
          b = infer(survivingLabels(fleets, observations), [], 0);
        const compare = (x: number, y: number) => {
          const error = Math.abs(x - y);
          maximum = Math.max(maximum, error);
          checks++;
          if (!Number.isFinite(error) || error > 1e-12)
            throw new Error(`Pilot numerical disagreement: ${error}`);
        };
        compare(a.entropy, b.entropy);
        compare(a.support, b.support);
        a.occupancy.forEach((x, j) => {
          compare(
            x + (process.argv.includes("--perturb-occupancy") ? 2e-12 : 0),
            b.occupancy[j] ?? NaN,
          );
        });
        const controls = { ...studyControls, epistemicWeight: profile === "weighted" ? 4 : 1 };
        const as = scoreActions(a, observations, 10, controls),
          bs = scoreActions(b, observations, 10, controls);
        for (const action of as) {
          const other = bs.find((v) => v.cell === action.cell);
          if (!other) throw new Error("Pilot missing action");
          compare(action.informationGain, other.informationGain);
          compare(action.predictedHit, other.predictedHit);
          compare(action.expectedFreeEnergy, other.expectedFreeEnergy);
        }
        observations.push({ cell: step.cell, hit: step.hit });
      }
    }
  }
  await save(`${directory}/pilot.json`, {
    passed: true,
    checks,
    maximumAbsoluteError: maximum,
    pilotSeeds,
    sources: await sources(),
  });
  console.log(JSON.stringify({ pilotPassed: true, checks, maximum }));
} else if (process.argv[2] === "run") {
  const current = await sources(),
    pilot = await read(`${directory}/pilot.json`);
  if (!pilot.passed || JSON.stringify(pilot.sources) !== JSON.stringify(current))
    throw new Error("Missing or stale production computation gate");
  const model = await read("src/generated/model.json");
  if (
    hash(await readFile(join(projectRoot, "models/battleship.gnn.md"))) !==
    model.source.specificationSha256
  )
    throw new Error("GNN specification mismatch");
  await save(`${directory}/preexecution.json`, {
    frozenAt: new Date().toISOString(),
    productionStarted: false,
    sources: current,
    runtime: {
      bun: Bun.version,
      nodeCompatibility: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    pilotSha256: hash(await readFile(join(projectRoot, `${directory}/pilot.json`))),
  });
  const manifest = await read("research/strategy-cases.json"),
    cases = [];
  for (const unit of manifest.cases) {
    const fleets = makeCatalogue(rules, unit.count, unit.catalogSeed);
    const truthIndex = Math.floor(new SeededRandom(unit.truthSeed).next() * fleets.length),
      truth = fleets[truthIndex];
    if (!truth) throw new Error("Missing selected truth");
    const catalogueSha256 = hash(JSON.stringify(fleets.map((f) => f.ships))),
      truthSha256 = hash(JSON.stringify(truth.occupied));
    for (const profile of profiles) {
      const trace = pairedSearch(
        fleets,
        rules,
        (c) => truth.occupied[c] === true,
        profile,
        new SeededRandom(unit.randomSeed),
      );
      cases.push({
        ...unit,
        profile,
        truthIndex,
        truthSha256,
        catalogueSha256,
        shots: trace.length,
        trace,
      });
    }
    console.log(`Completed N=${unit.count}, unit=${unit.index + 1}/128`);
  }
  if (JSON.stringify(current) !== JSON.stringify(await sources()))
    throw new Error("Study source changed during production");
  await save(`${directory}/results.json`, {
    schemaVersion: 1,
    completedAt: new Date().toISOString(),
    preexecutionSha256: hash(await readFile(join(projectRoot, `${directory}/preexecution.json`))),
    cases,
  });
  console.log(
    JSON.stringify({ searches: cases.length, shots: cases.reduce((n, c) => n + c.shots, 0) }),
  );
} else throw new Error("Use prepare, pilot, or run; existing receipts are never overwritten");

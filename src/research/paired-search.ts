import type { Fleet, FleetRules } from "../core/fleet";
import type { Observation } from "../core/game";
import { type ActionScore, type Controls, infer, scoreActions } from "../core/inference";
import { pick, type RandomSource } from "../core/random";

export const profiles = ["random", "pragmatic", "epistemic", "combined", "weighted"] as const;
export type Profile = (typeof profiles)[number];
export const tieBand = 1e-12;
export const studyControls: Controls = {
  hitPreference: 2,
  epistemicWeight: 1,
  policyPrecision: 4,
  sensorNoise: 0,
  habitStrength: 0,
};

/** Global bands are transitive sets; an epsilon sort comparator would not be. */
export function selectPairedAction(
  actions: readonly ActionScore[],
  profile: Profile,
  random: RandomSource,
): number {
  if (actions.length === 0) throw new Error("No available paired-study action");
  if (
    actions.some(
      (a) =>
        !Number.isFinite(a.predictedHit) ||
        !Number.isFinite(a.informationGain) ||
        !Number.isFinite(a.expectedFreeEnergy),
    )
  )
    throw new Error("Nonfinite paired-study score");
  if (profile === "random")
    return pick(
      actions.toSorted((a, b) => a.cell - b.cell),
      random,
    ).cell;
  const score = (a: ActionScore) =>
    profile === "pragmatic"
      ? a.predictedHit
      : profile === "epistemic"
        ? a.informationGain
        : -a.expectedFreeEnergy;
  const best = Math.max(...actions.map(score));
  const band = actions.filter((a) => score(a) >= best - tieBand);
  const hit = Math.max(...band.map((a) => a.predictedHit));
  return Math.min(...band.filter((a) => a.predictedHit >= hit - tieBand).map((a) => a.cell));
}

/** Only public observations filter labels. Multiplicity of duplicate layouts is preserved. */
export function survivingLabels(
  catalog: readonly Fleet[],
  observations: readonly Observation[],
): readonly Fleet[] {
  const first = catalog[0];
  if (!first) throw new Error("Empty paired-study catalog");
  const visited = new Set<number>();
  for (const observation of observations) {
    if (
      !Number.isInteger(observation.cell) ||
      observation.cell < 0 ||
      observation.cell >= first.occupied.length ||
      visited.has(observation.cell)
    )
      throw new Error("Invalid or repeated paired-study observation");
    visited.add(observation.cell);
  }
  const survivors = catalog.filter((f) => observations.every((o) => f.occupied[o.cell] === o.hit));
  if (survivors.length === 0) throw new Error("Observation has zero likelihood in paired study");
  return survivors;
}

export interface PairedStep {
  readonly cell: number;
  readonly hit: boolean;
  readonly hits: number;
  readonly predictedHit: number;
  readonly expectedInformation: number;
  readonly posteriorEntropy: number;
  readonly survivingLabels: number;
}

/** Zero-noise, uniform-label specialization; full-history mode is the unchanged numerical oracle. */
export function pairedSearch(
  catalog: readonly Fleet[],
  rules: FleetRules,
  observe: (cell: number) => boolean,
  profile: Profile,
  random: RandomSource,
  reference = false,
  controls: Controls = studyControls,
): readonly PairedStep[] {
  if (controls.sensorNoise !== 0 || controls.habitStrength !== 0)
    throw new Error("Paired study requires zero noise and uniform habits");
  const effective = { ...controls, epistemicWeight: profile === "weighted" ? 4 : 1 };
  const observations: Observation[] = [];
  const trace: PairedStep[] = [];
  let survivors = survivingLabels(catalog, []);
  let hits = 0;
  const required = rules.shipLengths.reduce((a, b) => a + b, 0);
  while (hits < required && trace.length < rules.boardSize ** 2) {
    const belief = reference ? infer(catalog, observations, 0) : infer(survivors, [], 0);
    const actions = scoreActions(belief, observations, rules.boardSize, effective);
    const cell = selectPairedAction(actions, profile, random);
    const action = actions.find((a) => a.cell === cell);
    if (!action) throw new Error("Illegal paired-study selection");
    const hit = observe(cell);
    observations.push({ cell, hit });
    hits += Number(hit);
    survivors = survivingLabels(survivors, [{ cell, hit }]);
    const entropy = reference
      ? infer(catalog, observations, 0).entropy
      : Math.log(survivors.length);
    trace.push({
      cell,
      hit,
      hits,
      predictedHit: action.predictedHit,
      expectedInformation: action.informationGain,
      posteriorEntropy: entropy,
      survivingLabels: survivors.length,
    });
  }
  if (hits !== required) throw new Error("Paired search exhausted the board");
  return trace;
}

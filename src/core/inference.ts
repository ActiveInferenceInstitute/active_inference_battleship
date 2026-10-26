import { z } from "zod";
import type { Fleet } from "./fleet";
import type { Observation } from "./game";
import { binaryEntropy, entropy, logSumExp, softmax } from "./math";
import type { RandomSource } from "./random";

export const controlsSchema = z.strictObject({
  epistemicWeight: z.number().min(0).max(4),
  hitPreference: z.number().min(0).max(8),
  policyPrecision: z.number().min(0).max(32),
  sensorNoise: z.number().min(0).max(0.25),
  habitStrength: z.number().min(0).max(4),
});
export type Controls = z.infer<typeof controlsSchema>;

export interface UpdateDiagnostic {
  readonly entropy: number;
  readonly surprise: number;
  readonly informationGain: number;
  readonly accuracy: number;
  readonly freeEnergy: number;
  readonly brier: number;
  readonly predictedHit: number;
  readonly effectiveStates: number;
}

export interface Belief {
  readonly weights: readonly number[];
  readonly logWeights: readonly number[];
  readonly occupancy: readonly number[];
  readonly entropy: number;
  readonly effectiveStates: number;
  readonly support: number;
  readonly logEvidence: number;
  readonly history: readonly UpdateDiagnostic[];
}

export class UnsupportedObservationError extends Error {
  constructor(readonly step: number) {
    super(
      `Observation ${step} has zero likelihood under this catalog. Increase assumed sensor noise or start a new game.`,
    );
    this.name = "UnsupportedObservationError";
  }
}

/** Exact categorical Bayes over the declared catalogue; never receives the selected truth. */
export function infer(
  catalogue: readonly Fleet[],
  observations: readonly Observation[],
  noise: number,
): Belief {
  if (catalogue.length === 0) throw new Error("Empty catalog");
  if (!Number.isFinite(noise) || noise < 0 || noise > 0.25)
    throw new Error("Invalid observation noise");
  const first = catalogue[0];
  if (first === undefined) throw new Error("Empty catalog");
  const area = first.occupied.length;
  if (catalogue.some((f) => f.occupied.length !== area))
    throw new Error("Inconsistent fleet dimensions");
  const visited = new Set<number>();
  let logs = catalogue.map(() => -Math.log(catalogue.length));
  let weights = catalogue.map(() => 1 / catalogue.length);
  let logEvidence = 0;
  const history: UpdateDiagnostic[] = [];
  for (const observation of observations) {
    if (
      !Number.isInteger(observation.cell) ||
      observation.cell < 0 ||
      observation.cell >= area ||
      visited.has(observation.cell)
    ) {
      throw new Error("Invalid or repeated observation cell");
    }
    visited.add(observation.cell);
    const prior = weights;
    const likelihoods = catalogue.map((fleet) =>
      fleet.occupied[observation.cell] === observation.hit ? 1 - noise : noise,
    );
    const predicted = catalogue.reduce(
      (sum, fleet, i) =>
        sum +
        (prior[i] ?? 0) * (noise + (1 - 2 * noise) * Number(fleet.occupied[observation.cell])),
      0,
    );
    const updates = logs.map((priorLog, i) => ({
      priorLog,
      jointLog: priorLog + Math.log(likelihoods[i] ?? 0),
    }));
    const nextLogs = updates.map(({ jointLog }) => jointLog);
    const logZ = logSumExp(nextLogs);
    if (!Number.isFinite(logZ)) throw new UnsupportedObservationError(history.length + 1);
    logs = nextLogs.map((v) => v - logZ);
    weights = logs.map(Math.exp);
    logEvidence += logZ;
    const informationGain = updates.reduce((sum, { priorLog, jointLog }) => {
      const posteriorLog = jointLog - logZ;
      const weight = Math.exp(posteriorLog);
      return weight > 0 ? sum + weight * (posteriorLog - priorLog) : sum;
    }, 0);
    const accuracy = weights.reduce(
      (sum, w, i) => (w > 0 ? sum + w * Math.log(likelihoods[i] ?? 0) : sum),
      0,
    );
    history.push({
      entropy: entropy(weights),
      surprise: -logZ,
      informationGain,
      accuracy,
      freeEnergy: informationGain - accuracy,
      brier: (predicted - Number(observation.hit)) ** 2,
      predictedHit: predicted,
      effectiveStates: 1 / weights.reduce((sum, w) => sum + w * w, 0),
    });
  }
  const occupancy = Array<number>(area).fill(0);
  catalogue.forEach((fleet, i) => {
    const weight = weights[i] ?? 0;
    if (weight === 0) return;
    fleet.occupied.forEach((occupied, cell) => {
      if (occupied) occupancy[cell] = (occupancy[cell] ?? 0) + weight;
    });
  });
  return {
    weights,
    logWeights: logs,
    occupancy,
    entropy: entropy(weights),
    effectiveStates: 1 / weights.reduce((sum, w) => sum + w * w, 0),
    support: weights.filter((w) => w > 0).length,
    logEvidence,
    history,
  };
}

export interface ActionScore {
  readonly cell: number;
  readonly occupancy: number;
  readonly predictedHit: number;
  readonly informationGain: number;
  readonly ambiguity: number;
  readonly risk: number;
  readonly outcomeRisk: number;
  readonly expectedUtility: number;
  readonly habit: number;
  readonly expectedFreeEnergy: number;
  readonly probability: number;
}

/** One-step EFE; weighting information gain != 1 is an explicit generalized objective. */
export function scoreActions(
  belief: Belief,
  shots: readonly Observation[],
  size: number,
  controls: Controls,
): readonly ActionScore[] {
  const visited = new Set(shots.map((shot) => shot.cell));
  const available = belief.occupancy
    .map((p, cell) => ({ p, cell }))
    .filter(({ cell }) => !visited.has(cell));
  if (available.length === 0) return [];
  const logPreferenceNormalizer = Math.log1p(Math.exp(controls.hitPreference));
  const ambiguity = binaryEntropy(controls.sensorNoise);
  const centre = (size - 1) / 2;
  const habits = softmax(
    available.map(
      ({ cell }) =>
        controls.habitStrength *
        (1 -
          (Math.abs(Math.floor(cell / size) - centre) + Math.abs((cell % size) - centre)) /
            (size - 1)),
    ),
  );
  const raw = available.map(({ p, cell }, i) => {
    const predictedHit = Math.min(
      1,
      Math.max(0, controls.sensorNoise + (1 - 2 * controls.sensorNoise) * p),
    );
    const informationGain = Math.max(0, binaryEntropy(predictedHit) - ambiguity);
    const risk = logPreferenceNormalizer - predictedHit * controls.hitPreference;
    return {
      cell,
      occupancy: p,
      predictedHit,
      informationGain,
      ambiguity,
      risk,
      outcomeRisk: risk - binaryEntropy(predictedHit),
      expectedUtility: -risk,
      habit: habits[i] ?? 0,
      expectedFreeEnergy: risk - controls.epistemicWeight * informationGain,
    };
  });
  const policy = softmax(
    raw.map((a) => Math.log(a.habit) - controls.policyPrecision * a.expectedFreeEnergy),
  );
  return raw
    .map((a, i) => ({ ...a, probability: policy[i] ?? 0 }))
    .sort((a, b) => b.probability - a.probability || a.cell - b.cell);
}

export function chooseAction(
  actions: readonly ActionScore[],
  mode: "sample" | "greedy",
  random: RandomSource,
): number {
  if (actions.length === 0) throw new Error("No available actions");
  switch (mode) {
    case "greedy": {
      const first = actions[0];
      if (first === undefined) throw new Error("Empty policy");
      return first.cell;
    }
    case "sample": {
      const draw = random.next();
      let total = 0;
      for (const action of actions) {
        total += action.probability;
        if (draw < total) return action.cell;
      }
      const last = actions.at(-1);
      if (last === undefined || Math.abs(total - 1) > 1e-8)
        throw new Error("Policy is not normalized");
      return last.cell;
    }
  }
}

import type { Fleet } from "./fleet";
import type { Observation } from "./game";
import { type ActionScore, type Belief, type Controls, infer, scoreActions } from "./inference";
import { entropy, logSumExp } from "./math";

export type OutcomeForecast =
  | { readonly hit: boolean; readonly kind: "impossible"; readonly probability: 0 }
  | {
      readonly hit: boolean;
      readonly kind: "possible";
      readonly probability: number;
      readonly logProbability: number;
      readonly entropy: number;
      readonly effectiveStates: number;
      readonly informationGain: number;
    };

/** Counterfactual updates use the same public history and likelihood as real inference. */
export function forecastOutcomes(
  catalogue: readonly Fleet[],
  observations: readonly Observation[],
  noise: number,
  cell: number,
  prior: Belief = infer(catalogue, observations, noise),
): readonly OutcomeForecast[] {
  if (!Number.isFinite(noise) || noise < 0 || noise > 0.25)
    throw new RangeError("Invalid observation noise");
  if (
    prior.logWeights.length !== catalogue.length ||
    catalogue.some((fleet) => fleet.occupied.length !== prior.occupancy.length)
  )
    throw new RangeError("Forecast catalog and prior dimensions differ");
  if (
    !Number.isInteger(cell) ||
    cell < 0 ||
    cell >= prior.occupancy.length ||
    observations.some((observation) => observation.cell === cell)
  )
    throw new RangeError("Forecast requires an unvisited board cell");
  return [true, false].map((hit): OutcomeForecast => {
    const joints = catalogue.map(
      (fleet, index) =>
        (prior.logWeights[index] ?? -Infinity) +
        Math.log(fleet.occupied[cell] === hit ? 1 - noise : noise),
    );
    const logProbability = logSumExp(joints);
    if (logProbability === -Infinity) return { hit, kind: "impossible", probability: 0 };
    if (!Number.isFinite(logProbability)) throw new RangeError("Invalid forecast probability");
    const weights = joints.map((logJoint) => Math.exp(logJoint - logProbability));
    const informationGain = weights.reduce(
      (sum, weight, index) =>
        weight > 0
          ? sum +
            weight *
              ((joints[index] ?? -Infinity) -
                logProbability -
                (prior.logWeights[index] ?? -Infinity))
          : sum,
      0,
    );
    return {
      hit,
      kind: "possible",
      probability: Math.exp(logProbability),
      logProbability,
      entropy: entropy(weights),
      effectiveStates: 1 / weights.reduce((sum, weight) => sum + weight * weight, 0),
      informationGain,
    };
  });
}

export type SweepParameter = "epistemicWeight" | "policyPrecision";
export interface PolicySweepPoint {
  readonly value: number;
  readonly leadingCell: number;
  readonly probability: number;
  readonly rank: number;
  readonly expectedFreeEnergy: number;
}

/** Hold the posterior and other controls fixed; this is not multi-step planning. */
export function sweepPolicy(
  belief: Belief,
  observations: readonly Observation[],
  size: number,
  controls: Controls,
  parameter: SweepParameter,
  selectedCell: number,
): readonly PolicySweepPoint[] {
  const maximum = parameter === "epistemicWeight" ? 4 : 32;
  return Array.from({ length: 9 }, (_, index) => {
    const value = (index * maximum) / 8;
    const actions = scoreActions(belief, observations, size, { ...controls, [parameter]: value });
    const rank = actions.findIndex((action) => action.cell === selectedCell);
    const selected = actions[rank];
    const leading = actions[0];
    if (!selected || !leading) throw new RangeError("Sweep requires an available action");
    return {
      value,
      leadingCell: leading.cell,
      probability: selected.probability,
      rank: rank + 1,
      expectedFreeEnergy: selected.expectedFreeEnergy,
    };
  });
}

/** Log odds remain informative when direct policy probabilities are extremely small. */
export function actionLogOdds(selected: ActionScore, reference: ActionScore, precision: number) {
  return (
    Math.log(selected.habit) -
    Math.log(reference.habit) -
    precision * (selected.expectedFreeEnergy - reference.expectedFreeEnergy)
  );
}

export const strategyPresets = [
  {
    name: "Information first",
    description: "Neutral hit preference; emphasize reducing fleet uncertainty.",
    controls: { epistemicWeight: 4, hitPreference: 0, policyPrecision: 8, habitStrength: 0 },
  },
  {
    name: "Immediate hits",
    description: "Preference-only scoring with a strong preference for hits.",
    controls: { epistemicWeight: 0, hitPreference: 8, policyPrecision: 16, habitStrength: 0 },
  },
  {
    name: "Habit only",
    description: "Zero precision makes the policy follow a central spatial habit.",
    controls: { epistemicWeight: 1, hitPreference: 2.5, policyPrecision: 0, habitStrength: 4 },
  },
  {
    name: "Uniform choices",
    description: "Zero precision and uniform habit give equal probability to every legal shot.",
    controls: { epistemicWeight: 1, hitPreference: 2.5, policyPrecision: 0, habitStrength: 0 },
  },
] as const;

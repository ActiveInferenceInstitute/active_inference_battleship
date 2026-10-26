import type { Fleet, FleetRules } from "../core/fleet";
import type { Observation } from "../core/game";
import { type ActionScore, type Controls, infer, scoreActions } from "../core/inference";
import { pick, type RandomSource } from "../core/random";

export const policies = ["random", "hit", "information", "efe"] as const;
export type SearchPolicy = (typeof policies)[number];

/** Public action scores only: the selector cannot receive a selected fleet. */
export function selectSearchAction(
  actions: readonly ActionScore[],
  policy: SearchPolicy,
  random: RandomSource,
): number {
  if (actions.length === 0) throw new Error("No available search action");
  if (policy === "random")
    return pick(
      actions.toSorted((a, b) => a.cell - b.cell),
      random,
    ).cell;
  const value = (a: ActionScore): number => {
    switch (policy) {
      case "hit":
        return a.predictedHit;
      case "information":
        return a.informationGain;
      case "efe":
        return -a.expectedFreeEnergy;
    }
  };
  const chosen = actions.toSorted(
    (a, b) => value(b) - value(a) || b.predictedHit - a.predictedHit || a.cell - b.cell,
  )[0];
  if (!chosen) throw new Error("No selected search action");
  return chosen.cell;
}

export interface SearchStep {
  readonly cell: number;
  readonly hit: boolean;
  readonly predictedHit: number;
  readonly expectedInformation: number;
  readonly posteriorEntropy: number;
}

/** Environment callback alone owns the truth. Termination uses the public segment count. */
export function searchFleet(
  catalogue: readonly Fleet[],
  rules: FleetRules,
  observe: (cell: number) => boolean,
  policy: SearchPolicy,
  controls: Controls,
  random: RandomSource,
): readonly SearchStep[] {
  const observations: Observation[] = [];
  const trace: SearchStep[] = [];
  const requiredHits = rules.shipLengths.reduce((sum, length) => sum + length, 0);
  let hits = 0;
  while (hits < requiredHits && observations.length < rules.boardSize ** 2) {
    const belief = infer(catalogue, observations, controls.sensorNoise);
    const actions = scoreActions(belief, observations, rules.boardSize, controls);
    const cell = selectSearchAction(actions, policy, random);
    const action = actions.find((a) => a.cell === cell);
    if (!action) throw new Error("Selected action is unavailable");
    const hit = observe(cell);
    observations.push({ cell, hit });
    hits += Number(hit);
    const posterior = infer(catalogue, observations, controls.sensorNoise);
    trace.push({
      cell,
      hit,
      predictedHit: action.predictedHit,
      expectedInformation: action.informationGain,
      posteriorEntropy: posterior.entropy,
    });
  }
  if (hits !== requiredHits) throw new Error("Search exhausted the board before finding the fleet");
  return trace;
}

import { describe, expect, test } from "bun:test";
import {
  actionLogOdds,
  forecastOutcomes,
  strategyPresets,
  sweepPolicy,
} from "../src/core/analysis";
import { infer, scoreActions } from "../src/core/inference";
import { binaryEntropy } from "../src/core/math";
import { controls, twoFleets } from "./fixtures";

describe("counterfactual observation forecasts", () => {
  test("predicts equally likely noiseless branches and complete information", () => {
    const branches = forecastOutcomes(twoFleets, [], 0, 0);
    for (const branch of branches) {
      expect(branch.kind).toBe("possible");
      if (branch.kind !== "possible") throw new Error("Expected possible outcome");
      expect(branch.probability).toBeCloseTo(0.5, 12);
      expect(branch.entropy).toBe(0);
      expect(branch.effectiveStates).toBe(1);
      expect(branch.informationGain).toBeCloseTo(Math.log(2), 12);
    }
  });
  test("agrees with an independent noisy binary entropy calculation", () => {
    const history = [{ cell: 0, hit: true }];
    const branches = forecastOutcomes(twoFleets, history, 0.1, 1);
    const hit = branches[0];
    const miss = branches[1];
    if (hit?.kind !== "possible" || miss?.kind !== "possible")
      throw new Error("Expected two noisy branches");
    expect(hit.probability).toBeCloseTo(0.82, 12);
    expect(miss.probability).toBeCloseTo(0.18, 12);
    expect(hit.entropy).toBeCloseTo(binaryEntropy(81 / 82), 12);
    expect(miss.entropy).toBeCloseTo(Math.log(2), 12);
    const expectedEntropy = hit.probability * hit.entropy + miss.probability * miss.entropy;
    expect(binaryEntropy(0.9) - expectedEntropy).toBeCloseTo(
      binaryEntropy(0.82) - binaryEntropy(0.1),
      12,
    );
  });
  test("distinguishes impossible observations from tiny possible ones", () => {
    expect(forecastOutcomes(twoFleets, [], 0, 2)[0]).toEqual({
      hit: true,
      kind: "impossible",
      probability: 0,
    });
    const branch = forecastOutcomes(twoFleets, [], Number.MIN_VALUE, 2)[0];
    if (branch?.kind !== "possible") throw new Error("Tiny noise is still possible");
    expect(branch.logProbability).toBeCloseTo(Math.log(Number.MIN_VALUE), 12);
    expect(branch.entropy).toBeCloseTo(Math.log(2), 12);
  });
  test.each([-1, 36, 0.2, NaN])("rejects unavailable coordinate %s", (cell) => {
    expect(() => forecastOutcomes(twoFleets, [], 0, cell)).toThrow(RangeError);
  });
  test("rejects repeats and propagates invalid prior histories", () => {
    expect(() => forecastOutcomes(twoFleets, [{ cell: 0, hit: true }], 0, 0)).toThrow(RangeError);
    expect(() => forecastOutcomes(twoFleets, [{ cell: 2, hit: true }], 0, 0)).toThrow(
      "zero likelihood",
    );
    expect(() => forecastOutcomes([], [], 0, 0)).toThrow("Empty catalog");
  });
  test("uses cached log probabilities without losing underflowed hypotheses", () => {
    const history = [
      { cell: 0, hit: true },
      { cell: 1, hit: true },
    ];
    const prior = infer(twoFleets, history, Number.MIN_VALUE);
    expect(prior.weights[1]).toBe(0);
    expect(Number.isFinite(prior.logWeights[1])).toBe(true);
    const branches = forecastOutcomes(twoFleets, history, Number.MIN_VALUE, 4, prior);
    const hit = branches[0];
    if (hit?.kind !== "possible") throw new Error("Expected a possible noisy hit");
    expect(Number.isFinite(hit.informationGain)).toBe(true);
    expect(hit.logProbability).toBeCloseTo(Math.log(Number.MIN_VALUE), 12);
    expect(branches).toEqual(forecastOutcomes(twoFleets, history, Number.MIN_VALUE, 4));
  });
  test("rejects invalid cached forecast dimensions and noise", () => {
    const prior = infer(twoFleets, [], 0);
    expect(() => forecastOutcomes(twoFleets, [], NaN, 0, prior)).toThrow(RangeError);
    expect(() => forecastOutcomes([], [], 0, 0, prior)).toThrow("dimensions");
    expect(() =>
      forecastOutcomes(twoFleets, [], 0, 0, { ...prior, logWeights: [NaN, NaN] }),
    ).toThrow("probability");
  });
});

describe("policy sensitivity and comparative explanations", () => {
  test("sweeps information weight while preserving posterior and input settings", () => {
    const belief = infer(twoFleets, [], 0);
    const settings = { ...controls, hitPreference: 0 };
    const before = JSON.stringify({ belief, settings });
    const sweep = sweepPolicy(belief, [], 6, settings, "epistemicWeight", 0);
    expect(sweep).toHaveLength(9);
    expect(sweep[0]?.probability).toBeCloseTo(1 / 36, 12);
    expect(sweep.at(-1)?.probability).toBeGreaterThan(0.24);
    expect(sweep.at(-1)?.expectedFreeEnergy).toBeCloseTo(-3 * Math.log(2), 12);
    expect(JSON.stringify({ belief, settings })).toBe(before);
  });
  test("uses the habit prior at zero precision and sharpens with precision", () => {
    const belief = infer(twoFleets, [], 0);
    const sweep = sweepPolicy(belief, [], 6, controls, "policyPrecision", 0);
    expect(sweep[0]?.value).toBe(0);
    expect(sweep[0]?.probability).toBeCloseTo(1 / 36, 12);
    expect(sweep.at(-1)?.value).toBe(32);
    expect(sweep.at(-1)?.probability).toBeGreaterThan(0.24);
    expect(sweep[0]?.rank).toBe(1);
    expect(sweep.at(-1)?.leadingCell).toBe(0);
  });
  test("rejects an unavailable comparison target", () => {
    expect(() =>
      sweepPolicy(
        infer(twoFleets, [], 0),
        [{ cell: 0, hit: true }],
        6,
        controls,
        "epistemicWeight",
        0,
      ),
    ).toThrow(RangeError);
  });
  test("explains policy ratios from energy and habit without dividing small probabilities", () => {
    const actions = scoreActions(infer(twoFleets, [], 0), [], 6, { ...controls, habitStrength: 4 });
    const a = actions.find((action) => action.cell === 0);
    const b = actions.find((action) => action.cell === 14);
    if (!a || !b) throw new Error("Missing comparison actions");
    expect(actionLogOdds(a, b, controls.policyPrecision)).toBeCloseTo(
      Math.log(a.probability / b.probability),
      12,
    );
    expect(actionLogOdds(a, a, 32)).toBe(0);
  });
  test("presets preserve observation noise and produce the declared policy behavior", () => {
    const belief = infer(twoFleets, [], 0.1);
    for (const preset of strategyPresets) {
      const settings = { ...controls, sensorNoise: 0.1, ...preset.controls };
      const actions = scoreActions(belief, [], 6, settings);
      expect(settings.sensorNoise).toBe(0.1);
      expect(actions.reduce((sum, a) => sum + a.probability, 0)).toBeCloseTo(1, 12);
      if (settings.policyPrecision === 0) {
        for (const action of actions) expect(action.probability).toBeCloseTo(action.habit, 12);
      }
    }
  });
});

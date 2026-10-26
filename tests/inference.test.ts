import { describe, expect, test } from "bun:test";
import {
  chooseAction,
  controlsSchema,
  infer,
  scoreActions,
  UnsupportedObservationError,
} from "../src/core/inference";
import { binaryEntropy, entropy, kl, logSumExp, softmax } from "../src/core/math";
import { SeededRandom } from "../src/core/random";
import { controls, twoFleets } from "./fixtures";

describe("categorical Bayesian inference", () => {
  test("retains the uniform prior when there are no observations", () => {
    const belief = infer(twoFleets, [], 0);
    expect(belief.weights).toEqual([0.5, 0.5]);
    expect(belief.entropy).toBeCloseTo(Math.log(2), 12);
    expect(belief.occupancy[0]).toBe(0.5);
    expect(belief.effectiveStates).toBe(2);
  });
  test("selects the compatible fleet when a noiseless hit is observed", () => {
    const belief = infer(twoFleets, [{ cell: 0, hit: true }], 0);
    expect(belief.weights).toEqual([1, 0]);
    expect(belief.occupancy[1]).toBe(1);
    expect(belief.occupancy[5]).toBe(0);
    expect(belief.history[0]?.freeEnergy).toBeCloseTo(Math.log(2), 12);
    expect(belief.history[0]?.accuracy).toBe(0);
  });
  test("computes analytic 9:1 posterior odds for a noisy hit", () => {
    const belief = infer(twoFleets, [{ cell: 0, hit: true }], 0.1);
    expect(belief.weights[0]).toBeCloseTo(0.9, 12);
    expect(belief.weights[1]).toBeCloseTo(0.1, 12);
    expect(belief.effectiveStates).toBeCloseTo(1 / 0.82, 12);
    expect(belief.history[0]?.brier).toBeCloseTo(0.25, 12);
  });
  test("matches the exact VFE identity after multiple noisy observations", () => {
    const belief = infer(
      twoFleets,
      [
        { cell: 0, hit: true },
        { cell: 4, hit: false },
        { cell: 2, hit: false },
      ],
      0.1,
    );
    expect(belief.weights[0]).toBeCloseTo(81 / 82, 12);
    for (const d of belief.history) expect(d.freeEnergy).toBeCloseTo(d.surprise, 12);
    expect(-belief.logEvidence).toBeCloseTo(-Math.log(0.369), 12);
  });
  test("rejects an unsupported observation instead of silently resetting the prior", () => {
    expect(() => infer(twoFleets, [{ cell: 2, hit: true }], 0)).toThrow(
      UnsupportedObservationError,
    );
  });
  test.each([-1, 0.3, NaN, Infinity])("rejects invalid noise %s", (noise) => {
    expect(() => infer(twoFleets, [], noise)).toThrow("noise");
  });
  test.each([-1, 36, 0.5, NaN])("rejects an invalid observation cell %s", (cell) => {
    expect(() => infer(twoFleets, [{ cell, hit: true }], 0)).toThrow("observation");
  });
  test("rejects repeated observations", () => {
    expect(() =>
      infer(
        twoFleets,
        [
          { cell: 0, hit: true },
          { cell: 0, hit: true },
        ],
        0.1,
      ),
    ).toThrow("repeated");
  });
  test("rejects empty and inconsistent catalogs", () => {
    expect(() => infer([], [], 0)).toThrow("Empty");
    expect(() => infer([...twoFleets, { ships: [], occupied: [] }], [], 0)).toThrow("dimensions");
  });
});

describe("one-step expected free energy", () => {
  test("values an uncertain shot at log 2 nats of information with a perfect sensor", () => {
    const actions = scoreActions(infer(twoFleets, [], 0), [], 6, { ...controls, hitPreference: 0 });
    const uncertain = actions.find((a) => a.cell === 0);
    const empty = actions.find((a) => a.cell === 2);
    expect(uncertain?.informationGain).toBeCloseTo(Math.log(2), 12);
    expect(uncertain?.expectedFreeEnergy).toBeCloseTo(0, 12);
    expect(uncertain?.expectedUtility).toBeCloseTo(-Math.log(2), 12);
    expect(empty?.expectedFreeEnergy).toBeCloseTo(Math.log(2), 12);
    expect(uncertain?.probability).toBeGreaterThan(empty?.probability ?? 1);
  });
  test("satisfies both EFE decompositions at epistemic weight one", () => {
    const settings = { ...controls, sensorNoise: 0.1 };
    const actions = scoreActions(infer(twoFleets, [], 0.1), [], 6, settings);
    for (const a of actions) {
      expect(a.expectedFreeEnergy).toBeCloseTo(a.outcomeRisk + a.ambiguity, 12);
      expect(a.informationGain).toBeGreaterThanOrEqual(0);
      expect(a.informationGain).toBeLessThanOrEqual(Math.log(2));
    }
  });
  test("changes action ranking when learning is turned off with neutral preferences", () => {
    const belief = infer(twoFleets, [], 0);
    const noLearning = scoreActions(belief, [], 6, {
      ...controls,
      epistemicWeight: 0,
      hitPreference: 0,
    });
    expect(noLearning.every((a) => Math.abs(a.probability - 1 / 36) < 1e-12)).toBe(true);
  });
  test("follows the habit distribution at zero policy precision", () => {
    const actions = scoreActions(infer(twoFleets, [], 0), [], 6, {
      ...controls,
      policyPrecision: 0,
      habitStrength: 4,
    });
    expect(actions.every((a) => Math.abs(a.probability - a.habit) < 1e-12)).toBe(true);
    expect(actions.find((a) => a.cell === 14)?.probability).toBeGreaterThan(
      actions.find((a) => a.cell === 0)?.probability ?? 1,
    );
  });
  test("excludes fired cells and normalizes the remaining policy", () => {
    const shots = [{ cell: 0, hit: true }];
    const actions = scoreActions(infer(twoFleets, shots, 0), shots, 6, controls);
    expect(actions.some((a) => a.cell === 0)).toBe(false);
    expect(actions.reduce((s, a) => s + a.probability, 0)).toBeCloseTo(1, 12);
  });
  test("handles an exhausted action space explicitly", () => {
    const shots = Array.from({ length: 36 }, (_, cell) => ({ cell, hit: cell < 2 }));
    const actions = scoreActions(infer(twoFleets, shots, 0.02), shots, 6, controls);
    expect(actions).toEqual([]);
    expect(() => chooseAction(actions, "sample", new SeededRandom(1))).toThrow("No available");
  });
  test("samples the policy with the supplied random stream", () => {
    const actions = scoreActions(infer(twoFleets, [], 0), [], 6, controls);
    expect(chooseAction(actions, "sample", { next: () => 0 })).toBe(actions[0]?.cell ?? -1);
    expect(chooseAction(actions, "sample", { next: () => 0.999999999 })).toBe(
      actions.at(-1)?.cell ?? -1,
    );
    expect(chooseAction(actions, "greedy", new SeededRandom(1))).toBe(actions[0]?.cell ?? -1);
  });
  test("rejects nonfinite controls at the public boundary", () => {
    expect(controlsSchema.safeParse({ ...controls, hitPreference: NaN }).success).toBe(false);
    expect(controlsSchema.safeParse({ ...controls, policyPrecision: 33 }).success).toBe(false);
  });
  test("handles roundoff at the policy boundary but rejects missing probability mass", () => {
    const actions = scoreActions(infer(twoFleets, [], 0), [], 6, controls);
    const rounded = actions.map((a) => ({ ...a, probability: a.probability * (1 - 1e-12) }));
    expect(chooseAction(rounded, "sample", { next: () => 1 - 1e-13 })).toBe(
      actions.at(-1)?.cell ?? -1,
    );
    const malformed = actions.map((a) => ({ ...a, probability: a.probability / 2 }));
    expect(() => chooseAction(malformed, "sample", { next: () => 0.99 })).toThrow("normalized");
  });
});

describe("information arithmetic", () => {
  test("computes entropy and KL using independent analytic values", () => {
    expect(entropy([1, 0])).toBe(0);
    expect(binaryEntropy(0.5)).toBeCloseTo(Math.log(2), 12);
    expect(kl([1, 0], [0.5, 0.5])).toBeCloseTo(Math.log(2), 12);
    expect(kl([1, 0], [0, 1])).toBe(Infinity);
    expect(() => kl([1], [0.5, 0.5])).toThrow("dimensions");
  });
  test("normalizes extreme logits without overflow", () => {
    for (const probability of softmax([1000, 1000])) expect(probability).toBeCloseTo(0.5, 12);
    expect(logSumExp([-Infinity, -Infinity])).toBe(-Infinity);
    expect(() => softmax([-Infinity])).toThrow("mass");
  });
});

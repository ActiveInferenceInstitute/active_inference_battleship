import { describe, expect, test } from "bun:test";
import { makeFleet } from "../src/core/fleet";
import { infer, scoreActions } from "../src/core/inference";
import { SeededRandom } from "../src/core/random";
import { policies, searchFleet, selectSearchAction } from "../src/research/search";

const rules = { boardSize: 6, shipLengths: [2] };
const catalogue = [makeFleet([[0, 1]], rules), makeFleet([[1, 2]], rules)];
const controls = {
  epistemicWeight: 1,
  hitPreference: 1,
  policyPrecision: 4,
  sensorNoise: 0,
  habitStrength: 0,
};

describe("reproducible search experiment", () => {
  test("duplicating every catalog label preserves decisions but changes label diagnostics", () => {
    const single = infer(catalogue, [], 0);
    const duplicated = infer([...catalogue, ...catalogue], [], 0);
    expect(duplicated.occupancy).toEqual(single.occupancy);
    expect(duplicated.entropy - single.entropy).toBeCloseTo(Math.log(2), 14);
    expect(duplicated.effectiveStates).toBeCloseTo(2 * single.effectiveStates, 14);
    const a = scoreActions(single, [], 6, controls);
    const b = scoreActions(duplicated, [], 6, controls);
    expect(a.map((x) => x.informationGain)).toEqual(b.map((x) => x.informationGain));
    expect(a.map((x) => x.probability)).toEqual(b.map((x) => x.probability));
  });
  test("analytic two-fleet crossover separates information from hit probability", () => {
    const belief = infer(catalogue, [], 0);
    const scores = scoreActions(belief, [], 6, controls);
    expect(selectSearchAction(scores, "hit", new SeededRandom(1))).toBe(1);
    expect(selectSearchAction(scores, "information", new SeededRandom(1))).toBe(0);
    expect(selectSearchAction(scores, "efe", new SeededRandom(1))).toBe(0);
    const above = scoreActions(belief, [], 6, { ...controls, hitPreference: 2 });
    expect(selectSearchAction(above, "efe", new SeededRandom(1))).toBe(1);
    expect(scores.find((a) => a.cell === 0)?.informationGain).toBeCloseTo(Math.log(2), 14);
    expect(scores.find((a) => a.cell === 1)?.informationGain).toBe(0);
  });

  test("every policy finishes with unique legal shots and reproducible traces", () => {
    for (const policy of policies) {
      const observe = (cell: number) => catalogue[0]?.occupied[cell] === true;
      const first = searchFleet(catalogue, rules, observe, policy, controls, new SeededRandom(71));
      const second = searchFleet(catalogue, rules, observe, policy, controls, new SeededRandom(71));
      expect(first).toEqual(second);
      expect(first.filter((s) => s.hit)).toHaveLength(2);
      expect(new Set(first.map((s) => s.cell)).size).toBe(first.length);
      expect(first.length).toBeLessThanOrEqual(36);
      expect(first.every((s) => s.cell >= 0 && s.cell < 36)).toBe(true);
    }
  });

  test("invalid evidence and exhausted action sets fail loudly", () => {
    expect(() => selectSearchAction([], "hit", new SeededRandom(1))).toThrow("No available");
    expect(() =>
      searchFleet(catalogue, rules, () => false, "hit", controls, new SeededRandom(1)),
    ).toThrow("zero likelihood");
    expect(() =>
      searchFleet(
        catalogue,
        rules,
        () => false,
        "random",
        { ...controls, sensorNoise: 0.1 },
        new SeededRandom(1),
      ),
    ).toThrow("exhausted");
  });

  test("policy tie breaks and random stream are explicit", () => {
    const scores = scoreActions(infer(catalogue, [], 0), [], 6, controls);
    const random = { next: () => 0.999 };
    expect(selectSearchAction(scores, "random", random)).toBe(35);
    expect(selectSearchAction(scores.toReversed(), "information", random)).toBe(0);
    expect(selectSearchAction(scores.toReversed(), "hit", random)).toBe(1);
  });
});

import { expect, test } from "bun:test";
import { makeCatalogue, makeFleet } from "../src/core/fleet";
import { infer, scoreActions } from "../src/core/inference";
import { SeededRandom } from "../src/core/random";
import {
  pairedSearch,
  profiles,
  selectPairedAction,
  studyControls,
  survivingLabels,
} from "../src/research/paired-search";

const rules = { boardSize: 6, shipLengths: [2] };
const catalog = [makeFleet([[0, 1]], rules), makeFleet([[1, 2]], rules)];

test("declared objectives distinguish a guaranteed hit from an informative action", () => {
  for (const [profile, cell] of [
    ["pragmatic", 1],
    ["epistemic", 0],
    ["combined", 1],
    ["weighted", 0],
  ] as const) {
    const trace = pairedSearch(
      catalog,
      rules,
      (c) => c === 0 || c === 1,
      profile,
      new SeededRandom(1),
    );
    expect(trace[0]?.cell).toBe(cell);
    expect(trace.at(-1)?.hits).toBe(2);
  }
});

test("survivor specialization matches every full-history choice and diagnostic", () => {
  for (const count of [16, 64]) {
    const fleets = makeCatalogue(rules, count, 900001);
    for (const profile of profiles) {
      const observe = (cell: number) => fleets[3]?.occupied[cell] === true;
      const fast = pairedSearch(fleets, rules, observe, profile, new SeededRandom(900003));
      const full = pairedSearch(fleets, rules, observe, profile, new SeededRandom(900003), true);
      expect(fast.map((s) => s.cell)).toEqual(full.map((s) => s.cell));
      fast.forEach((step, i) => {
        const oracle = full[i];
        if (!oracle) throw new Error("Missing oracle step");
        expect(Math.abs(step.posteriorEntropy - oracle.posteriorEntropy)).toBeLessThanOrEqual(
          1e-12,
        );
        expect(Math.abs(step.predictedHit - oracle.predictedHit)).toBeLessThanOrEqual(1e-12);
        expect(Math.abs(step.expectedInformation - oracle.expectedInformation)).toBeLessThanOrEqual(
          1e-12,
        );
      });
    }
  }
});

test("global score band is stable under permutation and excludes chained approximate ties", () => {
  const original = scoreActions(infer(catalog, [], 0), [], 6, studyControls)[0];
  if (!original) throw new Error("Missing fixture");
  const values = [
    { ...original, cell: 9, informationGain: 1, predictedHit: 0.2 },
    { ...original, cell: 5, informationGain: 1 - 0.75e-12, predictedHit: 0.8 },
    { ...original, cell: 1, informationGain: 1 - 1.5e-12, predictedHit: 1 },
  ];
  expect(selectPairedAction(values, "epistemic", new SeededRandom(1))).toBe(5);
  expect(selectPairedAction(values.toReversed(), "epistemic", new SeededRandom(1))).toBe(5);
  expect(() => selectPairedAction([], "pragmatic", new SeededRandom(1))).toThrow("No available");
  expect(() =>
    selectPairedAction([{ ...original, predictedHit: Infinity }], "pragmatic", new SeededRandom(1)),
  ).toThrow("Nonfinite");
});

test("duplicate labels keep real terminal entropy and environment stays outside selector", () => {
  const repeated = [catalog[0], catalog[0]].filter((f) => f !== undefined);
  const trace = pairedSearch(
    repeated,
    rules,
    (c) => c === 0 || c === 1,
    "pragmatic",
    new SeededRandom(1),
  );
  expect(trace).toHaveLength(2);
  expect(trace.at(-1)?.posteriorEntropy).toBe(Math.log(2));
  expect(survivingLabels(repeated, [{ cell: 0, hit: true }])).toHaveLength(2);
  expect(() =>
    survivingLabels(catalog, [
      { cell: 0, hit: true },
      { cell: 0, hit: true },
    ]),
  ).toThrow("repeated");
  expect(() => survivingLabels(catalog, [{ cell: 1, hit: false }])).toThrow("zero likelihood");
  expect(() => survivingLabels([], [])).toThrow("Empty");
  expect(() => pairedSearch(catalog, rules, () => false, "pragmatic", new SeededRandom(1))).toThrow(
    "zero likelihood",
  );
  expect(() =>
    pairedSearch(
      catalog,
      { boardSize: 6, shipLengths: [2, 2] },
      (c) => c === 0 || c === 1,
      "random",
      new SeededRandom(1),
    ),
  ).toThrow("exhausted");
  expect(() =>
    pairedSearch(catalog, rules, () => false, "pragmatic", new SeededRandom(1), false, {
      ...studyControls,
      sensorNoise: 0.1,
    }),
  ).toThrow("zero noise");
  const actions = scoreActions(infer(catalog, [], 0), [], 6, studyControls);
  Object.defineProperty(actions, "selectedTruth", {
    get() {
      throw new Error("Truth leaked");
    },
  });
  for (const profile of profiles)
    expect(Number.isInteger(selectPairedAction(actions, profile, new SeededRandom(1)))).toBe(true);
});

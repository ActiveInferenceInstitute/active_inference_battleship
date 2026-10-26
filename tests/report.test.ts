import { expect, test } from "bun:test";
import {
  analyzeReplay,
  applyEvent,
  assistant,
  compiledModelSchema,
  controlsSchema,
  createSession,
  encodeAnalysis,
  exportSession,
  importSession,
  loadDefaultModel,
} from "../src/index";

function fixture() {
  const model = loadDefaultModel();
  let session = applyEvent(createSession(model, 1943, 16), { type: "begin" });
  session = applyEvent(session, { type: "shot", cell: 0 });
  return { model, session, replay: exportSession(session, model) };
}

test("bundled models are validated independent values", () => {
  const first = loadDefaultModel(),
    second = loadDefaultModel();
  const parser = first.source.parserFiles[0];
  if (!parser) throw new Error("Missing parser fixture");
  parser.sha256 = "changed";
  first.parameters.ship_lengths[0] = 2;
  expect(loadDefaultModel()).toEqual(second);
});

test("the public model validator rejects unsupported fleet density and controls", () => {
  const model = loadDefaultModel();
  expect(() =>
    compiledModelSchema.parse({ ...model, parameters: { ...model.parameters, board_size: 6 } }),
  ).toThrow("density");
  expect(() =>
    compiledModelSchema.parse({ ...model, parameters: { ...model.parameters, sensor_noise: 0.5 } }),
  ).toThrow();
});

test("both actor reports match core inference and contain no selected fleet or sunk metadata", () => {
  const { model, session, replay } = fixture();
  for (const actor of ["player", "opponent"] as const) {
    const report = analyzeReplay(replay, { actor }, model),
      direct = assistant(session, actor);
    expect(report.actions).toEqual(direct.actions);
    expect(report.belief.weights).toEqual(direct.belief.weights);
    expect(report.belief.history).toEqual(direct.belief.history);
    expect(report.selected?.cell).toBe(direct.actions[0]?.cell);
    expect(report.observations).toHaveLength(1);
    expect(report.replay.events).toBe(session.events.length);
    expect(JSON.parse(encodeAnalysis(report))).toEqual(report);
    for (const key of ["playerFleet", "opponentFleet", "ships", "sunk", "catalogue"])
      expect(encodeAnalysis(report)).not.toContain(`"${key}":`);
    expect(model).toEqual(loadDefaultModel());
  }
  expect(exportSession(session, model)).toBe(replay);
});

test("outside-top-eight selection and partial controls are explicit temporary analysis", () => {
  const { model, session, replay } = fixture();
  const target = assistant(session).actions.at(-1);
  if (!target) throw new Error("Missing candidate fixture");
  const report = analyzeReplay(replay, {
    cell: target.cell,
    controls: { policyPrecision: 0, sensorNoise: undefined },
  });
  const expected = applyEvent(session, {
    type: "controls",
    value: { ...session.controls, policyPrecision: 0 },
  });
  expect(report.selected?.cell).toBe(target.cell);
  expect(report.actions).toEqual(assistant(expected).actions);
  expect(report.overrides).toEqual({ policyPrecision: 0 });
  expect(report.baselineControls).toEqual(session.controls);
  expect(report.controls.policyPrecision).toBe(0);
  expect(report.replay.events).toBe(session.events.length);
  expect(importSession(replay, model)).toEqual(session);
  const parser = report.model.source.parserFiles[0];
  if (!parser) throw new Error("Missing parser fixture");
  parser.path = "changed";
  expect(model.source.parserFiles[0]?.path).not.toBe("changed");
});

test("zero-noise impossible log weights survive JSON without null coercion", () => {
  const model = loadDefaultModel();
  let session = createSession(model, 1943, 16);
  const mixed = session.catalogue[0]?.occupied.findIndex((_, cell) => {
    const count = session.catalogue.filter((fleet) => fleet.occupied[cell]).length;
    return count > 0 && count < session.catalogue.length;
  });
  if (mixed === undefined || mixed < 0) throw new Error("Missing mixed-cell fixture");
  session = applyEvent(session, {
    type: "controls",
    value: { ...session.controls, sensorNoise: 0 },
  });
  session = applyEvent(applyEvent(session, { type: "begin" }), { type: "shot", cell: mixed });
  const report = analyzeReplay(exportSession(session, model));
  expect(report.belief.logWeights).toContain("-Infinity");
  expect(JSON.parse(encodeAnalysis(report))).toEqual(report);
  expect(report.belief.logWeights).not.toContain(null);
});

test("underflow recovery remains finite in an encoded report", () => {
  const model = loadDefaultModel();
  let session = createSession(model, 1943, 16);
  session = applyEvent(session, {
    type: "controls",
    value: { ...session.controls, sensorNoise: 2e-162 },
  });
  session = applyEvent(session, { type: "begin" });
  for (const cell of [64, 33, 34, 5]) session = applyEvent(session, { type: "shot", cell });
  const report = analyzeReplay(exportSession(session, model));
  expect(
    report.belief.history.every(
      (row) => Number.isFinite(row.informationGain) && Number.isFinite(row.freeEnergy),
    ),
  ).toBe(true);
  expect(JSON.parse(encodeAnalysis(report))).toEqual(report);
});

test("terminal full-board analysis has no candidate and never grants firing permission", () => {
  const model = loadDefaultModel();
  let session = createSession(model, 31, 16);
  expect(session.game.playerFleet.occupied[99]).toBe(true);
  const cells = Array.from({ length: 100 }, (_, cell) => cell);
  const order = [
    ...cells.filter((cell) => !session.game.opponentFleet.occupied[cell]),
    ...cells.filter((cell) => session.game.opponentFleet.occupied[cell]),
  ];
  session = applyEvent(session, {
    type: "controls",
    value: { ...session.controls, policyPrecision: 0 },
  });
  session = applyEvent(applyEvent(session, { type: "mode", value: "greedy" }), { type: "begin" });
  for (const cell of order) session = applyEvent(session, { type: "shot", cell });
  expect(session.game.phase).toBe("won");
  const text = exportSession(session, model),
    report = analyzeReplay(text);
  expect(report.actions).toEqual([]);
  expect(report.selected).toBeNull();
  expect(JSON.parse(encodeAnalysis(report))).toEqual(report);
  expect(() => analyzeReplay(text, { cell: 0 })).toThrow("unvisited");
});

test("invalid replay, candidate, options and controls fail explicitly", () => {
  const { replay } = fixture();
  for (const options of [
    { cell: 0 },
    { cell: 100 },
    { cell: 144 },
    { cell: -1 },
    { cell: 1.5 },
    { controls: { sensorNoise: -1 } },
  ])
    expect(() => analyzeReplay(replay, options)).toThrow();
  for (const options of [{ actor: "truth" }, { unknown: 1 }, { controls: { typo: 2 } }])
    expect(() => Reflect.apply(analyzeReplay, undefined, [replay, options])).toThrow();
  expect(() => analyzeReplay("not json")).toThrow();
  expect(() => analyzeReplay(" ".repeat(1000001))).toThrow("1 MB");
  const wrong = JSON.parse(replay);
  wrong.modelSha256 = "wrong";
  expect(() => analyzeReplay(JSON.stringify(wrong))).toThrow("different GNN model");
});

test("serialization rejects unexpected report kinds and nonfinite values", () => {
  const report = analyzeReplay(fixture().replay);
  for (const number of [NaN, Infinity, -Infinity])
    expect(() =>
      encodeAnalysis({ ...report, belief: { ...report.belief, entropy: number } }),
    ).toThrow("Non-finite");
  expect(() => Reflect.apply(encodeAnalysis, undefined, [{ ...report, kind: "replay" }])).toThrow(
    "version-one",
  );
  expect(() => Reflect.apply(encodeAnalysis, undefined, [{ ...report, schemaVersion: 2 }])).toThrow(
    "version-one",
  );
  expect(controlsSchema.parse(report.controls)).toEqual(report.controls);
});

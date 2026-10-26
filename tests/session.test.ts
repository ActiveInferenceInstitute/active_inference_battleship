import { expect, test } from "bun:test";
import {
  applyEvent,
  assistant,
  createSession,
  exportSession,
  importSession,
  suggestedCell,
} from "../src/core/session";
import { model } from "./fixtures";

test("completes real seeded self-play games without repeat or illegal shots", () => {
  for (const seed of [0, 1, 1943, 42, 4294967295]) {
    let session = applyEvent(createSession(model, seed, 256), { type: "begin" });
    for (let turn = 0; turn < 100 && session.game.phase === "playing"; turn++) {
      session = applyEvent(session, { type: "shot", cell: suggestedCell(session) });
    }
    expect(["won", "lost"]).toContain(session.game.phase);
    expect(new Set(session.game.playerShots.map((s) => s.cell)).size).toBe(
      session.game.playerShots.length,
    );
    expect(new Set(session.game.opponentShots.map((s) => s.cell)).size).toBe(
      session.game.opponentShots.length,
    );
  }
});
test("round-trips controls, shuffle, mode, and action events into identical state", () => {
  let session = createSession(model, 1943, 256);
  session = applyEvent(session, { type: "shuffle" });
  session = applyEvent(session, {
    type: "controls",
    value: { ...session.controls, sensorNoise: 0, epistemicWeight: 3.1 },
  });
  session = applyEvent(session, { type: "mode", value: "greedy" });
  session = applyEvent(session, { type: "begin" });
  for (let i = 0; i < 6; i++)
    session = applyEvent(session, { type: "shot", cell: suggestedCell(session) });
  const restored = importSession(exportSession(session, model), model);
  expect(restored).toEqual(session);
  expect(assistant(restored)).toEqual(assistant(session));
});
test("keeps long slider and shuffle histories exportable by coalescing changes between shots", () => {
  let session = createSession(model, 1943, 16);
  for (let i = 0; i < 1201; i++) {
    session = applyEvent(session, {
      type: "controls",
      value: { ...session.controls, epistemicWeight: i % 4 },
    });
    session = applyEvent(session, { type: "mode", value: i % 2 ? "sample" : "greedy" });
    session = applyEvent(session, { type: "shuffle" });
  }
  expect(session.events).toHaveLength(3);
  expect(session.shuffles).toBe(1201);
  session = applyEvent(session, { type: "begin" });
  session = applyEvent(session, { type: "shot", cell: suggestedCell(session) });
  expect(importSession(exportSession(session, model), model)).toEqual(session);
  expect(() =>
    applyEvent(createSession(model, 1, 16), { type: "shuffle", count: 1000001 }),
  ).toThrow("range");
});

test("keeps log diagnostics finite when tiny-noise posterior weights recover from underflow", () => {
  let session = createSession(model, 1943, 16);
  session = applyEvent(session, {
    type: "controls",
    value: { ...session.controls, sensorNoise: 2e-162 },
  });
  session = applyEvent(session, { type: "begin" });
  for (const cell of [64, 33, 34, 5]) session = applyEvent(session, { type: "shot", cell });
  const restored = importSession(exportSession(session, model), model);
  expect(restored).toEqual(session);
  const history = assistant(restored).belief.history;
  expect(history).toHaveLength(4);
  for (const update of history) {
    for (const value of Object.values(update)) expect(Number.isFinite(value)).toBe(true);
    expect(update.freeEnergy).toBeCloseTo(update.surprise, 12);
  }
  expect(history[3]?.surprise).toBeCloseTo(Math.log(3), 12);
});

test("never conditions the player assistant on selected truth", () => {
  const session = createSession(model, 42, 256);
  const alternative = {
    ...session,
    game: { ...session.game, opponentFleet: session.game.playerFleet },
  };
  expect(assistant(alternative)).toEqual(assistant(session));
});
test("uses each actor's own observation history for diagnostics", () => {
  let session = applyEvent(createSession(model, 42, 256), { type: "begin" });
  session = applyEvent(session, { type: "shot", cell: 0 });
  const opponent = assistant(session, "opponent");
  const changed = { ...session, game: { ...session.game, playerShots: [] } };
  expect(assistant(changed, "opponent")).toEqual(opponent);
  expect(opponent.belief.history).toHaveLength(1);
});

test("recomputes evidence from history when observation noise changes", () => {
  let session = applyEvent(createSession(model, 42, 256), { type: "begin" });
  session = applyEvent(session, { type: "shot", cell: 0 });
  const original = assistant(session).belief;
  const changed = applyEvent(session, {
    type: "controls",
    value: { ...session.controls, sensorNoise: 0 },
  });
  expect(assistant(changed).belief.weights).not.toEqual(original.weights);
});
test("rejects incompatible, malformed, oversized, and impossible replay input", () => {
  const session = createSession(model, 1, 16);
  const raw = JSON.parse(exportSession(session, model));
  expect(() => importSession("not json", model)).toThrow();
  expect(() => importSession(" ".repeat(1000001), model)).toThrow("1 MB");
  expect(() => importSession(JSON.stringify({ ...raw, modelSha256: "other" }), model)).toThrow(
    "different",
  );
  expect(() =>
    importSession(JSON.stringify({ ...raw, events: [{ type: "shot", cell: 0 }] }), model),
  ).toThrow("playing");
  expect(() =>
    importSession(
      JSON.stringify({ ...raw, events: [{ type: "begin" }, { type: "shuffle" }] }),
      model,
    ),
  ).toThrow("before launch");
  expect(() => importSession(JSON.stringify({ ...raw, catalogueSize: 100000 }), model)).toThrow();
  expect(() => createSession(model, -1, 16)).toThrow("Seed");
});

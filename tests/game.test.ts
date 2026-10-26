import { expect, test } from "bun:test";
import { coordinate, generateFleet, makeCatalogue, makeFleet, placements } from "../src/core/fleet";
import { begin, createGame, fire, observations } from "../src/core/game";
import { pick, SeededRandom, shuffle } from "../src/core/random";
import { left, right, rules } from "./fixtures";

test("generates only straight nonoverlapping full fleets across fixed seeds", () => {
  const classic = { boardSize: 10, shipLengths: [5, 4, 3, 3, 2] };
  for (let seed = 0; seed < 64; seed++) {
    const fleet = generateFleet(classic, new SeededRandom(seed));
    expect(fleet.occupied.filter(Boolean)).toHaveLength(17);
    expect(makeFleet(fleet.ships, classic)).toEqual(fleet);
  }
});
test("enumerates edge placements without row wrapping", () => {
  const p = placements(6, 2);
  expect(p).toHaveLength(60);
  expect(p.some((s) => s[0] === 5 && s[1] === 6)).toBe(false);
  expect(coordinate(99, 10)).toBe("J10");
});
test("rejects malformed fleet inputs", () => {
  expect(() => makeFleet([], rules)).toThrow("number");
  expect(() => makeFleet([[0]], rules)).toThrow("length");
  expect(() => makeFleet([[5, 6]], rules)).toThrow("bent");
  expect(() =>
    makeFleet(
      [
        [0, 1],
        [1, 2],
      ],
      { boardSize: 6, shipLengths: [2, 2] },
    ),
  ).toThrow("overlap");
  expect(() => placements(1, 2)).toThrow("dimensions");
  expect(() => placements(6, 7)).toThrow("dimensions");
  expect(() => makeCatalogue(rules, 0, 1)).toThrow("Catalog");
  expect(() =>
    generateFleet({ boardSize: 2, shipLengths: [2, 2, 2] }, new SeededRandom(1)),
  ).toThrow("no legal");
});
test("reproduces the catalog from the same seed", () => {
  expect(makeCatalogue(rules, 16, 123)).toEqual(makeCatalogue(rules, 16, 123));
  expect(makeCatalogue(rules, 16, 123)).not.toEqual(makeCatalogue(rules, 16, 124));
});
test("enforces launch, actor, coordinates, and repeat-shot boundaries", () => {
  const ready = createGame(rules, left, right);
  expect(() => fire(ready, "player", 4)).toThrow("not playing");
  const playing = begin(ready);
  expect(() => begin(playing)).toThrow("ready");
  expect(() => fire(playing, "opponent", 0)).toThrow("turn");
  expect(() => fire(playing, "player", 36)).toThrow("outside");
  expect(() => fire(playing, "player", 0.5)).toThrow("outside");
  const turn2 = fire(fire(playing, "player", 2), "opponent", 2);
  expect(() => fire(turn2, "player", 2)).toThrow("already");
  expect(ready.playerShots).toEqual([]);
});
test("declares victory without giving the opponent a post-terminal turn", () => {
  const game = fire(
    fire(fire(begin(createGame(rules, left, right)), "player", 4), "opponent", 2),
    "player",
    5,
  );
  expect(game.phase).toBe("won");
  expect(game.playerShots.at(-1)?.sunk).toBe(0);
  expect(() => fire(game, "opponent", 0)).toThrow("not playing");
});
test("declares defeat when the opponent sinks the last ship", () => {
  let game = begin(createGame(rules, left, right));
  game = fire(game, "player", 2);
  game = fire(game, "opponent", 0);
  game = fire(game, "player", 3);
  game = fire(game, "opponent", 1);
  expect(game.phase).toBe("lost");
});
test("strips sunk metadata from the agent observation capability", () => {
  expect(observations([{ cell: 4, hit: true, sunk: 0 }])).toEqual([{ cell: 4, hit: true }]);
});
test("keeps seeded random streams deterministic and rejects invalid seeds", () => {
  const a = new SeededRandom(99);
  const b = new SeededRandom(99);
  expect(Array.from({ length: 32 }, () => a.next())).toEqual(
    Array.from({ length: 32 }, () => b.next()),
  );
  expect(shuffle([1, 2, 3], new SeededRandom(7)).sort()).toEqual([1, 2, 3]);
  expect(() => pick([], a)).toThrow("empty");
  expect(() => new SeededRandom(1.1)).toThrow("integer");
});

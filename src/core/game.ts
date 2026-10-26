import type { Fleet, FleetRules } from "./fleet";

export interface Observation {
  readonly cell: number;
  readonly hit: boolean;
}

export interface Shot extends Observation {
  readonly sunk: number | null;
}

export interface Game {
  readonly rules: FleetRules;
  readonly playerFleet: Fleet;
  readonly opponentFleet: Fleet;
  readonly playerShots: readonly Shot[];
  readonly opponentShots: readonly Shot[];
  readonly phase: "ready" | "playing" | "won" | "lost";
  readonly turn: "player" | "opponent";
}

export function createGame(rules: FleetRules, playerFleet: Fleet, opponentFleet: Fleet): Game {
  return {
    rules,
    playerFleet,
    opponentFleet,
    playerShots: [],
    opponentShots: [],
    phase: "ready",
    turn: "player",
  };
}

export function begin(game: Game): Game {
  if (game.phase !== "ready") throw new Error("Only a ready game can begin");
  return { ...game, phase: "playing" };
}

export function fire(game: Game, actor: "player" | "opponent", cell: number): Game {
  if (game.phase !== "playing") throw new Error("Game is not playing");
  if (actor !== game.turn) throw new Error("Out-of-turn shot");
  if (!Number.isInteger(cell) || cell < 0 || cell >= game.rules.boardSize ** 2)
    throw new Error("Shot is outside board");
  const shots = actor === "player" ? game.playerShots : game.opponentShots;
  const fleet = actor === "player" ? game.opponentFleet : game.playerFleet;
  if (shots.some((shot) => shot.cell === cell)) throw new Error("Cell already fired upon");
  const hit = fleet.occupied[cell] === true;
  const allCells = new Set([...shots.map((s) => s.cell), cell]);
  const sunkIndex = hit
    ? fleet.ships.findIndex((s) => s.includes(cell) && s.every((c) => allCells.has(c)))
    : -1;
  const next = [...shots, { cell, hit, sunk: sunkIndex < 0 ? null : sunkIndex }];
  const complete = fleet.ships.every((s) => s.every((c) => allCells.has(c)));
  return {
    ...game,
    playerShots: actor === "player" ? next : game.playerShots,
    opponentShots: actor === "opponent" ? next : game.opponentShots,
    phase: complete ? (actor === "player" ? "won" : "lost") : "playing",
    turn: actor === "player" ? "opponent" : "player",
  };
}

/** Capability boundary: deliberately strips sunk metadata and every fleet field. */
export function observations(shots: readonly Shot[]): readonly Observation[] {
  return shots.map(({ cell, hit }) => ({ cell, hit }));
}

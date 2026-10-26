import { pick, type RandomSource, SeededRandom, shuffle } from "./random";

export interface FleetRules {
  readonly boardSize: number;
  readonly shipLengths: readonly number[];
}

export interface Fleet {
  readonly ships: readonly (readonly number[])[];
  readonly occupied: readonly boolean[];
}

export function coordinate(cell: number, size: number): string {
  return `${String.fromCharCode(65 + Math.floor(cell / size))}${(cell % size) + 1}`;
}

export function placements(size: number, length: number): number[][] {
  if (
    !Number.isInteger(size) ||
    size < 2 ||
    size > 12 ||
    !Number.isInteger(length) ||
    length < 2 ||
    length > size
  ) {
    throw new Error("Invalid board or ship dimensions");
  }
  const result: number[][] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (col + length <= size) result.push(Array.from({ length }, (_, k) => row * size + col + k));
      if (row + length <= size)
        result.push(Array.from({ length }, (_, k) => (row + k) * size + col));
    }
  }
  return result;
}

/** Parse and copy fleet input; straight ships may touch, but never overlap. */
export function makeFleet(ships: readonly (readonly number[])[], rules: FleetRules): Fleet {
  if (ships.length !== rules.shipLengths.length) throw new Error("Wrong number of ships");
  const occupied = Array<boolean>(rules.boardSize ** 2).fill(false);
  ships.forEach((ship, index) => {
    if (ship.length !== rules.shipLengths[index]) throw new Error("Wrong ship length");
    const legal = placements(rules.boardSize, ship.length).some((p) =>
      p.every((c, i) => c === ship[i]),
    );
    if (!legal) throw new Error("Ship is bent, reversed, out of bounds, or repeated");
    for (const cell of ship) {
      if (occupied[cell]) throw new Error("Ships overlap");
      occupied[cell] = true;
    }
  });
  return { ships: ships.map((s) => [...s]), occupied };
}

/** Randomized bounded backtracking; not a uniform sampler over all legal fleets. */
export function generateFleet(rules: FleetRules, random: RandomSource): Fleet {
  return generateFromCandidates(
    rules,
    random,
    rules.shipLengths.map((length) => placements(rules.boardSize, length)),
  );
}

function generateFromCandidates(
  rules: FleetRules,
  random: RandomSource,
  candidates: readonly (readonly number[][])[],
): Fleet {
  const used = new Set<number>();
  const ships: number[][] = [];
  let visits = 0;
  const search = (index: number): boolean => {
    if (++visits > 25000) throw new Error("Fleet search budget exceeded; reduce fleet density");
    const length = rules.shipLengths[index];
    if (length === undefined) return true;
    const options = candidates[index];
    if (!options) throw new Error("Missing ship placement candidates");
    for (const placement of shuffle(options, random)) {
      if (placement.some((c) => used.has(c))) continue;
      for (const cell of placement) used.add(cell);
      ships.push(placement);
      if (search(index + 1)) return true;
      ships.pop();
      for (const cell of placement) used.delete(cell);
    }
    return false;
  };
  if (!search(0)) throw new Error("Fleet rules have no legal arrangement");
  return {
    ships: ships.map((ship) => [...ship]),
    occupied: Array.from({ length: rules.boardSize ** 2 }, (_, cell) => used.has(cell)),
  };
}

/** Catalogue entries are latent labels; duplicates intentionally retain prior mass. */
export function makeCatalogue(rules: FleetRules, count: number, seed: number): readonly Fleet[] {
  if (!Number.isInteger(count) || count < 16 || count > 16384)
    throw new Error("Catalog size must be 16–16384");
  const random = new SeededRandom(seed);
  const candidates = rules.shipLengths.map((length) => placements(rules.boardSize, length));
  return Array.from({ length: count }, () => generateFromCandidates(rules, random, candidates));
}

export function drawFleet(catalogue: readonly Fleet[], random: RandomSource): Fleet {
  return pick(catalogue, random);
}

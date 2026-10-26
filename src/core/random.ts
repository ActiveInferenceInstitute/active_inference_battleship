/** Explicit random streams keep environments, priors and policies independent. */
export interface RandomSource {
  next(): number;
}

export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed: number) {
    if (!Number.isSafeInteger(seed)) throw new Error("Seed must be a safe integer");
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export function pick<T>(values: readonly T[], random: RandomSource): T {
  const value = values[Math.floor(random.next() * values.length)];
  if (value === undefined) throw new Error("Cannot choose from an empty collection");
  return value;
}

export function shuffle<T>(values: readonly T[], random: RandomSource): T[] {
  const output = [...values];
  for (let i = output.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    const a = output[i];
    const b = output[j];
    if (a === undefined || b === undefined) throw new Error("Invalid shuffle index");
    output[i] = b;
    output[j] = a;
  }
  return output;
}

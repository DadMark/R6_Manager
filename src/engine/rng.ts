/**
 * Deterministic, sub-seeded randomness.
 *
 * The key design decision: every unit of simulation work derives its OWN
 * generator from `(runSeed, matchIndex, roundIndex, purpose)` rather than
 * drawing from one shared stream. That buys three things:
 *
 *  1. Persistence stores only the seed string — never a cursor or an RNG
 *     object — so rehydrating mid-run reproduces results exactly.
 *  2. Any single round can be re-simulated in isolation for debugging.
 *  3. Adding a die roll to one phase cannot shift the results of another.
 */

/** String -> 32-bit seed. */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** Small, fast, well-distributed 32-bit PRNG. */
export function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform float in [lo, hi). */
  range(lo: number, hi: number): number;
  /** Uniform integer in [lo, hi], inclusive. */
  int(lo: number, hi: number): number;
  pick<T>(xs: readonly T[]): T;
  weighted<T>(xs: readonly T[], weight: (x: T) => number): T;
  chance(p: number): boolean;
}

export function makeRng(seed: number): Rng {
  const next = mulberry32(seed);
  const rng: Rng = {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T,>(xs: readonly T[]): T => {
      if (xs.length === 0) throw new Error('rng.pick called with an empty array');
      return xs[Math.floor(next() * xs.length)]!;
    },
    weighted: <T,>(xs: readonly T[], weight: (x: T) => number): T => {
      if (xs.length === 0) throw new Error('rng.weighted called with an empty array');
      const weights = xs.map((x) => Math.max(0, weight(x)));
      const total = weights.reduce((a, b) => a + b, 0);
      // All-zero weights degrade to a uniform pick rather than throwing.
      if (total <= 0) return xs[Math.floor(next() * xs.length)]!;
      let roll = next() * total;
      for (let i = 0; i < xs.length; i++) {
        roll -= weights[i]!;
        if (roll <= 0) return xs[i]!;
      }
      return xs[xs.length - 1]!;
    },
    chance: (p) => next() < p,
  };
  return rng;
}

/** Join seed components into a stable, collision-resistant string. */
export const subSeed = (...parts: (string | number)[]): string => parts.join('|');

/** Build an independent generator for one unit of work. */
export const rngFor = (...parts: (string | number)[]): Rng => makeRng(xmur3(subSeed(...parts))());

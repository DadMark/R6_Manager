/** Small numeric helpers shared across the simulation. */

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Round to `places` decimals — used to keep debug breakdowns readable. */
export const round = (v: number, places = 2): number => {
  const f = 10 ** places;
  return Math.round(v * f) / f;
};

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

export const mean = (xs: readonly number[]): number => (xs.length === 0 ? 0 : sum(xs) / xs.length);

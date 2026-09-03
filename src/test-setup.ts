/**
 * Global test setup.
 *
 * The engine must never reach for ambient randomness or the clock — it takes an
 * injected `Rng` and is time-free. ESLint blocks this statically; these stubs
 * make a violation fail loudly at runtime too (including via dynamic access,
 * which lint cannot see).
 */
const forbid = (what: string) => () => {
  throw new Error(
    `${what} is forbidden in tests: the engine must be deterministic. Use the injected Rng.`,
  );
};

Math.random = forbid('Math.random') as unknown as typeof Math.random;
Date.now = forbid('Date.now') as unknown as typeof Date.now;

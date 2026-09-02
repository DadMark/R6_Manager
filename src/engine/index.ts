/**
 * Public surface of the simulation engine.
 *
 * The UI imports from here and nowhere deeper. The engine has no imports
 * outside itself and returns plain JSON-serialisable data, so moving it into
 * a `packages/engine` workspace and running it server-side for async PvP
 * (phase 2) is a file move, not a rewrite.
 */
export * from './types';
export { makeRng, mulberry32, rngFor, subSeed, xmur3, type Rng } from './rng';
export { clamp, lerp, mean, round, sigmoid, sum } from './math';
export { countTag, hasAnyTag, hasTag, rating } from './rating';
export { resolveDuel, rollTrade, type DuelModifiers, type DuelOutcome } from './duel';
export { simulateRound } from './simulateRound';
export { narrate, type NarrationContext } from './narration/narrate';

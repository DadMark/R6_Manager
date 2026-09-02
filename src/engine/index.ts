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
export {
  simulateMatch,
  sideForRound,
  totalRounds,
  type MatchPlanner,
  type MatchTeam,
  type SimulateMatchInput,
} from './simulateMatch';
export { narrate, UNRESOLVED, type NarrationContext } from './narration/narrate';
export { resolveCounterRule, type CounterResolution } from './counters';
export {
  AI_PROFILES,
  DIMINISH,
  NEEDS,
  profileById,
  threatDescriptor,
  threatStars,
  type AIProfile,
} from './ai/difficulty';
export { adaptNeeds, coverageGaps, pickLineup } from './ai/pickLineup';
export { pickPlan, type PlanInput } from './ai/pickPlan';
export {
  buildAIRoster,
  buildOffer,
  draftStep,
  draftTotalSteps,
  sideForStep,
  DEFAULT_DRAFT,
  type DraftConfig,
} from './draft';
export { initialRunState, runReducer, type RunAction, type RunDeps } from './run';

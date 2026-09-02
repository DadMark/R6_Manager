import { clamp } from './math';
import type { Rng } from './rng';
import type {
  CounterRule,
  Operator,
  OperatorInstance,
  RuleOutcome,
  Tag,
} from './types';

/**
 * The utility counter-matrix, resolved generically.
 *
 * ONE function drives every gadget interaction in the game — hard breach vs
 * anti-breach, intel vs jammers, anti-gadget vs traps, and so on. The rules
 * themselves are data in `content/counterRules.ts`. There is deliberately no
 * `if (op.id === ...)` anywhere: that is what keeps operators swappable and
 * lets a designer add an interaction without touching the engine.
 */

export interface CounterResolution {
  outcome: RuleOutcome;
  probability: number;
  actorIds: string[];
  opposedIds: string[];
  trumpIds: string[];
  /** True when nobody on the acting side even had the required tag. */
  absent: boolean;
  narrationKey: string;
}

const aliveWithAnyTag = (
  units: readonly OperatorInstance[],
  byId: ReadonlyMap<string, Operator>,
  tags: readonly Tag[],
): OperatorInstance[] =>
  units.filter((u) => {
    if (!u.alive) return false;
    const op = byId.get(u.opId);
    return op ? tags.some((t) => op.roles.includes(t)) : false;
  });

const avgUtility = (
  units: readonly OperatorInstance[],
  byId: ReadonlyMap<string, Operator>,
): number => {
  if (units.length === 0) return 0;
  const total = units.reduce((sum, u) => sum + (byId.get(u.opId)?.stats.utility ?? 0), 0);
  return total / units.length;
};

export interface CounterInput {
  rule: CounterRule;
  /** Units belonging to the side that acts in this rule. */
  actorUnits: readonly OperatorInstance[];
  /** Units belonging to the opposing side. */
  opposedUnits: readonly OperatorInstance[];
  byId: ReadonlyMap<string, Operator>;
  /** Intel advantage from the PREP phase, already signed for the acting side. */
  info: number;
}

/**
 * Score the contest, then split the roll into SUCCESS / PARTIAL / FAIL.
 *
 * The PARTIAL band is not decoration: it is what stops a hard counter from
 * turning a round into an unwinnable formality, which is the failure mode the
 * "worst comp still wins ≥8%" invariant guards against.
 */
export function resolveCounterRule(input: CounterInput, rng: Rng): CounterResolution {
  const { rule, actorUnits, opposedUnits, byId, info } = input;
  const w = rule.weights;

  const actors = aliveWithAnyTag(actorUnits, byId, rule.actor.anyTag);
  const opposed = rule.opposed ? aliveWithAnyTag(opposedUnits, byId, rule.opposed.anyTag) : [];
  const trump = rule.trump ? aliveWithAnyTag(actorUnits, byId, rule.trump.anyTag) : [];
  const counterTrump = rule.counterTrump
    ? aliveWithAnyTag(opposedUnits, byId, rule.counterTrump.anyTag)
    : [];

  // Nobody brought the tool. That is itself a meaningful outcome — the
  // attackers who skipped a hard breach must live with the reinforced wall.
  if (actors.length === 0) {
    return {
      outcome: 'FAIL',
      probability: 0,
      actorIds: [],
      opposedIds: opposed.map((u) => u.opId),
      trumpIds: [],
      absent: true,
      narrationKey: rule.fallbackNarrationKey ?? rule.narrationKey,
    };
  }

  const score =
    w.base +
    w.perActor * Math.min(actors.length, w.actorCap) +
    w.perOpposed * Math.min(opposed.length, w.opposedCap) +
    (opposed.length === 0 ? w.uncontestedBonus : 0) +
    (trump.length > 0 ? w.trumpBonus : 0) +
    (counterTrump.length > 0 ? w.counterTrumpBonus : 0) +
    w.utilityScale *
      (avgUtility(actors, byId) - avgUtility(opposed.length > 0 ? opposed : actors, byId)) +
    w.infoScale * (info / 6);

  const probability = clamp(score, 0.05, 0.95);
  const roll = rng.next();

  let outcome: RuleOutcome;
  if (roll < probability * 0.8) outcome = 'SUCCESS';
  else if (roll < probability * 0.8 + 0.18) outcome = 'PARTIAL';
  else outcome = 'FAIL';

  return {
    outcome,
    probability,
    actorIds: actors.map((u) => u.opId),
    opposedIds: opposed.map((u) => u.opId),
    trumpIds: trump.map((u) => u.opId),
    absent: false,
    narrationKey: rule.narrationKey,
  };
}

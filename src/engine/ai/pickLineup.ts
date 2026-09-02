import type { Rng } from '../rng';
import type { Operator, RoundPlan, Side, Tag } from '../types';
import { DIMINISH, NEEDS, type AIProfile } from './difficulty';

/**
 * Needs-greedy lineup selection.
 *
 * Score every candidate by raw quality plus what it contributes to the gaps
 * still open in the comp, then take the best five. `disciplineWeight` scales
 * how much the coverage term matters, which is the difficulty dial: a sloppy
 * AI drafts five good shooters and no hard breach.
 */

const baseQuality = (op: Operator, profile: AIProfile): number =>
  0.45 * op.stats.aim +
  0.25 * op.stats.utility +
  0.15 * op.stats.entry +
  0.15 * op.stats.clutch +
  profile.skillBias;

/**
 * Adjust the need weights from what the player did last round.
 *
 * Cheap to compute, and the perceived-intelligence payoff is large — the final
 * boss visibly counter-drafts you.
 */
export function adaptNeeds(
  side: Side,
  profile: AIProfile,
  lastOpponentPlan: RoundPlan | undefined,
  lastOpponentOperators: readonly Operator[],
): Partial<Record<Tag, number>> {
  const needs: Partial<Record<Tag, number>> = { ...NEEDS[side] };
  if (!lastOpponentPlan || profile.adaptivity <= 0) return needs;

  const bump = (tag: Tag, amount: number): void => {
    needs[tag] = (needs[tag] ?? 0) + amount * profile.adaptivity;
  };

  const had = (tag: Tag): number =>
    lastOpponentOperators.filter((o) => o.roles.includes(tag)).length;

  if (side === 'DEF') {
    if (had('hard-breach') >= 1) bump('anti-breach', 4);
    if (had('intel') >= 2) bump('intel-denial', 4);
    if (lastOpponentPlan.strategy === 'RUSH') bump('trap', 4);
    if (lastOpponentPlan.strategy === 'DEFAULT') bump('roam', 3);
  } else {
    if (had('anti-breach') >= 1) bump('anti-gadget', 4);
    if (had('trap') >= 2) bump('anti-gadget', 2);
    if (had('intel') >= 2) bump('flash', 2);
  }

  return needs;
}

export function pickLineup(
  roster: readonly Operator[],
  side: Side,
  profile: AIProfile,
  rng: Rng,
  needs: Partial<Record<Tag, number>> = NEEDS[side],
  size = 5,
): Operator[] {
  const pool = roster.filter((o) => o.side === side);
  const chosen: Operator[] = [];
  const covered: Partial<Record<Tag, number>> = {};

  while (chosen.length < Math.min(size, pool.length)) {
    let best: Operator | null = null;
    let bestValue = -Infinity;

    for (const op of pool) {
      if (chosen.some((c) => c.id === op.id)) continue;

      let value = baseQuality(op, profile);
      for (const tag of op.roles) {
        const weight = needs[tag];
        if (!weight) continue;
        const already = covered[tag] ?? 0;
        const diminish = DIMINISH[Math.min(already, DIMINISH.length - 1)]!;
        value += weight * profile.disciplineWeight * diminish;
      }
      value += profile.noise * rng.range(-1, 1) * 6;

      if (value > bestValue) {
        bestValue = value;
        best = op;
      }
    }

    if (!best) break;
    chosen.push(best);
    for (const tag of best.roles) covered[tag] = (covered[tag] ?? 0) + 1;
  }

  return chosen;
}

/**
 * Which needs a lineup leaves uncovered. Powers both the AI's own scoring and
 * the player-facing coverage panel — the screen where the counter-matrix is
 * actually learned.
 */
export function coverageGaps(lineup: readonly Operator[], side: Side): Tag[] {
  const covered = new Set<Tag>();
  for (const op of lineup) for (const tag of op.roles) covered.add(tag);

  return Object.entries(NEEDS[side])
    .filter(([tag, weight]) => (weight ?? 0) >= 5 && !covered.has(tag as Tag))
    .map(([tag]) => tag as Tag);
}

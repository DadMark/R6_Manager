import type { DuelType, Operator, Stats, Tag, Tuning } from './types';

/**
 * A duel-type-weighted rating for one operator, in raw stat points.
 *
 * Weights live in `content.tuning.DUEL_WEIGHTS` rather than here so that
 * balancing never requires an engine change.
 */
export function rating(op: Operator, type: DuelType, tuning: Tuning): number {
  const weights = tuning.DUEL_WEIGHTS[type];
  let total = 0;
  for (const [stat, weight] of Object.entries(weights) as [keyof Stats, number][]) {
    total += op.stats[stat] * weight;
  }
  return total;
}

export const hasTag = (op: Operator, tag: Tag): boolean => op.roles.includes(tag);

export const hasAnyTag = (op: Operator, tags: readonly Tag[]): boolean =>
  tags.some((t) => op.roles.includes(t));

export const countTag = (ops: readonly Operator[], tag: Tag): number =>
  ops.reduce((n, op) => n + (op.roles.includes(tag) ? 1 : 0), 0);

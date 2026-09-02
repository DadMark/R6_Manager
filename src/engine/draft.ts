import type { Rng } from './rng';
import type { DraftOffer, GameContent, Operator, Side } from './types';

/**
 * Draft-per-run.
 *
 * The player builds a roster from offered choices at the start of each run.
 * Because every round's five must come out of this roster, the draft is a real
 * strategic commitment — skip anti-gadget here and reinforced walls will hold
 * you all run.
 */

export interface DraftConfig {
  /** How many operators of each side the player drafts. */
  perSide: number;
  /** How many choices are shown at each step. */
  offerSize: number;
}

/**
 * Six per side, not five.
 *
 * Five would be the minimum to field a lineup at all — and would make the
 * per-round "pick 5" a formality, since there would be exactly one legal
 * choice. The sixth operator is what turns each round's lineup into a real
 * decision against the site and strategy you just chose.
 */
export const DEFAULT_DRAFT: DraftConfig = { perSide: 6, offerSize: 3 };

/** A lineup is five operators. The draft must always be able to field one. */
export const LINEUP_SIZE = 5;

export const draftTotalSteps = (config: DraftConfig = DEFAULT_DRAFT): number => config.perSide * 2;

/** Attack picks come first, then defence — grouped so the player can think in phases. */
export const sideForStep = (step: number, config: DraftConfig = DEFAULT_DRAFT): Side =>
  step < config.perSide ? 'ATK' : 'DEF';

/**
 * Build the offer for one draft step.
 *
 * Weighted by `draftWeight`, which is the primary balance knob: an operator
 * that turns out to be an auto-pick gets offered less often before anyone
 * touches its stats.
 */
export function buildOffer(
  content: GameContent,
  step: number,
  alreadyPicked: readonly string[],
  rng: Rng,
  config: DraftConfig = DEFAULT_DRAFT,
): string[] {
  const side = sideForStep(step, config);
  const pool = content.operators.filter(
    (op) => op.side === side && !alreadyPicked.includes(op.id),
  );

  const offer: Operator[] = [];
  while (offer.length < Math.min(config.offerSize, pool.length)) {
    const candidate = rng.weighted(
      pool.filter((op) => !offer.some((o) => o.id === op.id)),
      (op) => op.draftWeight,
    );
    offer.push(candidate);
  }

  return offer.map((op) => op.id);
}

export function draftStep(
  content: GameContent,
  step: number,
  alreadyPicked: readonly string[],
  rng: Rng,
  config: DraftConfig = DEFAULT_DRAFT,
): DraftOffer {
  return {
    step,
    total: draftTotalSteps(config),
    side: sideForStep(step, config),
    offer: buildOffer(content, step, alreadyPicked, rng, config),
  };
}

/**
 * Generate a full AI roster in one go. Opponents draft too — they just do it
 * off-screen, weighted toward what their profile knows it needs.
 */
export function buildAIRoster(
  content: GameContent,
  rng: Rng,
  config: DraftConfig = DEFAULT_DRAFT,
  rarityBias: readonly string[] = [],
): string[] {
  const roster: string[] = [];

  for (const side of ['ATK', 'DEF'] as const) {
    const pool = content.operators.filter((op) => op.side === side);
    while (roster.filter((id) => content.operators.find((o) => o.id === id)?.side === side).length < config.perSide) {
      const candidate = rng.weighted(
        pool.filter((op) => !roster.includes(op.id)),
        (op) => op.draftWeight * (rarityBias.includes(op.rarity) ? 2.5 : 1),
      );
      roster.push(candidate.id);
    }
  }

  return roster;
}

import type { Rng } from '../rng';
import type {
  AtkStrategy,
  DefStrategy,
  GameMap,
  Operator,
  RoundPlan,
  Side,
  SiteId,
  Strategy,
  Tuning,
} from '../types';
import type { AIProfile } from './difficulty';

/**
 * Site and strategy selection.
 *
 * The defence picks where it sets up; the attack picks where it hits. Getting
 * that guess right or wrong is worth ~13pp, so this is a real decision rather
 * than flavour.
 */

const ATK_STRATEGIES: AtkStrategy[] = ['RUSH', 'DEFAULT', 'SPLIT'];
const DEF_STRATEGIES: DefStrategy[] = ['AGGRESSIVE_ROAM', 'ANCHOR_HOLD', 'SPREAD'];

/** How well a lineup suits holding (or hitting) a given site. */
function lineupFit(lineup: readonly Operator[], side: Side): number {
  const has = (tag: string): number => lineup.filter((o) => o.roles.includes(tag as never)).length;
  return side === 'DEF'
    ? 0.15 * has('anti-breach') + 0.1 * has('trap') + 0.1 * has('anchor')
    : 0.15 * has('hard-breach') + 0.1 * has('soft-breach');
}

function strategyFit(strategy: Strategy, lineup: readonly Operator[], profile: AIProfile): number {
  const has = (tag: string): number => lineup.filter((o) => o.roles.includes(tag as never)).length;

  switch (strategy) {
    case 'RUSH':
      return 0.4 * has('entry') + 0.3 * has('flash') + 2 * profile.aggression;
    case 'DEFAULT':
      return 0.5 * has('intel') + 0.3 * has('hard-breach') + 2 * (1 - profile.aggression);
    case 'SPLIT':
      return 0.3 * has('soft-breach') + 0.3 * has('support') + 1;
    case 'AGGRESSIVE_ROAM':
      return 0.5 * has('roam') + 2 * profile.aggression;
    case 'ANCHOR_HOLD':
      return 0.4 * has('anchor') + 0.3 * has('trap') + 2 * (1 - profile.aggression);
    case 'SPREAD':
      return 0.3 * has('intel') + 1;
  }
}

/** Softmax over strategy fit. Low noise plays the counter; high noise wanders. */
function chooseStrategy(
  options: readonly Strategy[],
  lineup: readonly Operator[],
  profile: AIProfile,
  predictedOpponent: Strategy | undefined,
  tuning: Tuning,
  side: Side,
  rng: Rng,
): Strategy {
  const temperature = 1 + 2 * profile.noise;

  const scored = options.map((strategy) => {
    let score = strategyFit(strategy, lineup, profile);

    // Play the matchup when we have a read on the opponent.
    if (predictedOpponent && profile.adaptivity > 0) {
      const matrixValue =
        side === 'ATK'
          ? (tuning.STRATEGY_MATRIX[strategy]?.[predictedOpponent] ?? 0)
          : -(tuning.STRATEGY_MATRIX[predictedOpponent]?.[strategy] ?? 0);
      score += matrixValue * profile.adaptivity;
    }

    return { strategy, weight: Math.exp(score / temperature) };
  });

  return rng.weighted(scored, (s) => s.weight).strategy;
}

export interface PlanInput {
  side: Side;
  lineup: readonly Operator[];
  map: GameMap;
  profile: AIProfile;
  tuning: Tuning;
  /** The opponent's previous plan, if this AI is adaptive enough to use it. */
  lastOpponentPlan?: RoundPlan;
  /** Sites the opponent has attacked recently, most recent last. */
  recentOpponentSites?: readonly SiteId[];
}

export function pickPlan(input: PlanInput, rng: Rng): RoundPlan {
  const { side, lineup, map, profile, tuning, lastOpponentPlan, recentOpponentSites = [] } = input;

  // Site priors, nudged by lineup fit and by where the opponent keeps going.
  const siteWeights = map.sites.map((site) => {
    let weight = site.defaultPrior * (1 + lineupFit(lineup, side));

    if (profile.adaptivity > 0 && recentOpponentSites.length > 0) {
      const hits = recentOpponentSites.filter((s) => s === site.id).length;
      const share = hits / recentOpponentSites.length;
      // Defenders move toward where the attack keeps hitting; attackers move
      // away from where they have become predictable.
      weight *= 1 + (side === 'DEF' ? 1 : -1) * 0.35 * profile.adaptivity * share;
    }

    return { site, weight: Math.max(0.01, weight) };
  });

  const site = rng.weighted(siteWeights, (s) => s.weight).site.id;

  const options: readonly Strategy[] = side === 'ATK' ? ATK_STRATEGIES : DEF_STRATEGIES;
  const strategy = chooseStrategy(
    options,
    lineup,
    profile,
    lastOpponentPlan?.strategy,
    tuning,
    side,
    rng,
  );

  return { lineup: lineup.map((o) => o.id), site, strategy };
}

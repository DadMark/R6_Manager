import { clamp, round, sigmoid } from './math';
import { rating } from './rating';
import type { Rng } from './rng';
import type { DuelType, ModifierBreakdown, Operator, Tuning } from './types';

/**
 * Everything that shifts a duel away from a pure stat comparison.
 * All values are in raw stat points, so they are directly comparable to the
 * `rating()` delta they are added to.
 */
export interface DuelModifiers {
  /** Intel advantage, from the attacker's perspective. */
  info?: number;
  /** Alive count difference, from the attacker's perspective. */
  numbers?: number;
  wallOpen?: boolean;
  flashSupport?: boolean;
  defHealAvailable?: boolean;
  /** Strategy matchup value, from the attacker's perspective. */
  strategy?: number;
  /** `atk.exec - def.setup`. */
  exec?: number;
  /** Morale difference, from the attacker's perspective. */
  morale?: number;
  /** Team skill difference (attacker - defender), in raw stat points. */
  skill?: number;
  planted?: boolean;
}

export interface DuelOutcome {
  attackerWon: boolean;
  mods: ModifierBreakdown;
}

/**
 * Resolve a single engagement between one attacker and one defender.
 *
 * The delta is always expressed from the ATTACKER's point of view; a positive
 * total favours the attacker. The caller decides which two operators meet.
 */
export function resolveDuel(
  attacker: Operator,
  defender: Operator,
  type: DuelType,
  mods: DuelModifiers,
  tuning: Tuning,
  rng: Rng,
  hpDelta = 0,
): DuelOutcome {
  const M = tuning.MOD;

  const base = rating(attacker, type, tuning) - rating(defender, type, tuning);

  const info = clamp(mods.info ?? 0, -M.infoCap, M.infoCap);
  const numbers = clamp(M.numbers * (mods.numbers ?? 0), -M.numbersCap, M.numbersCap);
  const utility =
    (mods.wallOpen ? M.wallOpen : 0) +
    (mods.flashSupport ? M.flashSupport : 0) -
    (mods.defHealAvailable ? M.defHeal : 0);
  const health = M.hp * hpDelta;
  const strategy = mods.strategy ?? 0;
  const exec = clamp(M.exec * (mods.exec ?? 0), -M.execCap, M.execCap);
  const morale = clamp(M.morale * (mods.morale ?? 0), -M.moraleCap, M.moraleCap);
  const skill = M.skill * (mods.skill ?? 0);
  const postPlant = mods.planted ? M.postPlant : 0;

  const total =
    base + info + numbers + utility + health + strategy + exec + morale + skill + postPlant;
  const probability = clamp(sigmoid(total / tuning.DUEL_K), tuning.P_FLOOR, tuning.P_CEIL);
  const roll = rng.next();

  return {
    attackerWon: roll < probability,
    mods: {
      base: round(base),
      info: round(info),
      numbers: round(numbers),
      utility: round(utility),
      health: round(health),
      strategy: round(strategy),
      exec: round(exec),
      morale: round(morale + skill),
      postPlant: round(postPlant),
      total: round(total),
      probability: round(probability, 4),
      roll: round(roll, 4),
    },
  };
}

/**
 * Whether the side that just lost a player trades the kill back.
 *
 * Trades are what stop first blood from deciding the round on its own — see
 * the snowball invariant in the balance suite.
 */
export function rollTrade(
  loserSideNumbersAdvantage: number,
  loserStrategy: string,
  tuning: Tuning,
  rng: Rng,
): boolean {
  const t = tuning.TRADE;
  const p = clamp(
    t.base + t.perNumbers * loserSideNumbersAdvantage + (t.byStrategy[loserStrategy] ?? 0),
    0,
    t.cap,
  );
  return rng.chance(p);
}

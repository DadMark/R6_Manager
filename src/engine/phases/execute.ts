import { resolveDuel, rollTrade, type DuelModifiers } from '../duel';
import { clamp } from '../math';
import type { DuelType, OperatorInstance, Side } from '../types';
import type { RoundState } from './state';

/**
 * EXECUTE — the main fight, and the plant.
 *
 * The plant is the attack's real win condition. Without it the round is
 * defender-sided by construction, because a full wipe is a much harder ask
 * than holding a site until the clock runs out.
 */

/**
 * Pick who each side sends into the next engagement. Weighted rather than
 * deterministic, so the same lineup does not replay identically every round.
 */
function champion(
  state: RoundState,
  units: OperatorInstance[],
  statKey: 'entry' | 'aim' | 'clutch',
): OperatorInstance {
  return state.rng.weighted(units, (u) => (state.op(u).stats[statKey] / 10) ** 2);
}

export function runExecute(state: RoundState): void {
  const { tuning } = state.content;
  const { atk, def } = state.ctx;

  state.runCounterRules('EXECUTE');
  state.t = Math.max(state.t, tuning.CLOCK.executeStart);

  const strategyValue = tuning.STRATEGY_MATRIX[atk.plan.strategy]?.[def.plan.strategy] ?? 0;
  let engagements = 0;

  while (
    engagements < tuning.ROUND.maxEngagements &&
    state.alive('ATK').length > 0 &&
    state.alive('DEF').length > 0 &&
    state.t < tuning.ROUND.clockMax
  ) {
    // A plant attempt happens between engagements, while the attack holds
    // enough space to get on the objective.
    if (!state.planted && tryPlant(state)) {
      // Post-plant flips the round: the defence now has to come to them.
      continue;
    }

    engagements++;
    const atkAlive = state.alive('ATK');
    const defAlive = state.alive('DEF');

    const atkUnit = champion(state, atkAlive, state.planted ? 'aim' : 'entry');
    const defUnit = champion(state, defAlive, 'aim');

    const duelType: DuelType = state.planted ? 'ANCHOR' : 'ENTRY';
    const defHealAvailable = defAlive.some((u) => state.op(u).roles.includes('heal'));

    const mods: DuelModifiers = {
      info: state.info,
      numbers: atkAlive.length - defAlive.length,
      wallOpen: state.flags.wallOpen,
      flashSupport: state.flags.flashSupport,
      defHealAvailable,
      strategy: strategyValue,
      exec: state.atkExec - state.defSetup,
      morale: atk.morale - def.morale,
      planted: state.planted,
    };

    const outcome = resolveDuel(
      state.op(atkUnit),
      state.op(defUnit),
      duelType,
      mods,
      tuning,
      state.rng,
      atkUnit.hp - defUnit.hp,
    );

    const winnerUnit = outcome.attackerWon ? atkUnit : defUnit;
    const loserUnit = outcome.attackerWon ? defUnit : atkUnit;
    const winnerSide: Side = outcome.attackerWon ? 'ATK' : 'DEF';
    state.kill(loserUnit, winnerUnit);

    // Does the side that just lost someone trade the kill back? Trades are
    // what stop first blood from deciding the round on its own.
    const loserSide: Side = outcome.attackerWon ? 'DEF' : 'ATK';
    const winnerSideAlive = state.alive(winnerSide).length;
    const loserMates = state.alive(loserSide);

    let traded = false;
    let traderId: string | undefined;
    if (
      loserMates.length > 0 &&
      rollTrade(
        loserMates.length - winnerSideAlive,
        state.side(loserSide).plan.strategy,
        tuning,
        state.rng,
      )
    ) {
      const trader = champion(state, loserMates, 'aim');
      state.kill(winnerUnit, trader);
      traded = true;
      traderId = trader.opId;
    }

    state.advanceClock(state.rng.int(...tuning.ROUND.engagementSeconds));

    state.emit({
      kind: 'DUEL',
      phase: state.planted ? 'POST_PLANT' : 'EXECUTE',
      t: Math.round(state.t),
      id: state.nextEventId(),
      winnerId: winnerUnit.opId,
      loserId: loserUnit.opId,
      winnerSide,
      traded,
      ...(traderId ? { traderId } : {}),
      mods: outcome.mods,
    });

    // Momentum: winning a fight opens space for the next one.
    if (!traded) {
      if (outcome.attackerWon) state.atkExec = clamp(state.atkExec + 1, -12, 12);
      else state.defSetup = clamp(state.defSetup + 1, -12, 12);
    }
  }

  // One last chance to get the plant down before the clock kills the round.
  if (!state.planted && state.alive('ATK').length > 0 && state.alive('DEF').length === 0) {
    forcePlant(state);
  }
}

/** Roll for a plant attempt between engagements. */
function tryPlant(state: RoundState): boolean {
  const { tuning } = state.content;
  const { atk } = state.ctx;
  const P = tuning.PLANT;

  const atkAlive = state.alive('ATK');
  const defAlive = state.alive('DEF');
  if (atkAlive.length === 0) return false;

  const p = clamp(
    P.base +
      P.perNumbers * (atkAlive.length - defAlive.length) +
      (state.flags.wallOpen ? P.wallOpen : 0) +
      (P.byStrategy[atk.plan.strategy] ?? 0) +
      (state.siteMatch ? 0 : P.siteMismatch) +
      (state.t > P.lateThreshold ? P.latePenalty : 0),
    P.min,
    P.max,
  );

  if (!state.rng.chance(p)) return false;

  const planter = state.rng.pick(atkAlive);
  state.planted = true;
  state.plantedAt = state.t;
  state.advanceClock(6);

  state.emit({
    kind: 'PLANT',
    phase: 'PLANT',
    t: Math.round(state.t),
    id: state.nextEventId(),
    planterId: planter.opId,
    site: atk.plan.site,
    contested: defAlive.length >= atkAlive.length,
  });

  return true;
}

/** With the defence wiped, the plant is a formality — but it still happens. */
function forcePlant(state: RoundState): void {
  const atkAlive = state.alive('ATK');
  if (atkAlive.length === 0) return;

  const planter = state.rng.pick(atkAlive);
  state.planted = true;
  state.plantedAt = state.t;
  state.advanceClock(6);

  state.emit({
    kind: 'PLANT',
    phase: 'PLANT',
    t: Math.round(state.t),
    id: state.nextEventId(),
    planterId: planter.opId,
    site: state.ctx.atk.plan.site,
    contested: false,
  });
}

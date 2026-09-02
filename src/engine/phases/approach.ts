import { resolveDuel } from '../duel';
import { clamp } from '../math';
import type { OperatorInstance } from '../types';
import type { RoundState } from './state';

/**
 * APPROACH — traps and roamers.
 *
 * This is where RUSH pays for its tempo: pushing fast triggers more traps and
 * runs into more roamers. DEFAULT buys safety here with the clock it spent in
 * PREP.
 */
export function runApproach(state: RoundState): void {
  const { tuning } = state.content;
  const { atk, def } = state.ctx;

  state.runCounterRules('APPROACH');

  // ── Traps ─────────────────────────────────────────────────────────────────
  const trappers = def.units.filter((u) => u.alive && state.op(u).roles.includes('trap'));
  const intelCount = atk.units.filter((u) => u.alive && state.op(u).roles.includes('intel')).length;
  const hasAntiGadget = atk.units.some(
    (u) => u.alive && state.op(u).roles.includes('anti-gadget'),
  );

  for (const trapper of trappers) {
    const victims = state.alive('ATK');
    if (victims.length === 0) break;

    const trapOp = state.op(trapper);
    const T = tuning.TRAP;

    // Traps that were already swept do far less.
    const clearedPenalty = state.flags.trapsCleared ? -0.25 : 0;

    const pTrigger = clamp(
      T.base +
        (T.byStrategy[atk.plan.strategy] ?? 0) +
        T.perIntel * intelCount +
        (hasAntiGadget ? T.antiGadget : 0) +
        T.utilityScale * ((trapOp.stats.utility - T.utilityPivot) / 10) +
        T.infoScale * state.info +
        clearedPenalty,
      T.min,
      T.max,
    );

    if (!state.rng.chance(pTrigger)) continue;

    // Entry fraggers walk first, and fast operators walk carelessly.
    const victim = state.rng.weighted(victims, (u) => {
      const op = state.op(u);
      return (op.roles.includes('entry') ? 2 : 1) * op.speed;
    });

    const lethal = state.rng.chance(trapOp.gadget.power);
    if (lethal) {
      state.kill(victim, trapper);
    } else {
      victim.hp = Math.max(1, victim.hp - 1) as 1 | 2 | 3;
      victim.chipped = true;
    }

    state.advanceClock(4);
    state.emit({
      kind: 'TRAP_TRIGGER',
      phase: 'APPROACH',
      t: Math.round(state.t),
      id: state.nextEventId(),
      trapOpId: trapper.opId,
      victimId: victim.opId,
      lethal,
    });
  }

  // ── Roamers ───────────────────────────────────────────────────────────────
  const roamers = def.units.filter((u) => u.alive && state.op(u).roles.includes('roam'));
  const R = tuning.ROAM;
  const pEngage = clamp(
    R.engageBase +
      (R.byAtkStrategy[atk.plan.strategy] ?? 0) +
      (R.byDefStrategy[def.plan.strategy] ?? 0),
    0,
    0.95,
  );

  let duels = 0;
  for (const roamer of roamers) {
    if (duels >= R.maxDuels) break;
    if (!roamer.alive) continue;
    if (!state.rng.chance(pEngage)) continue;

    const targets = state.alive('ATK');
    if (targets.length === 0) break;

    // Roamers hunt the entry fragger.
    const target = targets.reduce((best: OperatorInstance, u) =>
      state.op(u).stats.entry > state.op(best).stats.entry ? u : best,
    );

    const outcome = resolveDuel(
      state.op(target),
      state.op(roamer),
      'ROAM',
      {
        info: state.info,
        numbers: state.alive('ATK').length - state.alive('DEF').length,
        strategy: tuning.STRATEGY_MATRIX[atk.plan.strategy]?.[def.plan.strategy] ?? 0,
        exec: state.atkExec - state.defSetup,
      },
      tuning,
      state.rng,
      target.hp - roamer.hp,
    );

    const winner = outcome.attackerWon ? target : roamer;
    const loser = outcome.attackerWon ? roamer : target;
    state.kill(loser, winner);

    duels++;
    state.advanceClock(state.rng.int(5, 12));
    state.emit({
      kind: 'ROAM_DUEL',
      phase: 'APPROACH',
      t: Math.round(state.t),
      id: state.nextEventId(),
      winnerId: winner.opId,
      loserId: loser.opId,
      mods: outcome.mods,
    });
  }

  state.t = Math.max(state.t, tuning.CLOCK.approachEnd);
}

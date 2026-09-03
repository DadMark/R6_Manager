import { clamp } from '../math';
import type { RoundState } from './state';

/**
 * PREP — the drone phase.
 *
 * Attacker intel operators fight defender jammers for information. The result
 * (`info`) is a signed advantage applied to every attacker duel for the rest
 * of the round, and negated for defenders.
 */
export function runPrep(state: RoundState): void {
  const { tuning } = state.content;
  const { atk, def } = state.ctx;

  state.emit({
    kind: 'ROUND_START',
    phase: 'PREP',
    t: 0,
    id: state.nextEventId(),
    site: atk.plan.site,
    siteMatch: state.siteMatch,
  });

  // The site mind-game, resolved before a shot is fired.
  if (state.siteMatch) {
    state.defSetup += tuning.SITE.defSetupOnMatch;
  } else {
    state.atkExec += tuning.SITE.atkExecOnMiss;
    state.defSetup += tuning.SITE.defSetupOnMiss;
  }

  const utilitySum = (units: typeof atk.units, tag: 'intel' | 'intel-denial'): number =>
    units
      .filter((u) => u.alive && state.op(u).roles.includes(tag))
      .reduce((sum, u) => sum + state.op(u).stats.utility / tuning.INFO.utilityDivisor, 0);

  const intelAtk = utilitySum(atk.units, 'intel');
  const denialDef = utilitySum(def.units, 'intel-denial');
  const strategyMod = tuning.INFO.byStrategy[atk.plan.strategy] ?? 0;

  state.info = clamp(
    intelAtk - denialDef + strategyMod + state.rng.range(-1, 1),
    -tuning.INFO.cap,
    tuning.INFO.cap,
  );

  // One drone beat per intel operator, capped at two so PREP stays short.
  const droneOps = atk.units.filter((u) => u.alive && state.op(u).roles.includes('intel')).slice(0, 2);
  const denied = denialDef > intelAtk;

  for (const unit of droneOps) {
    state.emit({
      kind: 'DRONE_INTEL',
      phase: 'PREP',
      t: Math.round(state.t),
      id: state.nextEventId(),
      actorId: unit.opId,
      denied,
      info: Math.round(state.info * 100) / 100,
    });
  }

  // A defensive setup beat, so the defence reads as doing something.
  const anchors = def.units.filter((u) => u.alive && state.op(u).roles.includes('anchor'));
  if (anchors.length > 0) {
    const anchor = state.rng.pick(anchors);
    state.emit({
      kind: 'SETUP',
      phase: 'PREP',
      t: Math.round(state.t),
      id: state.nextEventId(),
      defOpId: anchor.opId,
      note: 'setup',
    });
  }

  state.runCounterRules('PREP');

  // Deny the intel edge outright if the jammers won the drone war.
  if (state.flags.droneDenied) {
    state.info = Math.min(state.info, 0);
  }

  state.t = Math.max(state.t, tuning.CLOCK.prepEnd);
}

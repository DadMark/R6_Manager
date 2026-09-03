import { clamp, sigmoid } from '../math';
import { rating } from '../rating';
import type { Side } from '../types';
import type { RoundState } from './state';

/**
 * POST_PLANT and CLUTCH.
 *
 * Once the bomb is down the roles invert: the defence has to push into held
 * angles to reach the defuser. And when one player is left alone against the
 * field, the `clutch` stat — irrelevant most of the round — takes over.
 */

/**
 * The retake itself is fought out in the EXECUTE loop, which keeps running
 * after the plant with the roles inverted. This phase only resolves utility
 * that fires during a retake — reviving a downed anchor, for instance.
 *
 * Whether the bomb is defused is decided by that fight, not by a separate
 * roll: clearing the site post-plant means the defenders reach the defuser.
 * Rolling for it on top would double-count the same contest.
 */
export function runPostPlant(state: RoundState): void {
  if (!state.planted) return;
  state.runCounterRules('POST_PLANT');
}

/**
 * CLUTCH — one player, alone, against the field.
 *
 * The hero must win every duel in sequence; each additional enemy compounds
 * the isolation. Targets: a 90-clutch operator takes a 1v2 in 20–35% and a
 * 1v3 under 15%.
 */
export function runClutch(state: RoundState): void {
  const atkAlive = state.alive('ATK');
  const defAlive = state.alive('DEF');

  let heroSide: Side;
  if (atkAlive.length === 1 && defAlive.length >= 1) heroSide = 'ATK';
  else if (defAlive.length === 1 && atkAlive.length >= 1) heroSide = 'DEF';
  else return;

  // A 1v1 is just a duel; the clutch narrative needs a real disadvantage.
  const foes = heroSide === 'ATK' ? defAlive : atkAlive;
  if (foes.length < 2) return;

  const { tuning } = state.content;
  const hero = (heroSide === 'ATK' ? atkAlive : defAlive)[0]!;
  const heroOp = state.op(hero);

  state.emit({
    kind: 'CLUTCH_START',
    phase: 'CLUTCH',
    t: Math.round(state.t),
    id: state.nextEventId(),
    heroId: hero.opId,
    heroSide,
    versus: foes.length,
  });

  for (let i = 0; i < foes.length; i++) {
    const foe = foes[i]!;
    if (!foe.alive) continue;

    const delta =
      rating(heroOp, 'CLUTCH', tuning) -
      rating(state.op(foe), 'CLUTCH', tuning) +
      tuning.CLUTCH.statScale * (heroOp.stats.clutch - tuning.CLUTCH.statPivot) +
      tuning.CLUTCH.perExtraFoe * i +
      (heroSide === 'ATK' ? state.info : -state.info) +
      (state.planted ? (heroSide === 'ATK' ? tuning.MOD.postPlant : -tuning.MOD.postPlant) : 0);

    const p = clamp(sigmoid(delta / tuning.DUEL_K), tuning.P_FLOOR, tuning.P_CEIL);
    const heroWon = state.rng.chance(p);

    state.advanceClock(state.rng.int(6, 14));
    state.emit({
      kind: 'CLUTCH_STEP',
      phase: 'CLUTCH',
      t: Math.round(state.t),
      id: state.nextEventId(),
      heroId: hero.opId,
      foeId: foe.opId,
      heroWon,
      probability: Math.round(p * 10000) / 10000,
    });

    if (heroWon) {
      state.kill(foe, hero);
    } else {
      state.kill(hero, foe);
      return;
    }
  }

  state.perOperator[hero.opId]!.clutched = true;
}

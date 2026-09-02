import type { RoundState } from './state';

/**
 * BREACH — the signature beat.
 *
 * All the work happens in the generic counter-rule resolver; this phase only
 * decides when it runs. `HARD_BREACH_VS_ANTI_BREACH` is the rule that makes
 * drafting anti-gadget matter: it roughly doubles the wall-open rate against
 * a reinforced site.
 */
export function runBreach(state: RoundState): void {
  state.runCounterRules('BREACH');
  state.t = Math.max(state.t, state.content.tuning.CLOCK.breachEnd);
}

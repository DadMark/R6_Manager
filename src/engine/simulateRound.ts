import { runApproach } from './phases/approach';
import { runBreach } from './phases/breach';
import { runExecute } from './phases/execute';
import { runClutch, runPostPlant } from './phases/postplant';
import { runPrep } from './phases/prep';
import { RoundState } from './phases/state';
import type { Rng } from './rng';
import type {
  OperatorRoundStats,
  RoundContext,
  RoundEndReason,
  RoundResult,
  Side,
  SimulateRoundInput,
} from './types';

/**
 * Simulate one round, start to finish.
 *
 * The phases run in order and share one accumulating `RoundState`. Each emits
 * events; narration is applied separately by `narrate()` so the simulation
 * stays free of presentation concerns.
 */
export function simulateRound(input: SimulateRoundInput, rng: Rng): RoundResult {
  const { content, ctx } = input;
  const state = new RoundState(content, ctx, rng);
  state.siteMatch = ctx.atk.plan.site === ctx.def.plan.site;

  runPrep(state);
  if (bothSidesAlive(state)) runApproach(state);
  if (bothSidesAlive(state)) runBreach(state);
  if (bothSidesAlive(state)) runExecute(state);
  if (bothSidesAlive(state)) runPostPlant(state);
  if (bothSidesAlive(state)) runClutch(state);

  const { winner, reason } = resolve(state);

  // The defuse is the consequence of clearing the site, not a separate roll —
  // but it still deserves its beat in the commentary.
  if (reason === 'DEFUSED') {
    const survivors = state.alive('DEF');
    if (survivors.length > 0) {
      state.emit({
        kind: 'DEFUSE',
        phase: 'POST_PLANT',
        t: Math.round(state.t),
        id: state.nextEventId(),
        defuserId: state.rng.pick(survivors).opId,
        success: true,
      });
    }
  }

  const mvpId = pickMvp(state.perOperator, winner, ctx);

  state.emit({
    kind: 'ROUND_END',
    phase: 'END',
    t: Math.round(state.t),
    id: state.nextEventId(),
    winner,
    reason,
    mvpId,
  });

  return {
    winner,
    reason,
    events: state.events,
    narration: [],
    survivors: {
      atk: state.alive('ATK').map((u) => u.opId),
      def: state.alive('DEF').map((u) => u.opId),
    },
    planted: state.planted,
    mvpId,
    perOperator: state.perOperator,
  };
}

const bothSidesAlive = (state: RoundState): boolean =>
  state.alive('ATK').length > 0 && state.alive('DEF').length > 0;

/**
 * Who won, and why.
 *
 * Order matters: a defuse beats a wipe, and a plant beats the clock. Getting
 * this wrong is what made the S1 round defender-sided.
 */
function resolve(state: RoundState): { winner: Side; reason: RoundEndReason } {
  const atkAlive = state.alive('ATK').length;
  const defAlive = state.alive('DEF').length;

  if (state.defused) return { winner: 'DEF', reason: 'DEFUSED' };

  if (state.planted) {
    // The defence cleared the site after the plant — with nobody left to hold
    // the defuser, they get it down inside the window. Killing every attacker
    // post-plant has to be a win, or planting is the same as winning.
    if (atkAlive === 0) return { winner: 'DEF', reason: 'DEFUSED' };
    if (defAlive === 0) return { winner: 'ATK', reason: 'ELIMINATION' };
    // Both sides alive when the timer expires: the bomb goes off.
    return { winner: 'ATK', reason: 'DETONATION' };
  }

  if (defAlive === 0 && atkAlive > 0) return { winner: 'ATK', reason: 'ELIMINATION' };
  if (atkAlive === 0) return { winner: 'DEF', reason: 'ELIMINATION' };

  // Nobody planted and the clock ran out: the objective was never threatened.
  return { winner: 'DEF', reason: 'TIME' };
}

function pickMvp(
  perOperator: Record<string, OperatorRoundStats>,
  winner: Side,
  ctx: RoundContext,
): string {
  const winningUnits = winner === 'ATK' ? ctx.atk.units : ctx.def.units;
  let best = winningUnits[0]?.opId ?? '';
  let bestScore = -Infinity;

  for (const u of winningUnits) {
    const s = perOperator[u.opId];
    if (!s) continue;
    const score = s.kills * 2 + (s.opened ? 1 : 0) + (s.clutched ? 3 : 0) + (u.alive ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = u.opId;
    }
  }
  return best;
}

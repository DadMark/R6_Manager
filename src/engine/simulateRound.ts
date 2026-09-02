import { resolveDuel, rollTrade, type DuelModifiers } from './duel';
import { clamp } from './math';
import type { Rng } from './rng';
import type {
  DuelType,
  Operator,
  OperatorInstance,
  OperatorRoundStats,
  RoundEndReason,
  RoundEvent,
  RoundResult,
  RoundSide,
  Side,
  SimulateRoundInput,
} from './types';

/**
 * S1 scope: the EXECUTE phase only.
 *
 * PREP / APPROACH / BREACH / PLANT / POST_PLANT / CLUTCH arrive in slice S3.
 * The signature and the event stream are already the final ones, so adding
 * those phases is additive rather than a rewrite.
 */

let eventCounter = 0;
const nextEventId = (roundKey: string): string => `${roundKey}:e${++eventCounter}`;

/** Reset between rounds so ids stay stable and replayable. */
const resetEventIds = (): void => {
  eventCounter = 0;
};

interface SideView {
  side: RoundSide;
  byId: Map<string, Operator>;
}

const aliveUnits = (s: RoundSide): OperatorInstance[] => s.units.filter((u) => u.alive);

const opOf = (view: SideView, unit: OperatorInstance): Operator => {
  const op = view.byId.get(unit.opId);
  if (!op) throw new Error(`Unknown operator id in lineup: ${unit.opId}`);
  return op;
};

/**
 * Pick the operator each side sends into the next engagement.
 *
 * Attackers lead with their best entry pre-plant and their best shooter after
 * the plant; defenders lead with their steadiest holder. Weighted rather than
 * deterministic so the same lineup does not replay identically every round.
 */
function chooseChampion(
  view: SideView,
  units: OperatorInstance[],
  statKey: 'entry' | 'aim' | 'clutch',
  rng: Rng,
): OperatorInstance {
  return rng.weighted(units, (u) => {
    const op = opOf(view, u);
    // Square the stat so clear specialists genuinely lead, without ever making
    // the choice fully deterministic.
    return (op.stats[statKey] / 10) ** 2;
  });
}

export function simulateRound(input: SimulateRoundInput, rng: Rng): RoundResult {
  const { content, ctx } = input;
  const { tuning } = content;
  resetEventIds();

  const roundKey = `${ctx.matchId}:r${ctx.roundNumber}`;
  const byId = new Map(content.operators.map((op) => [op.id, op]));
  const atk: SideView = { side: ctx.atk, byId };
  const def: SideView = { side: ctx.def, byId };

  const events: RoundEvent[] = [];
  const perOperator: Record<string, OperatorRoundStats> = {};
  for (const u of [...ctx.atk.units, ...ctx.def.units]) {
    perOperator[u.opId] = { kills: 0, deaths: 0, opened: false, clutched: false };
  }

  const siteMatch = ctx.atk.plan.site === ctx.def.plan.site;
  let t = 0;

  events.push({
    kind: 'ROUND_START',
    phase: 'PREP',
    t,
    id: nextEventId(roundKey),
    site: ctx.atk.plan.site,
    siteMatch,
  });

  // The site mind-game. Reading the defence wrong costs the attack tempo;
  // catching them rotating is worth real advantage.
  let atkExec = siteMatch ? 0 : 3;
  let defSetup = siteMatch ? 4 : -2;

  const strategyValue =
    tuning.STRATEGY_MATRIX[ctx.atk.plan.strategy]?.[ctx.def.plan.strategy] ?? 0;

  let firstBlood = true;
  const planted = false;

  // ── EXECUTE ───────────────────────────────────────────────────────────────
  t = 70;
  let engagements = 0;

  while (
    engagements < tuning.ROUND.maxEngagements &&
    aliveUnits(ctx.atk).length > 0 &&
    aliveUnits(ctx.def).length > 0 &&
    t < tuning.ROUND.clockMax
  ) {
    engagements++;

    const atkAlive = aliveUnits(ctx.atk);
    const defAlive = aliveUnits(ctx.def);

    const atkUnit = chooseChampion(atk, atkAlive, planted ? 'aim' : 'entry', rng);
    const defUnit = chooseChampion(def, defAlive, 'aim', rng);
    const atkOp = opOf(atk, atkUnit);
    const defOp = opOf(def, defUnit);

    const duelType: DuelType = planted ? 'ANCHOR' : 'ENTRY';
    const mods: DuelModifiers = {
      numbers: atkAlive.length - defAlive.length,
      strategy: strategyValue,
      exec: atkExec - defSetup,
      morale: ctx.atk.morale - ctx.def.morale,
      planted,
    };

    const outcome = resolveDuel(
      atkOp,
      defOp,
      duelType,
      mods,
      tuning,
      rng,
      atkUnit.hp - defUnit.hp,
    );

    const winnerUnit = outcome.attackerWon ? atkUnit : defUnit;
    const loserUnit = outcome.attackerWon ? defUnit : atkUnit;
    const winnerSide: Side = outcome.attackerWon ? 'ATK' : 'DEF';

    loserUnit.alive = false;
    loserUnit.deaths++;
    winnerUnit.kills++;
    perOperator[loserUnit.opId]!.deaths++;
    perOperator[winnerUnit.opId]!.kills++;
    if (firstBlood) {
      perOperator[winnerUnit.opId]!.opened = true;
      firstBlood = false;
    }

    // Does the side that just lost someone trade the kill back?
    const loserIsAtk = !outcome.attackerWon;
    const loserSide = loserIsAtk ? ctx.atk : ctx.def;
    const loserView = loserIsAtk ? atk : def;
    const winnerSideState = loserIsAtk ? ctx.def : ctx.atk;
    const loserNumbers = aliveUnits(loserSide).length - aliveUnits(winnerSideState).length;

    let traded = false;
    let traderId: string | undefined;
    const loserMates = aliveUnits(loserSide);
    if (loserMates.length > 0 && rollTrade(loserNumbers, loserSide.plan.strategy, tuning, rng)) {
      const trader = chooseChampion(loserView, loserMates, 'aim', rng);
      winnerUnit.alive = false;
      winnerUnit.deaths++;
      trader.kills++;
      perOperator[winnerUnit.opId]!.deaths++;
      perOperator[trader.opId]!.kills++;
      traded = true;
      traderId = trader.opId;
    }

    t += rng.int(tuning.ROUND.engagementSeconds[0], tuning.ROUND.engagementSeconds[1]);

    events.push({
      kind: 'DUEL',
      phase: 'EXECUTE',
      t,
      id: nextEventId(roundKey),
      winnerId: winnerUnit.opId,
      loserId: loserUnit.opId,
      winnerSide,
      traded,
      ...(traderId ? { traderId } : {}),
      mods: outcome.mods,
    });

    // Momentum: winning a fight opens space for the next one.
    if (outcome.attackerWon && !traded) atkExec = clamp(atkExec + 1, -10, 10);
    if (!outcome.attackerWon && !traded) defSetup = clamp(defSetup + 1, -10, 10);
  }

  // ── Resolution ────────────────────────────────────────────────────────────
  const atkSurvivors = aliveUnits(ctx.atk);
  const defSurvivors = aliveUnits(ctx.def);

  let winner: Side;
  let reason: RoundEndReason;
  if (defSurvivors.length === 0 && atkSurvivors.length > 0) {
    winner = 'ATK';
    reason = 'ELIMINATION';
  } else if (atkSurvivors.length === 0 && defSurvivors.length > 0) {
    winner = 'DEF';
    reason = 'ELIMINATION';
  } else if (atkSurvivors.length === 0 && defSurvivors.length === 0) {
    // A trade on the final engagement wipes both sides; without a plant the
    // defenders hold the objective, so the round is theirs.
    winner = 'DEF';
    reason = 'ELIMINATION';
  } else {
    winner = 'DEF';
    reason = 'TIME';
  }

  const mvpId = pickMvp(perOperator, winner, ctx);

  events.push({
    kind: 'ROUND_END',
    phase: 'END',
    t,
    id: nextEventId(roundKey),
    winner,
    reason,
    mvpId,
  });

  return {
    winner,
    reason,
    events,
    narration: [],
    survivors: {
      atk: atkSurvivors.map((u) => u.opId),
      def: defSurvivors.map((u) => u.opId),
    },
    planted,
    mvpId,
    perOperator,
  };
}

function pickMvp(
  perOperator: Record<string, OperatorRoundStats>,
  winner: Side,
  ctx: SimulateRoundInput['ctx'],
): string {
  const winningUnits = winner === 'ATK' ? ctx.atk.units : ctx.def.units;
  let best = winningUnits[0]?.opId ?? '';
  let bestScore = -Infinity;
  for (const u of winningUnits) {
    const s = perOperator[u.opId];
    if (!s) continue;
    const score = s.kills * 2 + (s.opened ? 1 : 0) + (u.alive ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = u.opId;
    }
  }
  return best;
}

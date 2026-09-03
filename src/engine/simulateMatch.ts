import { narrate, type NarrationContext } from './narration/narrate';
import { rngFor } from './rng';
import { simulateRound } from './simulateRound';
import type {
  GameContent,
  GameMap,
  MatchResult,
  Operator,
  OperatorInstance,
  RoundContext,
  RoundPlan,
  RoundResult,
  RoundSide,
  Side,
} from './types';

/**
 * A match: first to `roundsToWin`, with sides swapping at the halfway point.
 *
 * Each round derives its own RNG from (seed, matchIndex, roundIndex, purpose),
 * so a match is fully reproducible and any single round inside it can be
 * re-simulated on its own for debugging.
 */

export interface MatchTeam {
  id: string;
  name: string;
  tag: string;
  /** Full drafted roster; each round's five are chosen from this. */
  roster: string[];
  morale: number;
}

export interface MatchPlanner {
  /**
   * Choose a plan for a team for one round. The caller supplies this so the
   * same match code serves both AI-vs-AI simulation and the interactive game,
   * where the player's plan comes from the UI.
   */
  (args: {
    team: MatchTeam;
    side: Side;
    roundIndex: number;
    map: GameMap;
    opponentLastPlan?: RoundPlan;
    opponentRecentSites: string[];
  }): RoundPlan;
}

export interface SimulateMatchInput {
  content: GameContent;
  matchId: string;
  stage: string;
  seed: string;
  matchIndex: number;
  map: GameMap;
  teamA: MatchTeam;
  teamB: MatchTeam;
  /** First to this many rounds wins. */
  roundsToWin: number;
  /** Which side team A starts on. */
  teamAStartsOn: Side;
  planFor: MatchPlanner;
}

const unitOf = (op: Operator): OperatorInstance => ({
  opId: op.id,
  alive: true,
  hp: (4 - op.speed) as 1 | 2 | 3,
  chipped: false,
  consumed: {},
  kills: 0,
  deaths: 0,
});

/**
 * Build the per-round context for one team.
 *
 * Fresh `OperatorInstance`s every round — carrying them over would leak the
 * previous round's deaths into this one.
 */
function buildSide(
  team: MatchTeam,
  side: Side,
  plan: RoundPlan,
  byId: ReadonlyMap<string, Operator>,
): RoundSide {
  const ops = plan.lineup.map((id) => byId.get(id)).filter((o): o is Operator => o !== undefined);
  return {
    teamId: team.id,
    teamName: team.name,
    teamTag: team.tag,
    side,
    plan,
    units: ops.map(unitOf),
    morale: team.morale,
  };
}

/** Total rounds in a best-of; sides swap at the halfway point. */
export const totalRounds = (roundsToWin: number): number => roundsToWin * 2 - 1;

export function sideForRound(
  startingSide: Side,
  roundIndex: number,
  roundsToWin: number,
): Side {
  const half = Math.ceil(totalRounds(roundsToWin) / 2);
  const swapped = roundIndex >= half;
  if (!swapped) return startingSide;
  return startingSide === 'ATK' ? 'DEF' : 'ATK';
}

export function simulateMatch(input: SimulateMatchInput): MatchResult {
  const { content, matchId, stage, seed, matchIndex, map, teamA, teamB, roundsToWin, planFor } =
    input;

  const byId = new Map(content.operators.map((op) => [op.id, op]));
  const rounds: RoundResult[] = [];
  let scoreA = 0;
  let scoreB = 0;

  let lastPlanA: RoundPlan | undefined;
  let lastPlanB: RoundPlan | undefined;
  const recentSitesA: string[] = [];
  const recentSitesB: string[] = [];

  for (let roundIndex = 0; scoreA < roundsToWin && scoreB < roundsToWin; roundIndex++) {
    const sideA = sideForRound(input.teamAStartsOn, roundIndex, roundsToWin);
    const sideB: Side = sideA === 'ATK' ? 'DEF' : 'ATK';

    const planA = planFor({
      team: teamA,
      side: sideA,
      roundIndex,
      map,
      opponentLastPlan: lastPlanB,
      opponentRecentSites: recentSitesB,
    });
    const planB = planFor({
      team: teamB,
      side: sideB,
      roundIndex,
      map,
      opponentLastPlan: lastPlanA,
      opponentRecentSites: recentSitesA,
    });

    const atkTeam = sideA === 'ATK' ? teamA : teamB;
    const defTeam = sideA === 'ATK' ? teamB : teamA;
    const atkPlan = sideA === 'ATK' ? planA : planB;
    const defPlan = sideA === 'ATK' ? planB : planA;

    const ctx: RoundContext = {
      matchId,
      roundNumber: roundIndex + 1,
      stage,
      scoreAtk: sideA === 'ATK' ? scoreA : scoreB,
      scoreDef: sideA === 'ATK' ? scoreB : scoreA,
      map,
      atk: buildSide(atkTeam, 'ATK', atkPlan, byId),
      def: buildSide(defTeam, 'DEF', defPlan, byId),
      overtime: false,
    };

    const result = simulateRound(
      { content, ctx },
      rngFor(seed, matchIndex, roundIndex, 'sim'),
    );

    const narrationCtx: NarrationContext = {
      operators: byId,
      atk: ctx.atk,
      def: ctx.def,
      siteName: map.sites.find((s) => s.id === atkPlan.site)?.name ?? atkPlan.site,
    };
    result.narration = narrate(
      result.events,
      content.templates,
      narrationCtx,
      rngFor(seed, matchIndex, roundIndex, 'narration'),
    );

    rounds.push(result);

    const winnerIsA = (result.winner === 'ATK') === (sideA === 'ATK');
    if (winnerIsA) scoreA++;
    else scoreB++;

    lastPlanA = planA;
    lastPlanB = planB;
    if (sideA === 'ATK') recentSitesA.push(planA.site);
    else recentSitesB.push(planB.site);
  }

  return {
    matchId,
    stage,
    teamAId: teamA.id,
    teamBId: teamB.id,
    rounds,
    scoreA,
    scoreB,
    winnerId: scoreA > scoreB ? teamA.id : teamB.id,
    mvpId: pickMatchMvp(rounds),
  };
}

/** The operator who showed up most often when it mattered. */
function pickMatchMvp(rounds: readonly RoundResult[]): string {
  const tally = new Map<string, number>();
  for (const round of rounds) {
    for (const [opId, stats] of Object.entries(round.perOperator)) {
      const score =
        stats.kills * 2 + (stats.opened ? 1 : 0) + (stats.clutched ? 3 : 0) + (round.mvpId === opId ? 2 : 0);
      tally.set(opId, (tally.get(opId) ?? 0) + score);
    }
  }

  let best = '';
  let bestScore = -Infinity;
  for (const [opId, score] of tally) {
    if (score > bestScore) {
      bestScore = score;
      best = opId;
    }
  }
  return best;
}

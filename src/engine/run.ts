import { adaptNeeds, pickLineup } from './ai/pickLineup';
import { pickPlan } from './ai/pickPlan';
import { buildAIRoster, draftStep, draftTotalSteps, DEFAULT_DRAFT } from './draft';
import { narrate } from './narration/narrate';
import { rngFor } from './rng';
import { simulateRound } from './simulateRound';
import { sideForRound } from './simulateMatch';
import type {
  CurrentMatch,
  GameContent,
  MatchResult,
  Operator,
  OperatorInstance,
  RoundContext,
  RoundPlan,
  RoundResult,
  RoundSide,
  RunState,
  RunTeam,
  Side,
  StageNode,
} from './types';

/**
 * The run, as a pure state machine.
 *
 * `(state, action, content) => state`. No React, no storage, no clock — the
 * app layer is a thin adapter over this, which means every transition in the
 * game is testable in Node.
 *
 * The state holds only the SEED, never an RNG. Each simulation reconstructs
 * its generator from `rngFor(seed, ...)`, so rehydrating a half-finished run
 * from storage reproduces results exactly.
 */

export type RunAction =
  | { type: 'START_RUN'; seed: string; teamName?: string }
  | { type: 'DRAFT_PICK'; opId: string }
  | { type: 'START_MATCH' }
  | { type: 'SUBMIT_PLAN'; plan: RoundPlan }
  | { type: 'FINISH_PLAYBACK' }
  | { type: 'NEXT_ROUND' }
  | { type: 'NEXT_MATCH' }
  | { type: 'SET_SETTINGS'; settings: Partial<RunState['settings']> }
  | { type: 'RESET' };

export interface RunDeps {
  content: GameContent;
  stages: {
    id: string;
    name: string;
    aiProfileId: string;
    roundsToWin: number;
    rarityBias: string[];
  }[];
  aiTeamNames: { name: string; tag: string }[];
  profileById: (id: string) => import('./ai/difficulty').AIProfile;
}

export function initialRunState(): RunState {
  return {
    schemaVersion: 1,
    seed: '',
    phase: 'MENU',
    player: { id: 'player', name: 'Seu time', tag: 'VOC', roster: [], morale: 50, isAI: false },
    bracket: { stages: [], currentStageIndex: 0 },
    history: [],
    settings: { revealSpeed: 1, autoAdvance: false, debugMath: false },
  };
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

function buildBracket(seed: string, deps: RunDeps): StageNode[] {
  const rng = rngFor(seed, 'bracket');
  const names = [...deps.aiTeamNames];

  return deps.stages.map((stage, i) => {
    const nameIndex = Math.floor(rng.next() * names.length);
    const identity = names.splice(nameIndex, 1)[0] ?? { name: `Time ${i + 1}`, tag: `T${i}` };

    return {
      stageId: stage.id,
      name: stage.name,
      roundsToWin: stage.roundsToWin,
      opponent: {
        id: `ai-${stage.id}`,
        name: identity.name,
        tag: identity.tag,
        roster: buildAIRoster(
          deps.content,
          rngFor(seed, 'ai-roster', stage.id),
          DEFAULT_DRAFT,
          stage.rarityBias,
        ),
        morale: 50,
        isAI: true,
        aiProfileId: stage.aiProfileId,
      },
    };
  });
}

export function runReducer(state: RunState, action: RunAction, deps: RunDeps): RunState {
  switch (action.type) {
    case 'START_RUN': {
      const seed = action.seed.trim() || 'r6m';
      const base = initialRunState();
      return {
        ...base,
        seed,
        phase: 'DRAFT',
        player: {
          ...base.player,
          name: action.teamName?.trim() || base.player.name,
          roster: [],
        },
        draft: draftStep(deps.content, 0, [], rngFor(seed, 'draft', 0)),
        bracket: { stages: buildBracket(seed, deps), currentStageIndex: 0 },
        settings: state.settings,
      };
    }

    case 'DRAFT_PICK': {
      if (state.phase !== 'DRAFT' || !state.draft) return state;
      const roster = [...state.player.roster, action.opId];
      const nextStep = state.draft.step + 1;

      if (nextStep >= draftTotalSteps()) {
        return {
          ...state,
          player: { ...state.player, roster },
          draft: undefined,
          phase: 'BRACKET',
        };
      }

      return {
        ...state,
        player: { ...state.player, roster },
        draft: draftStep(deps.content, nextStep, roster, rngFor(state.seed, 'draft', nextStep)),
      };
    }

    case 'START_MATCH': {
      if (state.phase !== 'BRACKET') return state;
      const stage = state.bracket.stages[state.bracket.currentStageIndex];
      if (!stage) return state;

      const currentMatch: CurrentMatch = {
        matchId: `${state.seed}:m${state.bracket.currentStageIndex}`,
        stageId: stage.stageId,
        opponent: stage.opponent,
        scorePlayer: 0,
        scoreOpponent: 0,
        roundIndex: 0,
        roundsToWin: stage.roundsToWin,
        playerSide: 'ATK',
        playerRecentSites: [],
        opponentRecentSites: [],
      };

      return { ...state, phase: 'ROUND_SETUP', currentMatch };
    }

    case 'SUBMIT_PLAN': {
      if (state.phase !== 'ROUND_SETUP' || !state.currentMatch) return state;
      return playRound(state, action.plan, deps);
    }

    case 'FINISH_PLAYBACK':
      return state.phase === 'ROUND_PLAYBACK' ? { ...state, phase: 'ROUND_RESULT' } : state;

    case 'NEXT_ROUND': {
      const match = state.currentMatch;
      if (state.phase !== 'ROUND_RESULT' || !match) return state;

      const decided = match.scorePlayer >= match.roundsToWin || match.scoreOpponent >= match.roundsToWin;
      if (decided) return finishMatch(state, deps);

      return {
        ...state,
        phase: 'ROUND_SETUP',
        currentMatch: {
          ...match,
          roundIndex: match.roundIndex + 1,
          playerSide: sideForRound('ATK', match.roundIndex + 1, match.roundsToWin),
        },
      };
    }

    case 'NEXT_MATCH': {
      if (state.phase !== 'MATCH_RESULT') return state;
      const nextIndex = state.bracket.currentStageIndex + 1;
      const lastStage = state.bracket.stages[state.bracket.currentStageIndex];

      // Losing ends the run — this is a roguelike, not a league.
      if (lastStage?.result === 'LOST' || nextIndex >= state.bracket.stages.length) {
        return { ...state, phase: 'RUN_END', currentMatch: undefined };
      }

      return {
        ...state,
        phase: 'BRACKET',
        currentMatch: undefined,
        bracket: { ...state.bracket, currentStageIndex: nextIndex },
      };
    }

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'RESET':
      return { ...initialRunState(), settings: state.settings };
  }
}

/** Simulate one round from the player's submitted plan plus the AI's answer. */
function playRound(state: RunState, playerPlan: RoundPlan, deps: RunDeps): RunState {
  const match = state.currentMatch!;
  const { content } = deps;
  const byId = new Map(content.operators.map((op) => [op.id, op]));
  const map = content.maps[0]!;

  const profile = deps.profileById(match.opponent.aiProfileId ?? '');
  const aiSide: Side = match.playerSide === 'ATK' ? 'DEF' : 'ATK';
  const aiRng = rngFor(state.seed, state.bracket.currentStageIndex, match.roundIndex, 'ai');

  const aiRoster = match.opponent.roster
    .map((id) => byId.get(id))
    .filter((o): o is Operator => o !== undefined);

  const playerOperators = playerPlan.lineup
    .map((id) => byId.get(id))
    .filter((o): o is Operator => o !== undefined);

  // The AI reads the player's last round before picking.
  const needs = adaptNeeds(aiSide, profile, match.lastPlayerPlan, playerOperators);
  const aiLineup = pickLineup(aiRoster, aiSide, profile, aiRng, needs);
  const aiPlan = pickPlan(
    {
      side: aiSide,
      lineup: aiLineup,
      map,
      profile,
      tuning: content.tuning,
      ...(match.lastPlayerPlan ? { lastOpponentPlan: match.lastPlayerPlan } : {}),
      recentOpponentSites: match.playerRecentSites,
    },
    aiRng,
  );

  const mkSide = (team: RunTeam, side: Side, plan: RoundPlan): RoundSide => ({
    teamId: team.id,
    teamName: team.name,
    teamTag: team.tag,
    side,
    plan,
    units: plan.lineup
      .map((id) => byId.get(id))
      .filter((o): o is Operator => o !== undefined)
      .map(unitOf),
    morale: team.morale,
    // This is what makes stage difficulty real. It used to live in the AI's
    // pick scoring, where a constant added to every candidate cancelled out
    // and changed nothing at all.
    skillBonus: team.isAI ? profile.skillBias : 0,
  });

  const playerIsAtk = match.playerSide === 'ATK';
  const atk = playerIsAtk
    ? mkSide(state.player, 'ATK', playerPlan)
    : mkSide(match.opponent, 'ATK', aiPlan);
  const def = playerIsAtk
    ? mkSide(match.opponent, 'DEF', aiPlan)
    : mkSide(state.player, 'DEF', playerPlan);

  const ctx: RoundContext = {
    matchId: match.matchId,
    roundNumber: match.roundIndex + 1,
    stage: match.stageId,
    scoreAtk: playerIsAtk ? match.scorePlayer : match.scoreOpponent,
    scoreDef: playerIsAtk ? match.scoreOpponent : match.scorePlayer,
    map,
    atk,
    def,
    overtime: false,
  };

  const result: RoundResult = simulateRound(
    { content, ctx },
    rngFor(state.seed, state.bracket.currentStageIndex, match.roundIndex, 'sim'),
  );

  result.narration = narrate(
    result.events,
    content.templates,
    {
      operators: byId,
      atk,
      def,
      siteName: map.sites.find((s) => s.id === atk.plan.site)?.name ?? atk.plan.site,
    },
    rngFor(state.seed, state.bracket.currentStageIndex, match.roundIndex, 'narration'),
  );

  const playerWon = (result.winner === 'ATK') === playerIsAtk;

  return {
    ...state,
    phase: 'ROUND_PLAYBACK',
    currentMatch: {
      ...match,
      scorePlayer: match.scorePlayer + (playerWon ? 1 : 0),
      scoreOpponent: match.scoreOpponent + (playerWon ? 0 : 1),
      lastResult: result,
      lastPlayerPlan: playerPlan,
      lastOpponentPlan: aiPlan,
      playerRecentSites: [...match.playerRecentSites, playerPlan.site].slice(-3),
      opponentRecentSites: [...match.opponentRecentSites, aiPlan.site].slice(-3),
    },
  };
}

function finishMatch(state: RunState, _deps: RunDeps): RunState {
  const match = state.currentMatch!;
  const won = match.scorePlayer > match.scoreOpponent;

  const stages = state.bracket.stages.map((s, i) =>
    i === state.bracket.currentStageIndex ? { ...s, result: won ? ('WON' as const) : ('LOST' as const) } : s,
  );

  const summary: MatchResult = {
    matchId: match.matchId,
    stage: match.stageId,
    teamAId: state.player.id,
    teamBId: match.opponent.id,
    rounds: [],
    scoreA: match.scorePlayer,
    scoreB: match.scoreOpponent,
    winnerId: won ? state.player.id : match.opponent.id,
    mvpId: match.lastResult?.mvpId ?? '',
  };

  // Winning lifts the squad; losing a decider does not, but the run ends there
  // anyway so it only matters on the way up.
  const morale = Math.max(20, Math.min(80, state.player.morale + (won ? 6 : -8)));

  return {
    ...state,
    phase: 'MATCH_RESULT',
    player: { ...state.player, morale },
    bracket: { ...state.bracket, stages },
    history: [...state.history, summary],
  };
}

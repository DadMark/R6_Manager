import { describe, expect, it } from 'vitest';
import { defaultContent } from '../../content';
import { aiTeamNames, stages } from '../../content/tournament';
import { profileById } from '../ai/difficulty';
import { initialRunState, runReducer, type RunAction, type RunDeps } from '../run';
import type { RoundPlan, RunState, Side } from '../types';

/**
 * End-to-end run tests, driven entirely through the pure reducer.
 *
 * This is the proof that the whole game works before a single React component
 * exists — and it is why the reducer lives in the engine rather than in the
 * app layer.
 */

const deps: RunDeps = {
  content: defaultContent,
  stages,
  aiTeamNames,
  profileById,
};

const dispatch = (state: RunState, action: RunAction): RunState =>
  runReducer(state, action, deps);

/** Pick a legal plan: five drafted operators for the side we are on. */
function autoPlan(state: RunState): RoundPlan {
  const match = state.currentMatch!;
  const side: Side = match.playerSide;
  const byId = new Map(defaultContent.operators.map((o) => [o.id, o]));

  const lineup = state.player.roster
    .map((id) => byId.get(id)!)
    .filter((op) => op.side === side)
    .slice(0, 5)
    .map((op) => op.id);

  return {
    lineup,
    site: defaultContent.maps[0]!.sites[0]!.id,
    strategy: side === 'ATK' ? 'DEFAULT' : 'SPREAD',
  };
}

/** Play a complete run from menu to end, always taking the first offer. */
function playRun(seed: string): { state: RunState; rounds: number } {
  let state = dispatch(initialRunState(), { type: 'START_RUN', seed });

  while (state.phase === 'DRAFT') {
    state = dispatch(state, { type: 'DRAFT_PICK', opId: state.draft!.offer[0]! });
  }

  let rounds = 0;
  let guard = 0;

  while (state.phase !== 'RUN_END' && guard++ < 200) {
    switch (state.phase) {
      case 'BRACKET':
        state = dispatch(state, { type: 'START_MATCH' });
        break;
      case 'ROUND_SETUP':
        state = dispatch(state, { type: 'SUBMIT_PLAN', plan: autoPlan(state) });
        break;
      case 'ROUND_PLAYBACK':
        rounds++;
        state = dispatch(state, { type: 'FINISH_PLAYBACK' });
        break;
      case 'ROUND_RESULT':
        state = dispatch(state, { type: 'NEXT_ROUND' });
        break;
      case 'MATCH_RESULT':
        state = dispatch(state, { type: 'NEXT_MATCH' });
        break;
      default:
        throw new Error(`unexpected phase ${state.phase}`);
    }
  }

  expect(guard).toBeLessThan(200);
  return { state, rounds };
}

describe('run state machine', () => {
  it('drafts a full roster with both sides covered', () => {
    let state = dispatch(initialRunState(), { type: 'START_RUN', seed: 'draft-test' });
    expect(state.phase).toBe('DRAFT');

    const sidesSeen: Side[] = [];
    while (state.phase === 'DRAFT') {
      sidesSeen.push(state.draft!.side);
      expect(state.draft!.offer.length).toBeGreaterThan(0);
      state = dispatch(state, { type: 'DRAFT_PICK', opId: state.draft!.offer[0]! });
    }

    const byId = new Map(defaultContent.operators.map((o) => [o.id, o]));
    const roster = state.player.roster.map((id) => byId.get(id)!);

    expect(state.phase).toBe('BRACKET');
    expect(roster).toHaveLength(8);
    expect(roster.filter((o) => o.side === 'ATK')).toHaveLength(4);
    expect(roster.filter((o) => o.side === 'DEF')).toHaveLength(4);
    expect(new Set(state.player.roster).size).toBe(8); // no duplicates
    expect(sidesSeen).toContain('ATK');
    expect(sidesSeen).toContain('DEF');
  });

  it('builds a full bracket with distinct opponents', () => {
    const state = dispatch(initialRunState(), { type: 'START_RUN', seed: 'bracket-test' });
    const { stages: nodes } = state.bracket;

    expect(nodes).toHaveLength(stages.length);
    expect(new Set(nodes.map((n) => n.opponent.name)).size).toBe(nodes.length);
    for (const node of nodes) {
      expect(node.opponent.roster.length).toBe(8);
      expect(node.opponent.isAI).toBe(true);
    }
  });

  it('plays a complete run to a conclusion', () => {
    const { state, rounds } = playRun('full-run');

    expect(state.phase).toBe('RUN_END');
    expect(rounds).toBeGreaterThan(0);
    expect(state.history.length).toBeGreaterThan(0);

    // Either the player was eliminated, or they cleared every stage.
    const lost = state.bracket.stages.some((s) => s.result === 'LOST');
    const wonAll = state.bracket.stages.every((s) => s.result === 'WON');
    expect(lost || wonAll).toBe(true);
  });

  it('every round produces narration', () => {
    let state = dispatch(initialRunState(), { type: 'START_RUN', seed: 'narr-run' });
    while (state.phase === 'DRAFT') {
      state = dispatch(state, { type: 'DRAFT_PICK', opId: state.draft!.offer[0]! });
    }
    state = dispatch(state, { type: 'START_MATCH' });
    state = dispatch(state, { type: 'SUBMIT_PLAN', plan: autoPlan(state) });

    const result = state.currentMatch!.lastResult!;
    expect(state.phase).toBe('ROUND_PLAYBACK');
    expect(result.narration.length).toBeGreaterThanOrEqual(4);
    for (const line of result.narration) {
      expect(line.text).not.toMatch(/\{\w+\}/);
      expect(line.text.length).toBeGreaterThan(0);
    }
  });

  it('is fully reproducible from the seed', () => {
    const a = playRun('repro');
    const b = playRun('repro');

    expect(a.rounds).toBe(b.rounds);
    expect(a.state.bracket.stages.map((s) => s.result)).toEqual(
      b.state.bracket.stages.map((s) => s.result),
    );
    expect(a.state.player.roster).toEqual(b.state.player.roster);
  });

  it('different seeds diverge', () => {
    const results = ['s1', 's2', 's3', 's4'].map((s) => playRun(s));
    const signatures = new Set(
      results.map((r) => JSON.stringify([r.state.player.roster, r.state.bracket.stages.map((s) => s.result)])),
    );
    expect(signatures.size).toBeGreaterThan(1);
  });

  it('sides swap partway through a match', () => {
    let state = dispatch(initialRunState(), { type: 'START_RUN', seed: 'swap' });
    while (state.phase === 'DRAFT') {
      state = dispatch(state, { type: 'DRAFT_PICK', opId: state.draft!.offer[0]! });
    }
    state = dispatch(state, { type: 'START_MATCH' });

    const sides: Side[] = [];
    let guard = 0;
    while (state.currentMatch && state.phase !== 'MATCH_RESULT' && guard++ < 20) {
      if (state.phase === 'ROUND_SETUP') {
        sides.push(state.currentMatch.playerSide);
        state = dispatch(state, { type: 'SUBMIT_PLAN', plan: autoPlan(state) });
      } else if (state.phase === 'ROUND_PLAYBACK') {
        state = dispatch(state, { type: 'FINISH_PLAYBACK' });
      } else if (state.phase === 'ROUND_RESULT') {
        state = dispatch(state, { type: 'NEXT_ROUND' });
      } else break;
    }

    // A best-of-3 that goes the distance must include both sides.
    if (sides.length >= 3) expect(new Set(sides).size).toBe(2);
    expect(sides[0]).toBe('ATK');
  });

  it('losing a match ends the run', () => {
    let state = dispatch(initialRunState(), { type: 'START_RUN', seed: 'loss' });
    while (state.phase === 'DRAFT') {
      state = dispatch(state, { type: 'DRAFT_PICK', opId: state.draft!.offer[0]! });
    }

    let guard = 0;
    while (state.phase !== 'RUN_END' && guard++ < 200) {
      if (state.phase === 'MATCH_RESULT') {
        const stage = state.bracket.stages[state.bracket.currentStageIndex]!;
        const next = dispatch(state, { type: 'NEXT_MATCH' });
        if (stage.result === 'LOST') {
          expect(next.phase).toBe('RUN_END');
          return;
        }
        state = next;
      } else if (state.phase === 'BRACKET') state = dispatch(state, { type: 'START_MATCH' });
      else if (state.phase === 'ROUND_SETUP')
        state = dispatch(state, { type: 'SUBMIT_PLAN', plan: autoPlan(state) });
      else if (state.phase === 'ROUND_PLAYBACK') state = dispatch(state, { type: 'FINISH_PLAYBACK' });
      else if (state.phase === 'ROUND_RESULT') state = dispatch(state, { type: 'NEXT_ROUND' });
      else break;
    }

    // Reaching RUN_END without a loss means the player cleared the bracket.
    expect(state.phase).toBe('RUN_END');
  });
});

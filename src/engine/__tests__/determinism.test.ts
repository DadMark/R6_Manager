import { describe, expect, it } from 'vitest';
import { defaultContent } from '../../content';
import { narrate } from '../narration/narrate';
import { rngFor } from '../rng';
import { simulateRound } from '../simulateRound';
import { buildRoundContext } from './helpers';

/**
 * Determinism is the load-bearing property of the whole design: it is what
 * makes a run shareable by seed, replayable for debugging, and safe to
 * re-simulate after rehydrating from localStorage.
 */
describe('determinism', () => {
  it('produces identical results for the same seed', () => {
    const a = simulateRound(
      { content: defaultContent, ctx: buildRoundContext('seed-a') },
      rngFor('seed-a', 0, 1, 'sim'),
    );
    const b = simulateRound(
      { content: defaultContent, ctx: buildRoundContext('seed-a') },
      rngFor('seed-a', 0, 1, 'sim'),
    );

    expect(a.winner).toBe(b.winner);
    expect(a.reason).toBe(b.reason);
    expect(a.mvpId).toBe(b.mvpId);
    expect(a.events).toEqual(b.events);
  });

  it('produces different results for different seeds', () => {
    const results = ['s1', 's2', 's3', 's4', 's5', 's6'].map((seed) =>
      simulateRound(
        { content: defaultContent, ctx: buildRoundContext(seed) },
        rngFor(seed, 0, 1, 'sim'),
      ),
    );
    const transcripts = new Set(results.map((r) => JSON.stringify(r.events)));
    expect(transcripts.size).toBeGreaterThan(1);
  });

  it('narrates deterministically for the same seed', () => {
    const ctx = buildRoundContext('narr');
    const result = simulateRound(
      { content: defaultContent, ctx },
      rngFor('narr', 0, 1, 'sim'),
    );
    const operators = new Map(defaultContent.operators.map((o) => [o.id, o]));
    const args = [
      result.events,
      defaultContent.templates,
      { operators, atk: ctx.atk, def: ctx.def, siteName: 'Porão' },
    ] as const;

    const first = narrate(...args, rngFor('narr', 0, 1, 'narration'));
    const second = narrate(...args, rngFor('narr', 0, 1, 'narration'));
    expect(first).toEqual(second);
  });

  it('does not mutate the content bundle it is handed', () => {
    const snapshot = JSON.stringify(defaultContent);
    simulateRound(
      { content: defaultContent, ctx: buildRoundContext('immutable') },
      rngFor('immutable', 0, 1, 'sim'),
    );
    expect(JSON.stringify(defaultContent)).toBe(snapshot);
  });
});

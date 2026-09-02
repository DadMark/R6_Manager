import { describe, expect, it } from 'vitest';
import { defaultContent } from '../../content';
import { narrate, UNRESOLVED } from '../narration/narrate';
import { rngFor } from '../rng';
import { simulateRound } from '../simulateRound';
import { buildRoundContext } from './helpers';
import type { NarrationLine } from '../types';

/**
 * Narration QA.
 *
 * The narration IS the game here — a player reads it rather than watching it.
 * These checks guard the two ways commentary dies: unfilled slots (which look
 * like bugs) and repetition (which makes it feel mechanical).
 */

function narrateSeed(seed: string): NarrationLine[] {
  const ctx = buildRoundContext(seed);
  const result = simulateRound({ content: defaultContent, ctx }, rngFor(seed, 0, 1, 'sim'));
  const operators = new Map(defaultContent.operators.map((o) => [o.id, o]));
  return narrate(
    result.events,
    defaultContent.templates,
    { operators, atk: ctx.atk, def: ctx.def, siteName: 'Porão' },
    rngFor(seed, 0, 1, 'narration'),
  );
}

const sample = (n: number): NarrationLine[] =>
  Array.from({ length: n }, (_, i) => narrateSeed(`narr-${i}`)).flat();

describe('narration quality', () => {
  it('gives every event kind at least three variants', () => {
    for (const [key, variants] of Object.entries(defaultContent.templates)) {
      expect(variants.length, `"${key}" has only ${variants.length} variant(s)`).toBeGreaterThanOrEqual(3);
    }
  });

  it('leaves no unfilled slots', () => {
    for (const line of sample(120)) {
      expect(line.text, `unfilled slot in: ${line.text}`).not.toMatch(/\{\w+\}/);
    }
  });

  it('never emits a placeholder name', () => {
    // The sentinel means a slot resolved against a missing operator id. Note
    // that a plain em-dash is legitimate punctuation in these templates, which
    // is exactly why UNRESOLVED is a distinct marker.
    for (const line of sample(120)) {
      expect(line.text, `unresolved operator in: ${line.text}`).not.toContain(UNRESOLVED);
    }
  });

  it('keeps lines short enough to read at speed', () => {
    for (const line of sample(120)) {
      expect(line.text.length, `too long: ${line.text}`).toBeLessThanOrEqual(160);
    }
  });

  it('produces a readable number of lines per round', () => {
    for (let i = 0; i < 60; i++) {
      const lines = narrateSeed(`len-${i}`);
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(20);
    }
  });

  it('does not lean on one template for any event kind', () => {
    const byKey = new Map<string, Map<string, number>>();
    for (const line of sample(200)) {
      const key = line.templateId.split('#')[0]!;
      const counts = byKey.get(key) ?? new Map<string, number>();
      counts.set(line.templateId, (counts.get(line.templateId) ?? 0) + 1);
      byKey.set(key, counts);
    }

    for (const [key, counts] of byKey) {
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      if (total < 20) continue; // too few samples to judge
      const topShare = Math.max(...counts.values()) / total;
      expect(topShare, `"${key}" leans on one variant ${(topShare * 100).toFixed(0)}% of the time`).toBeLessThan(
        0.55,
      );
    }
  });

  it('always opens with the round start and closes with the result', () => {
    const lines = narrateSeed('bookend');
    expect(lines[0]?.templateId.startsWith('round_start.')).toBe(true);
    expect(lines.at(-1)?.templateId.startsWith('round_end.')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { defaultContent } from '../../content';
import { rngFor } from '../rng';
import { simulateRound } from '../simulateRound';
import { buildRoundContext, lineupFor, type RoundOptions } from './helpers';
import type { AtkStrategy, DefStrategy } from '../types';

/**
 * Balance invariants.
 *
 * These are statistical but NOT flaky: every run walks a fixed seed sequence,
 * so a failure is a real regression rather than noise. They are the assertions
 * that catch a game that runs fine and plays badly.
 *
 * Scope note: slice S1 simulates the EXECUTE phase only. The utility-matrix
 * invariants (hard-breach with/without anti-gadget) arrive with S3.
 */

const N = 4000;

interface Tally {
  atkWins: number;
  total: number;
  eventCounts: number[];
  firstBloodWins: number;
  firstBloodRounds: number;
}

function simulateMany(n: number, prefix: string, options: RoundOptions = {}): Tally {
  const tally: Tally = {
    atkWins: 0,
    total: 0,
    eventCounts: [],
    firstBloodWins: 0,
    firstBloodRounds: 0,
  };

  for (let i = 0; i < n; i++) {
    const seed = `${prefix}-${i}`;
    const ctx = buildRoundContext(seed, options);
    const result = simulateRound({ content: defaultContent, ctx }, rngFor(seed, 0, 1, 'sim'));

    tally.total++;
    if (result.winner === 'ATK') tally.atkWins++;
    tally.eventCounts.push(result.events.length);

    // Did the side that drew first blood go on to win?
    const opener = Object.entries(result.perOperator).find(([, s]) => s.opened);
    if (opener) {
      const openerIsAtk = ctx.atk.units.some((u) => u.opId === opener[0]);
      tally.firstBloodRounds++;
      if ((openerIsAtk && result.winner === 'ATK') || (!openerIsAtk && result.winner === 'DEF')) {
        tally.firstBloodWins++;
      }
    }
  }

  return tally;
}

const rate = (t: Tally): number => t.atkWins / t.total;

const percentile = (xs: number[], p: number): number => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
};

describe('balance invariants', () => {
  it('mirror lineups on the same site produce a roughly even round', () => {
    // Same operators on both sides is impossible (rosters are side-specific),
    // so this measures the systemic attacker/defender tilt with neutral plans.
    const t = simulateMany(N, 'mirror', {
      atkStrategy: 'DEFAULT',
      defStrategy: 'SPREAD',
      atkSite: 'porao',
      defSite: 'porao',
    });
    expect(rate(t)).toBeGreaterThan(0.42);
    expect(rate(t)).toBeLessThan(0.62);
  });

  /**
   * The signature interaction, and the reason the draft matters: bringing
   * anti-gadget against a reinforced site has to visibly change the round.
   * If this stops holding, the utility counter-matrix has become decoration.
   */
  it('bringing anti-gadget against anti-breach visibly changes the round', () => {
    const ops = defaultContent.operators;
    const hardBreach = ops.find((o) => o.roles.includes('hard-breach'))!;
    const antiGadget = ops.find((o) => o.side === 'ATK' && o.roles.includes('anti-gadget'))!;
    const filler = ops.filter(
      (o) => o.side === 'ATK' && !o.roles.includes('hard-breach') && !o.roles.includes('anti-gadget'),
    );
    const antiBreach = ops.find((o) => o.roles.includes('anti-breach'))!;
    const defFiller = ops.filter((o) => o.side === 'DEF' && !o.roles.includes('anti-breach'));

    const defence = [antiBreach, ...defFiller.slice(0, 4)];
    const setup = { defOps: defence, atkSite: 'porao', defSite: 'porao' };

    const without = rate(
      simulateMany(N, 'no-trump', { ...setup, atkOps: [hardBreach, ...filler.slice(0, 4)] }),
    );
    const with_ = rate(
      simulateMany(N, 'with-trump', {
        ...setup,
        atkOps: [hardBreach, antiGadget, ...filler.slice(0, 3)],
      }),
    );

    const edge = with_ - without;
    expect(
      edge,
      `anti-gadget was worth only ${(edge * 100).toFixed(1)}pp — the counter-matrix is decoration`,
    ).toBeGreaterThan(0.03);
    // And it must not be an auto-win, or it becomes a mandatory pick.
    expect(with_).toBeLessThan(0.8);
  });

  it('the plant happens often enough to matter, without being automatic', () => {
    let planted = 0;
    for (let i = 0; i < N; i++) {
      const seed = `plant-${i}`;
      const result = simulateRound(
        { content: defaultContent, ctx: buildRoundContext(seed) },
        rngFor(seed, 0, 1, 'sim'),
      );
      if (result.planted) planted++;
    }
    const plantRate = planted / N;
    expect(plantRate).toBeGreaterThan(0.2);
    expect(plantRate).toBeLessThan(0.8);
  });

  it('no attack strategy beats every defensive answer', () => {
    const atkStrategies: AtkStrategy[] = ['RUSH', 'DEFAULT', 'SPLIT'];
    const defStrategies: DefStrategy[] = ['AGGRESSIVE_ROAM', 'ANCHOR_HOLD', 'SPREAD'];

    for (const atkStrategy of atkStrategies) {
      const rates = defStrategies.map((defStrategy) =>
        rate(
          simulateMany(1200, `${atkStrategy}-${defStrategy}`, {
            atkStrategy,
            defStrategy,
            atkSite: 'porao',
            defSite: 'porao',
          }),
        ),
      );

      // No single cell may be a blowout...
      for (const r of rates) {
        expect(r, `${atkStrategy} won ${(r * 100).toFixed(1)}% in one matchup`).toBeLessThan(0.65);
      }
      // ...and every attack plan must have at least one answer that holds it
      // under an even split.
      expect(
        Math.min(...rates),
        `${atkStrategy} has no losing matchup`,
      ).toBeLessThan(0.52);
    }
  });

  it('attacking an undefended site is worth real advantage, but is not a free round', () => {
    const matched = rate(
      simulateMany(N, 'site-match', { atkSite: 'porao', defSite: 'porao' }),
    );
    const mismatched = rate(
      simulateMany(N, 'site-miss', { atkSite: 'porao', defSite: 'biblioteca' }),
    );

    const edge = mismatched - matched;
    // The site pick must be a real decision, not theatre...
    expect(edge, `site mismatch edge was only ${(edge * 100).toFixed(1)}pp`).toBeGreaterThan(0.02);
    // ...and must not decide the round on its own.
    expect(edge).toBeLessThan(0.25);
  });

  it('first blood matters without deciding the round', () => {
    const t = simulateMany(N, 'snowball');
    const conversion = t.firstBloodWins / t.firstBloodRounds;
    expect(conversion).toBeGreaterThan(0.55);
    expect(
      conversion,
      `first blood converted ${(conversion * 100).toFixed(1)}% — rounds are snowballing`,
    ).toBeLessThan(0.9);
  });

  it('rounds stay a readable length', () => {
    const t = simulateMany(N, 'length');
    const median = percentile(t.eventCounts, 0.5);
    expect(median).toBeGreaterThanOrEqual(3);
    expect(percentile(t.eventCounts, 0.95)).toBeLessThan(20);
  });

  it('a strong lineup beats a weak one without being unbeatable', () => {
    const byAim = [...defaultContent.operators].sort((a, b) => b.stats.aim - a.stats.aim);
    const bestAtk = byAim.filter((o) => o.side === 'ATK').slice(0, 5);
    const worstDef = [...byAim].reverse().filter((o) => o.side === 'DEF').slice(0, 5);

    const stacked = rate(
      simulateMany(N, 'stacked', { atkOps: bestAtk, defOps: worstDef }),
    );
    expect(stacked).toBeGreaterThan(0.55);
    // Even the worst lineup must be able to steal rounds, or losing feels
    // scripted rather than hard.
    expect(stacked, 'the weak side never wins — no upsets possible').toBeLessThan(0.95);
  });

  it('every operator lineup draw produces a valid round', () => {
    for (let i = 0; i < 200; i++) {
      const seed = `valid-${i}`;
      const ctx = buildRoundContext(seed, {
        atkOps: lineupFor('ATK', seed),
        defOps: lineupFor('DEF', seed),
      });
      const result = simulateRound({ content: defaultContent, ctx }, rngFor(seed, 0, 1, 'sim'));
      expect(['ATK', 'DEF']).toContain(result.winner);
      expect(result.mvpId).toBeTruthy();
      expect(result.events.at(-1)?.kind).toBe('ROUND_END');
    }
  });
});

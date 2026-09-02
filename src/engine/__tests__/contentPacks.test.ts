import { describe, expect, it } from 'vitest';
import { attackOperators, defenseOperators } from '../../content';
import { genericAttackOperators, genericDefenseOperators } from '../../content/operators.generic';
import type { Operator } from '../types';

/**
 * The IP-free pack must be a pure reskin.
 *
 * Every stat, tag, gadget behaviour and draft weight has to match position for
 * position, so the whole balance pass holds for both packs and a public build
 * plays exactly like a local one. If these drift, `npm run balance` is only
 * measuring one of the two games we ship.
 *
 * Regenerate with: npx tsx scripts/gen-generic-pack.ts > src/content/operators.generic.ts
 */
const mechanics = (op: Operator) => ({
  side: op.side,
  speed: op.speed,
  roles: op.roles,
  stats: op.stats,
  rarity: op.rarity,
  draftWeight: op.draftWeight,
  gadgetTags: op.gadget.tags,
  gadgetCounters: op.gadget.counters,
  gadgetPower: op.gadget.power,
});

describe('content packs', () => {
  it.each([
    ['attack', attackOperators, genericAttackOperators],
    ['defense', defenseOperators, genericDefenseOperators],
  ])('the generic %s pack is mechanically identical', (_label, licensed, generic) => {
    expect(generic).toHaveLength(licensed.length);
    for (let i = 0; i < licensed.length; i++) {
      expect(mechanics(generic[i]!), `mismatch at index ${i}`).toEqual(mechanics(licensed[i]!));
    }
  });

  it('shares no names, units, gadget names or ids with the licensed pack', () => {
    const licensed = [...attackOperators, ...defenseOperators];
    const generic = [...genericAttackOperators, ...genericDefenseOperators];

    const licensedStrings = new Set(
      licensed.flatMap((o) => [o.id, o.name, o.unit, o.gadget.name]),
    );

    for (const op of generic) {
      for (const value of [op.id, op.name, op.unit, op.gadget.name]) {
        expect(licensedStrings.has(value), `"${value}" leaks from the licensed pack`).toBe(false);
      }
    }
  });

  it('has unique ids within itself', () => {
    const generic = [...genericAttackOperators, ...genericDefenseOperators];
    expect(new Set(generic.map((o) => o.id)).size).toBe(generic.length);
  });
});

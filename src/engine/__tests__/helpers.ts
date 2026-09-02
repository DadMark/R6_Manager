import { defaultContent } from '../../content';
import { rngFor } from '../rng';
import type {
  AtkStrategy,
  DefStrategy,
  Operator,
  OperatorInstance,
  RoundContext,
  RoundSide,
  Side,
} from '../types';

/** Shared fixtures so the test suites agree on what a round looks like. */

export const unitOf = (op: Operator): OperatorInstance => ({
  opId: op.id,
  alive: true,
  hp: (4 - op.speed) as 1 | 2 | 3,
  chipped: false,
  consumed: {},
  kills: 0,
  deaths: 0,
});

export function lineupFor(side: Side, seed: string, n = 5): Operator[] {
  const rng = rngFor(seed, 'lineup', side);
  const pool = defaultContent.operators.filter((o) => o.side === side);
  const chosen: Operator[] = [];
  while (chosen.length < n && chosen.length < pool.length) {
    const candidate = rng.pick(pool);
    if (!chosen.some((c) => c.id === candidate.id)) chosen.push(candidate);
  }
  return chosen;
}

export interface RoundOptions {
  atkStrategy?: AtkStrategy;
  defStrategy?: DefStrategy;
  atkSite?: string;
  defSite?: string;
  atkOps?: Operator[];
  defOps?: Operator[];
}

export function buildRoundContext(seed: string, options: RoundOptions = {}): RoundContext {
  const map = defaultContent.maps[0]!;
  const atkOps = options.atkOps ?? lineupFor('ATK', seed);
  const defOps = options.defOps ?? lineupFor('DEF', seed);
  const atkSite = options.atkSite ?? map.sites[0]!.id;
  const defSite = options.defSite ?? map.sites[0]!.id;

  const atk: RoundSide = {
    teamId: 'a',
    teamName: 'Time A',
    teamTag: 'AAA',
    side: 'ATK',
    plan: {
      lineup: atkOps.map((o) => o.id),
      site: atkSite,
      strategy: options.atkStrategy ?? 'DEFAULT',
    },
    units: atkOps.map(unitOf),
    morale: 50,
  };

  const def: RoundSide = {
    teamId: 'b',
    teamName: 'Time B',
    teamTag: 'BBB',
    side: 'DEF',
    plan: {
      lineup: defOps.map((o) => o.id),
      site: defSite,
      strategy: options.defStrategy ?? 'SPREAD',
    },
    units: defOps.map(unitOf),
    morale: 50,
  };

  return {
    matchId: `${seed}:m0`,
    roundNumber: 1,
    stage: 'test',
    scoreAtk: 0,
    scoreDef: 0,
    map,
    atk,
    def,
    overtime: false,
  };
}

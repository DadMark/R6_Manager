/**
 * Narrate one round to stdout.
 *
 *   npx tsx scripts/sim.ts --seed teste-1
 *   npm run sim -- --seed teste-1 --debug
 *
 * This is the slice-S1 artifact: it proves the core loop end to end before any
 * UI exists, and the balance harness in S8 is just this script in a loop.
 */
import { narrate, rngFor, simulateRound } from '../src/engine';
import type {
  GameMap,
  Operator,
  OperatorInstance,
  RoundContext,
  RoundSide,
  Side,
  Strategy,
} from '../src/engine/types';
import { defaultContent } from '../src/content';

// ── args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  if (i !== -1 && args[i + 1] && !args[i + 1]!.startsWith('--')) return args[i + 1];
  return fallback;
};
const has = (name: string): boolean => args.includes(`--${name}`);

const seed = flag('seed', 'teste-1')!;
const showDebug = has('debug');

// ── build two teams from the roster ─────────────────────────────────────────

const content = defaultContent;
const pickRng = rngFor(seed, 'lineups');

const unit = (op: Operator): OperatorInstance => ({
  opId: op.id,
  alive: true,
  hp: (4 - op.speed) as 1 | 2 | 3,
  chipped: false,
  consumed: {},
  kills: 0,
  deaths: 0,
});

/** Draw `n` distinct operators from one side of the roster. */
function drawLineup(side: Side, n: number): Operator[] {
  const pool = content.operators.filter((o) => o.side === side);
  const chosen: Operator[] = [];
  while (chosen.length < n && chosen.length < pool.length) {
    const candidate = pickRng.pick(pool);
    if (!chosen.some((c) => c.id === candidate.id)) chosen.push(candidate);
  }
  return chosen;
}

const map: GameMap = content.maps[0]!;
const atkOps = drawLineup('ATK', 5);
const defOps = drawLineup('DEF', 5);

const atkStrategy = pickRng.pick(content.strategies.atk).id as Strategy;
const defStrategy = pickRng.pick(content.strategies.def).id as Strategy;
const atkSite = pickRng.pick(map.sites).id;
const defSite = pickRng.pick(map.sites).id;

const atk: RoundSide = {
  teamId: 'player',
  teamName: 'Fúria',
  teamTag: 'FUR',
  side: 'ATK',
  plan: { lineup: atkOps.map((o) => o.id), site: atkSite, strategy: atkStrategy },
  units: atkOps.map(unit),
  morale: 50,
};

const def: RoundSide = {
  teamId: 'ai',
  teamName: 'Corvos',
  teamTag: 'CRV',
  side: 'DEF',
  plan: { lineup: defOps.map((o) => o.id), site: defSite, strategy: defStrategy },
  units: defOps.map(unit),
  morale: 50,
};

const ctx: RoundContext = {
  matchId: `${seed}:m0`,
  roundNumber: 1,
  stage: 'grupo-1',
  scoreAtk: 0,
  scoreDef: 0,
  map,
  atk,
  def,
  overtime: false,
};

// ── simulate ────────────────────────────────────────────────────────────────

const simRng = rngFor(seed, 0, 1, 'sim');
const result = simulateRound({ content, ctx }, simRng);

const narrationRng = rngFor(seed, 0, 1, 'narration');
const operators = new Map(content.operators.map((o) => [o.id, o]));
const siteName = map.sites.find((s) => s.id === atk.plan.site)?.name ?? atk.plan.site;
const lines = narrate(result.events, content.templates, { operators, atk, def, siteName }, narrationRng);

// ── print ───────────────────────────────────────────────────────────────────

const name = (id: string): string => operators.get(id)?.name ?? id;
const strategyName = (id: string): string =>
  [...content.strategies.atk, ...content.strategies.def].find((s) => s.id === id)?.name ?? id;

const bar = '─'.repeat(72);

console.log(`\n${bar}`);
console.log(`  ${atk.teamName} (ataque)  vs  ${def.teamName} (defesa)`);
console.log(`  Mapa: ${map.name}   Seed: ${seed}`);
console.log(bar);
console.log(`  ${atk.teamName}: ${atkOps.map((o) => o.name).join(', ')}`);
console.log(`     └ ${strategyName(atkStrategy)} → ${siteName}`);
console.log(`  ${def.teamName}: ${defOps.map((o) => o.name).join(', ')}`);
console.log(
  `     └ ${strategyName(defStrategy)} @ ${map.sites.find((s) => s.id === defSite)?.name ?? defSite}`,
);
console.log(`${bar}\n`);

for (const line of lines) {
  const marker = line.tone === 'hype' ? '»' : line.tone === 'tense' ? '!' : ' ';
  console.log(` ${marker} ${line.text}`);
  if (showDebug) {
    const event = result.events.find((e) => e.id === line.eventId);
    if (event && 'mods' in event) {
      const m = event.mods;
      console.log(
        `     [base ${m.base} | num ${m.numbers} | strat ${m.strategy} | exec ${m.exec} ` +
          `| hp ${m.health} → total ${m.total} → p=${m.probability} roll=${m.roll}]`,
      );
    }
  }
}

const winnerName = result.winner === 'ATK' ? atk.teamName : def.teamName;
console.log(`\n${bar}`);
console.log(`  Vencedor: ${winnerName}  (${result.reason})   MVP: ${name(result.mvpId)}`);
console.log(
  `  Sobreviventes — ${atk.teamName}: ${result.survivors.atk.length} | ` +
    `${def.teamName}: ${result.survivors.def.length}`,
);
console.log(`  ${lines.length} linhas de narração, ${result.events.length} eventos`);
console.log(`${bar}\n`);

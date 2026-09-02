/**
 * Mass-simulation balance harness.
 *
 *   npm run balance              # print the full report
 *   npm run balance -- --n 8000  # more samples per cell
 *   npm run balance:assert       # exit non-zero if an invariant is violated
 *
 * Every figure walks a FIXED seed sequence, so results are reproducible and a
 * change in the numbers means a real change in the game — never noise.
 */
import { defaultContent } from '../src/content';
import { rngFor } from '../src/engine/rng';
import { simulateRound } from '../src/engine/simulateRound';
import type {
  AtkStrategy,
  DefStrategy,
  GameMap,
  Operator,
  OperatorInstance,
  RoundContext,
  RoundEndReason,
  RoundSide,
  Side,
  Strategy,
} from '../src/engine/types';

const args = process.argv.slice(2);
const flagValue = (name: string, fallback: number): number => {
  const i = args.indexOf(`--${name}`);
  const raw = i !== -1 ? args[i + 1] : undefined;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};
const N = flagValue('n', 4000);
const ASSERT = args.includes('--assert');

const content = defaultContent;
const map: GameMap = content.maps[0]!;

// ── fixtures ────────────────────────────────────────────────────────────────

const unitOf = (op: Operator): OperatorInstance => ({
  opId: op.id,
  alive: true,
  hp: (4 - op.speed) as 1 | 2 | 3,
  chipped: false,
  consumed: {},
  kills: 0,
  deaths: 0,
});

function drawLineup(side: Side, seed: string, n = 5): Operator[] {
  const rng = rngFor(seed, 'lineup', side);
  const pool = content.operators.filter((o) => o.side === side);
  const chosen: Operator[] = [];
  while (chosen.length < n && chosen.length < pool.length) {
    const candidate = rng.pick(pool);
    if (!chosen.some((c) => c.id === candidate.id)) chosen.push(candidate);
  }
  return chosen;
}

interface Setup {
  atkStrategy?: AtkStrategy;
  defStrategy?: DefStrategy;
  atkSite?: string;
  defSite?: string;
  atkOps?: Operator[];
  defOps?: Operator[];
}

function buildContext(seed: string, s: Setup): RoundContext {
  const atkOps = s.atkOps ?? drawLineup('ATK', seed);
  const defOps = s.defOps ?? drawLineup('DEF', seed);

  const mkSide = (
    side: Side,
    ops: Operator[],
    site: string,
    strategy: Strategy,
  ): RoundSide => ({
    teamId: side,
    teamName: side === 'ATK' ? 'Ataque' : 'Defesa',
    teamTag: side,
    side,
    plan: { lineup: ops.map((o) => o.id), site, strategy },
    units: ops.map(unitOf),
    morale: 50,
  });

  return {
    matchId: `${seed}:m`,
    roundNumber: 1,
    stage: 'balance',
    scoreAtk: 0,
    scoreDef: 0,
    map,
    atk: mkSide('ATK', atkOps, s.atkSite ?? map.sites[0]!.id, s.atkStrategy ?? 'DEFAULT'),
    def: mkSide('DEF', defOps, s.defSite ?? map.sites[0]!.id, s.defStrategy ?? 'SPREAD'),
    overtime: false,
  };
}

// ── sampling ────────────────────────────────────────────────────────────────

interface Sample {
  atkWinRate: number;
  reasons: Record<string, number>;
  events: number[];
  firstBloodConversion: number;
  plantRate: number;
  n: number;
}

function sample(n: number, prefix: string, setup: Setup = {}): Sample {
  const reasons: Record<string, number> = {};
  const events: number[] = [];
  let atkWins = 0;
  let planted = 0;
  let fbRounds = 0;
  let fbWins = 0;

  for (let i = 0; i < n; i++) {
    const seed = `${prefix}-${i}`;
    const ctx = buildContext(seed, setup);
    const result = simulateRound({ content, ctx }, rngFor(seed, 0, 1, 'sim'));

    if (result.winner === 'ATK') atkWins++;
    if (result.planted) planted++;
    const key: RoundEndReason | string = `${result.winner}/${result.reason}`;
    reasons[key] = (reasons[key] ?? 0) + 1;
    events.push(result.events.length);

    const opener = Object.entries(result.perOperator).find(([, s]) => s.opened);
    if (opener) {
      const openerIsAtk = ctx.atk.units.some((u) => u.opId === opener[0]);
      fbRounds++;
      if ((openerIsAtk && result.winner === 'ATK') || (!openerIsAtk && result.winner === 'DEF')) {
        fbWins++;
      }
    }
  }

  return {
    atkWinRate: atkWins / n,
    reasons,
    events,
    firstBloodConversion: fbRounds > 0 ? fbWins / fbRounds : 0,
    plantRate: planted / n,
    n,
  };
}

const pct = (v: number): string => `${(v * 100).toFixed(1)}%`;
const percentile = (xs: number[], p: number): number =>
  [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))]!;

// ── report ──────────────────────────────────────────────────────────────────

const failures: string[] = [];
const check = (label: string, ok: boolean, detail: string): void => {
  if (!ok) failures.push(`${label}: ${detail}`);
  if (!ASSERT) console.log(`  ${ok ? '✓' : '✗'} ${label} — ${detail}`);
};

const atkStrategies: AtkStrategy[] = ['RUSH', 'DEFAULT', 'SPLIT'];
const defStrategies: DefStrategy[] = ['AGGRESSIVE_ROAM', 'ANCHOR_HOLD', 'SPREAD'];

const overall = sample(N, 'overall');

if (!ASSERT) {
  console.log(`\n${'═'.repeat(68)}`);
  console.log(`  BALANCE REPORT — ${N} rounds per cell`);
  console.log('═'.repeat(68));

  console.log('\n▸ Desfechos\n');
  const sorted = Object.entries(overall.reasons).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sorted) {
    console.log(`  ${key.padEnd(20)} ${pct(count / overall.n).padStart(7)}`);
  }
  console.log(`\n  Vitória do ataque   ${pct(overall.atkWinRate)}`);
  console.log(`  Taxa de plant       ${pct(overall.plantRate)}`);
  console.log(`  Eventos por round   mediana ${percentile(overall.events, 0.5)}, p95 ${percentile(overall.events, 0.95)}`);
}

// Strategy round-robin.
const matrix: Record<string, Record<string, number>> = {};
for (const a of atkStrategies) {
  matrix[a] = {};
  for (const d of defStrategies) {
    matrix[a]![d] = sample(Math.round(N / 2), `${a}-${d}`, {
      atkStrategy: a,
      defStrategy: d,
      atkSite: 'porao',
      defSite: 'porao',
    }).atkWinRate;
  }
}

if (!ASSERT) {
  console.log('\n▸ Matriz de estratégias (vitória do ataque)\n');
  console.log(`  ${''.padEnd(10)}${defStrategies.map((d) => d.slice(0, 8).padStart(10)).join('')}   média`);
  for (const a of atkStrategies) {
    const row = defStrategies.map((d) => pct(matrix[a]![d]!).padStart(10)).join('');
    const avg = defStrategies.reduce((s, d) => s + matrix[a]![d]!, 0) / defStrategies.length;
    console.log(`  ${a.padEnd(10)}${row}${pct(avg).padStart(9)}`);
  }
}

// The signature interaction.
const hardBreachers = content.operators.filter((o) => o.roles.includes('hard-breach'));
const antiGadgets = content.operators.filter((o) => o.roles.includes('anti-gadget') && o.side === 'ATK');
const fillerAtk = content.operators.filter(
  (o) => o.side === 'ATK' && !o.roles.includes('hard-breach') && !o.roles.includes('anti-gadget'),
);
const antiBreach = content.operators.filter((o) => o.roles.includes('anti-breach'));
const fillerDef = content.operators.filter((o) => o.side === 'DEF' && !o.roles.includes('anti-breach'));

const defWithAntiBreach = [antiBreach[0]!, ...fillerDef.slice(0, 4)];
const atkNoTrump = [hardBreachers[0]!, ...fillerAtk.slice(0, 4)];
const atkWithTrump = [hardBreachers[0]!, antiGadgets[0]!, ...fillerAtk.slice(0, 3)];

const withoutTrump = sample(N, 'breach-no-trump', {
  atkOps: atkNoTrump,
  defOps: defWithAntiBreach,
  atkSite: 'porao',
  defSite: 'porao',
});
const withTrump = sample(N, 'breach-trump', {
  atkOps: atkWithTrump,
  defOps: defWithAntiBreach,
  atkSite: 'porao',
  defSite: 'porao',
});

// Decision weight.
const siteMatched = sample(N, 'site-match', { atkSite: 'porao', defSite: 'porao' });
const siteMissed = sample(N, 'site-miss', { atkSite: 'porao', defSite: 'biblioteca' });

if (!ASSERT) {
  console.log('\n▸ Peso das decisões\n');
  console.log(`  Anti-gadget na composição   ${pct(withoutTrump.atkWinRate)} → ${pct(withTrump.atkWinRate)}  (${((withTrump.atkWinRate - withoutTrump.atkWinRate) * 100).toFixed(1)}pp)`);
  console.log(`  Errar o site (defesa)       ${pct(siteMatched.atkWinRate)} → ${pct(siteMissed.atkWinRate)}  (${((siteMissed.atkWinRate - siteMatched.atkWinRate) * 100).toFixed(1)}pp)`);
  console.log('\n▸ Invariantes\n');
}

// ── invariants ──────────────────────────────────────────────────────────────

check(
  'Ataque e defesa equilibrados',
  overall.atkWinRate >= 0.44 && overall.atkWinRate <= 0.56,
  `ataque vence ${pct(overall.atkWinRate)} (alvo 44–56%)`,
);

for (const a of atkStrategies) {
  const rates = defStrategies.map((d) => matrix[a]![d]!);
  check(
    `${a} tem um contra`,
    Math.min(...rates) < 0.52,
    `pior caso ${pct(Math.min(...rates))} (precisa <52%)`,
  );
  check(
    `${a} não domina`,
    Math.max(...rates) < 0.68,
    `melhor caso ${pct(Math.max(...rates))} (precisa <68%)`,
  );
}

check(
  'Anti-gadget muda o jogo',
  withTrump.atkWinRate - withoutTrump.atkWinRate >= 0.04,
  `+${((withTrump.atkWinRate - withoutTrump.atkWinRate) * 100).toFixed(1)}pp (precisa ≥4pp)`,
);

check(
  'Escolha de site importa',
  siteMissed.atkWinRate - siteMatched.atkWinRate >= 0.02,
  `+${((siteMissed.atkWinRate - siteMatched.atkWinRate) * 100).toFixed(1)}pp (precisa ≥2pp)`,
);

check(
  'First blood não decide sozinho',
  overall.firstBloodConversion < 0.9,
  `converte ${pct(overall.firstBloodConversion)} (precisa <90%)`,
);

check(
  'Round tem tamanho legível',
  percentile(overall.events, 0.5) >= 6 && percentile(overall.events, 0.95) < 26,
  `mediana ${percentile(overall.events, 0.5)}, p95 ${percentile(overall.events, 0.95)}`,
);

check(
  'Plant acontece sem ser garantido',
  overall.plantRate > 0.2 && overall.plantRate < 0.75,
  `${pct(overall.plantRate)} dos rounds (alvo 20–75%)`,
);

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} invariante(s) violado(s):\n`);
  for (const f of failures) console.error(`   ${f}`);
  console.error('');
  process.exit(1);
}

if (!ASSERT) console.log(`\n${'═'.repeat(68)}\n  Todos os invariantes passaram.\n${'═'.repeat(68)}\n`);
else console.log('✓ balance: todos os invariantes passaram');

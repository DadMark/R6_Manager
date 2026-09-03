/**
 * Every type the engine speaks. This module is the compile-time contract
 * between the simulation, the narration layer and the UI.
 *
 * Nothing here imports anything. The engine is a pure function of the
 * `GameContent` it is handed, which is what keeps operator data (and the
 * Ubisoft-derived names in it) fully swappable.
 */

// ── Sides & tags ────────────────────────────────────────────────────────────

export type Side = 'ATK' | 'DEF';

export type AttackTag =
  | 'hard-breach'
  | 'soft-breach'
  | 'intel'
  | 'flash'
  | 'anti-gadget'
  | 'entry'
  | 'support'
  | 'shield';

export type DefenseTag =
  | 'anti-breach'
  | 'intel-denial'
  | 'trap'
  | 'intel'
  | 'anchor'
  | 'roam'
  | 'heal';

export type Tag = AttackTag | DefenseTag;

export type Rarity = 'common' | 'rare' | 'elite';

// ── Operators ───────────────────────────────────────────────────────────────

export interface Stats {
  /** Raw gunfight skill. Dominates most duels. */
  aim: number;
  /** How much value the operator squeezes out of their gadget. */
  utility: number;
  /** Opening-duel ability: taking first contact and living. */
  entry: number;
  /** Composure when isolated. Dominates 1vX. */
  clutch: number;
}

export interface Gadget {
  name: string;
  /** What this gadget *is*, for counter-rule matching. */
  tags: Tag[];
  /** What this gadget shuts down, for narration flavour and future rules. */
  counters: Tag[];
  /** 0..1 — raw potency, e.g. lethality of a trap. */
  power: number;
}

export interface Operator {
  /** Stable id. Never referenced by literal inside `src/engine/`. */
  id: string;
  name: string;
  unit: string;
  side: Side;
  /** 1 = slowest//tankiest, 3 = fastest/squishiest. Health chunks = 4 - speed. */
  speed: 1 | 2 | 3;
  roles: Tag[];
  stats: Stats;
  gadget: Gadget;
  rarity: Rarity;
  /** Relative probability of being offered in a draft. Primary balance knob. */
  draftWeight: number;
}

// ── Strategies, maps ────────────────────────────────────────────────────────

export type AtkStrategy = 'RUSH' | 'DEFAULT' | 'SPLIT';
export type DefStrategy = 'AGGRESSIVE_ROAM' | 'ANCHOR_HOLD' | 'SPREAD';
export type Strategy = AtkStrategy | DefStrategy;

export type SiteId = string;

export interface BombSite {
  id: SiteId;
  name: string;
  /** How often defenders naturally set up here, before lineup fit. */
  defaultPrior: number;
}

export interface GameMap {
  id: string;
  name: string;
  sites: BombSite[];
}

export interface StrategyDef {
  id: Strategy;
  name: string;
  /** pt-BR blurb shown on the strategy picker. */
  blurb: string;
}

// ── Counter matrix (data, not code) ─────────────────────────────────────────

export type RuleOutcome = 'SUCCESS' | 'PARTIAL' | 'FAIL';

export interface RuleEffects {
  /** Advantage points granted to the attacking side's execute. */
  atkExec?: number;
  /** Advantage points granted to the defending side's setup. */
  defSetup?: number;
  flags?: Partial<Record<'wallOpen' | 'flashSupport' | 'trapsCleared' | 'droneDenied', boolean>>;
  /** Seconds burned off the round clock. */
  clockCost?: number;
  /** Chance the acting operator dies performing the play. */
  actorDeathChance?: number;
}

export interface CounterRuleWeights {
  base: number;
  perActor: number;
  perOpposed: number;
  trumpBonus: number;
  counterTrumpBonus: number;
  uncontestedBonus: number;
  utilityScale: number;
  infoScale: number;
  actorCap: number;
  opposedCap: number;
}

export interface CounterRule {
  id: string;
  phase: RoundPhase;
  actorSide: Side;
  actor: { anyTag: Tag[] };
  opposed: { anyTag: Tag[] } | null;
  /** An actor-side tag that breaks the contest open (e.g. anti-gadget). */
  trump: { anyTag: Tag[] } | null;
  /** An opposed-side tag that pushes back against the trump. */
  counterTrump: { anyTag: Tag[] } | null;
  weights: CounterRuleWeights;
  outcomes: Record<RuleOutcome, RuleEffects>;
  narrationKey: string;
  /** Used when nobody on the acting side has the required tag at all. */
  fallbackNarrationKey?: string;
}

// ── Tuning ──────────────────────────────────────────────────────────────────

export type DuelType = 'ENTRY' | 'ROAM' | 'ANCHOR' | 'TRADE' | 'CLUTCH';

export interface Tuning {
  /** Sigmoid divisor for duels. Larger = flatter, more upsets. */
  DUEL_K: number;
  P_FLOOR: number;
  P_CEIL: number;
  /** Weight of each stat per duel type. Must sum to 1 per type. */
  DUEL_WEIGHTS: Record<DuelType, Partial<Record<keyof Stats, number>>>;
  /** Advantage-point coefficients feeding the duel delta. */
  MOD: {
    numbers: number;
    numbersCap: number;
    infoCap: number;
    wallOpen: number;
    flashSupport: number;
    defHeal: number;
    hp: number;
    /** Scales RoundSide.skillBonus into the duel delta. */
    skill: number;
    exec: number;
    execCap: number;
    morale: number;
    moraleCap: number;
    postPlant: number;
  };
  STRATEGY_MATRIX: Record<string, Record<string, number>>;
  TRADE: { base: number; perNumbers: number; cap: number; byStrategy: Record<string, number> };
  ROUND: { maxEngagements: number; clockMax: number; engagementSeconds: [number, number] };
  /** Site mind-game: what reading the defence right/wrong is worth. */
  SITE: { defSetupOnMatch: number; atkExecOnMiss: number; defSetupOnMiss: number };
  /** PREP intel duel. */
  INFO: { utilityDivisor: number; cap: number; byStrategy: Record<string, number> };
  /** APPROACH traps. */
  TRAP: {
    base: number;
    perIntel: number;
    antiGadget: number;
    utilityScale: number;
    utilityPivot: number;
    infoScale: number;
    min: number;
    max: number;
    byStrategy: Record<string, number>;
  };
  /** APPROACH roamer interceptions. */
  ROAM: { engageBase: number; maxDuels: number; byAtkStrategy: Record<string, number>; byDefStrategy: Record<string, number> };
  /** Plant attempt and the post-plant clock. */
  PLANT: {
    base: number;
    perNumbers: number;
    wallOpen: number;
    siteMismatch: number;
    lateThreshold: number;
    latePenalty: number;
    min: number;
    max: number;
    byStrategy: Record<string, number>;
    defuseWindow: number;
  };
  /** 1vX resolution. */
  CLUTCH: { statScale: number; statPivot: number; perExtraFoe: number };
  /** Phase clock budgets, in pseudo-seconds. */
  CLOCK: {
    prepEnd: number;
    approachEnd: number;
    breachEnd: number;
    executeStart: number;
    byStrategy: Record<string, number>;
  };
}

// ── Round state ─────────────────────────────────────────────────────────────

export interface OperatorInstance {
  opId: string;
  alive: boolean;
  hp: 1 | 2 | 3;
  /** Took chip damage from a trap or utility. */
  chipped: boolean;
  consumed: Partial<Record<Tag, boolean>>;
  kills: number;
  deaths: number;
}

export interface RoundPlan {
  lineup: string[];
  site: SiteId;
  strategy: Strategy;
}

export interface RoundSide {
  teamId: string;
  teamName: string;
  teamTag: string;
  side: Side;
  plan: RoundPlan;
  units: OperatorInstance[];
  morale: number;
  /**
   * Flat advantage in raw stat points, used to make AI difficulty real.
   * Applied to every duel this side takes, like morale but blunter.
   */
  skillBonus?: number;
}

export interface RoundContext {
  matchId: string;
  roundNumber: number;
  stage: string;
  scoreAtk: number;
  scoreDef: number;
  map: GameMap;
  atk: RoundSide;
  def: RoundSide;
  overtime: boolean;
}

export type RoundPhase =
  | 'PREP'
  | 'APPROACH'
  | 'BREACH'
  | 'EXECUTE'
  | 'PLANT'
  | 'POST_PLANT'
  | 'CLUTCH'
  | 'END';

// ── Events ──────────────────────────────────────────────────────────────────

/**
 * Full arithmetic behind a duel. Carried on every DUEL event so the `?debug=1`
 * overlay can explain any outcome — the single most useful balance-tuning tool
 * in the project.
 */
export interface ModifierBreakdown {
  base: number;
  info: number;
  numbers: number;
  utility: number;
  health: number;
  strategy: number;
  exec: number;
  morale: number;
  postPlant: number;
  total: number;
  probability: number;
  roll: number;
}

export type RoundEndReason = 'ELIMINATION' | 'DEFUSED' | 'TIME' | 'DETONATION';

export type RoundEvent =
  | { kind: 'ROUND_START'; phase: 'PREP'; t: number; id: string; site: SiteId; siteMatch: boolean }
  | { kind: 'DRONE_INTEL'; phase: 'PREP'; t: number; id: string; actorId: string; denied: boolean; info: number }
  | { kind: 'SETUP'; phase: 'PREP'; t: number; id: string; defOpId: string; note: string }
  | { kind: 'TRAP_TRIGGER'; phase: 'APPROACH'; t: number; id: string; trapOpId: string; victimId: string; lethal: boolean }
  | { kind: 'ROAM_DUEL'; phase: 'APPROACH'; t: number; id: string; winnerId: string; loserId: string; mods: ModifierBreakdown }
  | {
      kind: 'COUNTER_PLAY';
      phase: RoundPhase;
      t: number;
      id: string;
      ruleId: string;
      narrationKey: string;
      actorIds: string[];
      opposedIds: string[];
      trumpIds: string[];
      outcome: RuleOutcome;
      probability: number;
      /**
       * Set when the play cost the acting operator their life (a breacher
       * caught on the wall). Without it the event stream would be missing a
       * death, and anything reconstructing alive counts from events — the UI's
       * live dots — would drift.
       */
      casualtyId?: string;
    }
  | {
      kind: 'DUEL';
      phase: RoundPhase;
      t: number;
      id: string;
      winnerId: string;
      loserId: string;
      winnerSide: Side;
      traded: boolean;
      traderId?: string;
      mods: ModifierBreakdown;
    }
  | { kind: 'PLANT'; phase: 'PLANT'; t: number; id: string; planterId: string; site: SiteId; contested: boolean }
  | { kind: 'DEFUSE'; phase: 'POST_PLANT'; t: number; id: string; defuserId: string; success: boolean }
  | { kind: 'REVIVE'; phase: RoundPhase; t: number; id: string; medicId: string; targetId: string }
  | { kind: 'CLUTCH_START'; phase: 'CLUTCH'; t: number; id: string; heroId: string; heroSide: Side; versus: number }
  | { kind: 'CLUTCH_STEP'; phase: 'CLUTCH'; t: number; id: string; heroId: string; foeId: string; heroWon: boolean; probability: number }
  | { kind: 'ROUND_END'; phase: 'END'; t: number; id: string; winner: Side; reason: RoundEndReason; mvpId: string };

export type EventKind = RoundEvent['kind'];

// ── Narration ───────────────────────────────────────────────────────────────

export type NarrationTone = 'neutral' | 'hype' | 'grave' | 'tense';

export interface NarrationLine {
  eventId: string;
  text: string;
  tone: NarrationTone;
  /** Relative dwell weight. The UI converts this to milliseconds. */
  beat: 1 | 2 | 3;
  /** Kept for the repetition test and for debugging. */
  templateId: string;
}

/** narrationKey -> pt-BR templates containing `{slot}` placeholders. */
export type TemplateBank = Record<string, string[]>;

// ── Results ─────────────────────────────────────────────────────────────────

export interface OperatorRoundStats {
  kills: number;
  deaths: number;
  opened: boolean;
  clutched: boolean;
}

export interface RoundResult {
  winner: Side;
  reason: RoundEndReason;
  events: RoundEvent[];
  narration: NarrationLine[];
  survivors: { atk: string[]; def: string[] };
  planted: boolean;
  mvpId: string;
  perOperator: Record<string, OperatorRoundStats>;
}

export interface MatchResult {
  matchId: string;
  stage: string;
  teamAId: string;
  teamBId: string;
  rounds: RoundResult[];
  scoreA: number;
  scoreB: number;
  winnerId: string;
  mvpId: string;
}

// ── Content bundle ──────────────────────────────────────────────────────────

export interface GameContent {
  operators: Operator[];
  counterRules: CounterRule[];
  maps: GameMap[];
  strategies: { atk: StrategyDef[]; def: StrategyDef[] };
  tuning: Tuning;
  templates: TemplateBank;
}

export interface SimulateRoundInput {
  content: GameContent;
  ctx: RoundContext;
}

// ── Run state ───────────────────────────────────────────────────────────────

export type RunPhase =
  | 'MENU'
  | 'DRAFT'
  | 'BRACKET'
  | 'ROUND_SETUP'
  | 'ROUND_PLAYBACK'
  | 'ROUND_RESULT'
  | 'MATCH_RESULT'
  | 'RUN_END';

export interface RunTeam {
  id: string;
  name: string;
  tag: string;
  /** Drafted roster. Every round's five must come from here. */
  roster: string[];
  morale: number;
  isAI: boolean;
  aiProfileId?: string;
}

export interface StageNode {
  stageId: string;
  name: string;
  opponent: RunTeam;
  roundsToWin: number;
  result?: 'WON' | 'LOST';
}

export interface DraftOffer {
  step: number;
  total: number;
  side: Side;
  offer: string[];
}

export interface CurrentMatch {
  matchId: string;
  stageId: string;
  opponent: RunTeam;
  scorePlayer: number;
  scoreOpponent: number;
  roundIndex: number;
  playerSide: Side;
  roundsToWin: number;
  lastResult?: RoundResult;
  /** Powers the one-click "repeat lineup" and the AI's read on the player. */
  lastPlayerPlan?: RoundPlan;
  lastOpponentPlan?: RoundPlan;
  playerRecentSites: SiteId[];
  opponentRecentSites: SiteId[];
}

export interface RunSettings {
  revealSpeed: 1 | 2 | 4;
  autoAdvance: boolean;
  debugMath: boolean;
}

export interface RunState {
  schemaVersion: 1;
  seed: string;
  phase: RunPhase;
  player: RunTeam;
  draft?: DraftOffer;
  bracket: { stages: StageNode[]; currentStageIndex: number };
  currentMatch?: CurrentMatch;
  history: MatchResult[];
  settings: RunSettings;
}

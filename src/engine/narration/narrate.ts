import type { Rng } from '../rng';
import type {
  EventKind,
  NarrationLine,
  NarrationTone,
  Operator,
  RoundEvent,
  RoundSide,
  TemplateBank,
} from '../types';

/**
 * Turns the event stream into pt-BR commentary.
 *
 * Pure: no timing, no DOM, no clock. The UI owns pacing — it converts each
 * line's `beat` into a delay. Keeping time out of here is what lets the same
 * narration be rendered progressively in the browser and dumped instantly to
 * a terminal by `scripts/sim.ts`.
 */

export interface NarrationContext {
  operators: Map<string, Operator>;
  atk: RoundSide;
  def: RoundSide;
  siteName: string;
}

/** How long the UI should dwell on each kind of beat. */
const BEAT: Record<EventKind, 1 | 2 | 3> = {
  ROUND_START: 2,
  DRONE_INTEL: 1,
  SETUP: 1,
  TRAP_TRIGGER: 2,
  ROAM_DUEL: 2,
  COUNTER_PLAY: 3,
  DUEL: 1,
  PLANT: 3,
  DEFUSE: 3,
  REVIVE: 2,
  CLUTCH_START: 3,
  CLUTCH_STEP: 2,
  ROUND_END: 3,
};

const TONE: Record<EventKind, NarrationTone> = {
  ROUND_START: 'neutral',
  DRONE_INTEL: 'neutral',
  SETUP: 'neutral',
  TRAP_TRIGGER: 'tense',
  ROAM_DUEL: 'tense',
  COUNTER_PLAY: 'hype',
  DUEL: 'neutral',
  PLANT: 'hype',
  DEFUSE: 'hype',
  REVIVE: 'tense',
  CLUTCH_START: 'tense',
  CLUTCH_STEP: 'tense',
  ROUND_END: 'hype',
};

/**
 * Choose a template variant, avoiding an immediate repeat of the last variant
 * used for that same key within the round. Repetition is the fastest way for
 * narration to stop feeling alive.
 */
function pickVariant(
  key: string,
  bank: TemplateBank,
  used: Map<string, number>,
  rng: Rng,
): { template: string; templateId: string } | null {
  const variants = bank[key];
  if (!variants || variants.length === 0) return null;

  let index = Math.floor(rng.next() * variants.length);
  if (variants.length > 1 && used.get(key) === index) {
    index = (index + 1 + Math.floor(rng.next() * (variants.length - 1))) % variants.length;
  }
  used.set(key, index);
  return { template: variants[index]!, templateId: `${key}#${index}` };
}

const fill = (template: string, slots: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (whole, name: string) => slots[name] ?? whole);

function narrationKeyFor(event: RoundEvent): string {
  switch (event.kind) {
    case 'ROUND_START':
      return event.siteMatch ? 'round_start.site_match' : 'round_start.site_mismatch';
    case 'DRONE_INTEL':
      return event.denied ? 'drone.denied' : 'drone.clear';
    case 'SETUP':
      return 'setup.note';
    case 'TRAP_TRIGGER':
      return event.lethal ? 'trap.lethal' : 'trap.chip';
    case 'ROAM_DUEL':
      return 'roam.duel';
    case 'COUNTER_PLAY':
      return `${event.narrationKey}.${event.outcome.toLowerCase()}`;
    case 'DUEL':
      if (event.traded) return 'duel.traded';
      return event.winnerSide === 'ATK' ? 'duel.atk' : 'duel.def';
    case 'PLANT':
      return event.contested ? 'plant.contested' : 'plant.clean';
    case 'DEFUSE':
      return event.success ? 'defuse.success' : 'defuse.fail';
    case 'REVIVE':
      return 'revive';
    case 'CLUTCH_START':
      return 'clutch.start';
    case 'CLUTCH_STEP':
      return event.heroWon ? 'clutch.step_won' : 'clutch.step_lost';
    case 'ROUND_END':
      return `round_end.${event.reason.toLowerCase()}`;
  }
}

/**
 * Marks a slot that resolved against an unknown operator id. Deliberately
 * conspicuous and impossible to confuse with real punctuation, so the
 * narration QA suite can assert it never reaches a player.
 */
export const UNRESOLVED = '‹?›';

function slotsFor(event: RoundEvent, ctx: NarrationContext): Record<string, string> {
  const name = (id: string | undefined): string =>
    (id ? ctx.operators.get(id)?.name : undefined) ?? UNRESOLVED;
  const unit = (id: string | undefined): string =>
    (id ? ctx.operators.get(id)?.unit : undefined) ?? UNRESOLVED;
  const gadget = (id: string | undefined): string =>
    (id ? ctx.operators.get(id)?.gadget.name : undefined) ?? UNRESOLVED;

  const base: Record<string, string> = {
    site: ctx.siteName,
    atkTeam: ctx.atk.teamName,
    defTeam: ctx.def.teamName,
    t: String(event.t),
  };

  switch (event.kind) {
    case 'ROUND_START':
      return { ...base };
    case 'DRONE_INTEL':
    case 'SETUP':
      return {
        ...base,
        op: name('actorId' in event ? event.actorId : event.defOpId),
        gadget: gadget('actorId' in event ? event.actorId : event.defOpId),
      };
    case 'TRAP_TRIGGER':
      return {
        ...base,
        op: name(event.trapOpId),
        op2: name(event.victimId),
        gadget: gadget(event.trapOpId),
      };
    case 'ROAM_DUEL':
      return { ...base, op: name(event.winnerId), op2: name(event.loserId) };
    case 'COUNTER_PLAY':
      return {
        ...base,
        op: name(event.actorIds[0]),
        op2: name(event.opposedIds[0]),
        op3: name(event.trumpIds[0]),
        gadget: gadget(event.actorIds[0]),
      };
    case 'DUEL':
      return {
        ...base,
        op: name(event.winnerId),
        op2: name(event.loserId),
        op3: name(event.traderId),
        unit: unit(event.winnerId),
      };
    case 'PLANT':
      return { ...base, op: name(event.planterId) };
    case 'DEFUSE':
      return { ...base, op: name(event.defuserId) };
    case 'REVIVE':
      return { ...base, op: name(event.medicId), op2: name(event.targetId) };
    case 'CLUTCH_START':
      return { ...base, op: name(event.heroId), n: String(event.versus) };
    case 'CLUTCH_STEP':
      return { ...base, op: name(event.heroId), op2: name(event.foeId) };
    case 'ROUND_END':
      return {
        ...base,
        winner: event.winner === 'ATK' ? ctx.atk.teamName : ctx.def.teamName,
        op: name(event.mvpId),
      };
  }
}

export function narrate(
  events: readonly RoundEvent[],
  bank: TemplateBank,
  ctx: NarrationContext,
  rng: Rng,
): NarrationLine[] {
  const used = new Map<string, number>();
  const lines: NarrationLine[] = [];

  for (const event of events) {
    const key = narrationKeyFor(event);
    const chosen = pickVariant(key, bank, used, rng);
    if (!chosen) continue; // An unmapped key is silent rather than fatal.

    lines.push({
      eventId: event.id,
      text: fill(chosen.template, slotsFor(event, ctx)),
      tone: TONE[event.kind],
      beat: BEAT[event.kind],
      templateId: chosen.templateId,
    });
  }

  return lines;
}

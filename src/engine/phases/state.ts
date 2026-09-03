import { resolveCounterRule, type CounterResolution } from '../counters';
import { clamp } from '../math';
import type { Rng } from '../rng';
import type {
  GameContent,
  Operator,
  OperatorInstance,
  OperatorRoundStats,
  RoundContext,
  RoundEvent,
  RoundPhase,
  RoundSide,
  RuleEffects,
  Side,
} from '../types';

/**
 * Mutable state threaded through the round's phases.
 *
 * Each phase is `(state: RoundState) => void`. Keeping the accumulating state
 * in one object — rather than returning a new one per phase — is what lets the
 * phases stay small and independently testable without inventing a
 * context-passing protocol for ten fields.
 */
export interface RoundFlags {
  wallOpen: boolean;
  flashSupport: boolean;
  trapsCleared: boolean;
  droneDenied: boolean;
}

export class RoundState {
  readonly content: GameContent;
  readonly ctx: RoundContext;
  readonly rng: Rng;
  readonly byId: ReadonlyMap<string, Operator>;
  readonly events: RoundEvent[] = [];
  readonly perOperator: Record<string, OperatorRoundStats> = {};

  /** Pseudo-seconds elapsed, 0..tuning.ROUND.clockMax. */
  t = 0;
  /** Advantage accumulated by each side, in advantage points. */
  atkExec = 0;
  defSetup = 0;
  /** Intel advantage, from the attacker's perspective. */
  info = 0;
  flags: RoundFlags = {
    wallOpen: false,
    flashSupport: false,
    trapsCleared: false,
    droneDenied: false,
  };
  planted = false;
  plantedAt = 0;
  defused = false;
  siteMatch = false;
  firstBlood = true;

  private eventSeq = 0;
  private readonly roundKey: string;

  constructor(content: GameContent, ctx: RoundContext, rng: Rng) {
    this.content = content;
    this.ctx = ctx;
    this.rng = rng;
    this.byId = new Map(content.operators.map((op) => [op.id, op]));
    this.roundKey = `${ctx.matchId}:r${ctx.roundNumber}`;

    for (const u of [...ctx.atk.units, ...ctx.def.units]) {
      this.perOperator[u.opId] = { kills: 0, deaths: 0, opened: false, clutched: false };
    }
  }

  nextEventId(): string {
    return `${this.roundKey}:e${++this.eventSeq}`;
  }

  emit(event: RoundEvent): void {
    this.events.push(event);
  }

  op(unit: OperatorInstance): Operator {
    const found = this.byId.get(unit.opId);
    if (!found) throw new Error(`Unknown operator id in lineup: ${unit.opId}`);
    return found;
  }

  alive(side: Side): OperatorInstance[] {
    return (side === 'ATK' ? this.ctx.atk : this.ctx.def).units.filter((u) => u.alive);
  }

  side(side: Side): RoundSide {
    return side === 'ATK' ? this.ctx.atk : this.ctx.def;
  }

  /** Advance the clock, scaled by how fast the attacking plan moves. */
  advanceClock(seconds: number): void {
    const scale = this.content.tuning.CLOCK.byStrategy[this.ctx.atk.plan.strategy] ?? 1;
    this.t = Math.min(this.content.tuning.ROUND.clockMax, this.t + seconds * scale);
  }

  kill(unit: OperatorInstance, killer?: OperatorInstance): void {
    if (!unit.alive) return;
    unit.alive = false;
    unit.deaths++;
    this.perOperator[unit.opId]!.deaths++;
    if (killer) {
      killer.kills++;
      this.perOperator[killer.opId]!.kills++;
      if (this.firstBlood) {
        this.perOperator[killer.opId]!.opened = true;
        this.firstBlood = false;
      }
    }
  }

  /**
   * Apply a counter-rule outcome's effects.
   * Returns the operator killed by the play, if any, so the caller can put it
   * on the event and keep the stream complete.
   */
  applyEffects(effects: RuleEffects, actorIds: readonly string[]): string | undefined {
    if (effects.atkExec) this.atkExec = clamp(this.atkExec + effects.atkExec, -12, 12);
    if (effects.defSetup) this.defSetup = clamp(this.defSetup + effects.defSetup, -12, 12);
    if (effects.clockCost) this.advanceClock(effects.clockCost);
    if (effects.flags) {
      for (const [flag, value] of Object.entries(effects.flags)) {
        if (value) this.flags[flag as keyof RoundFlags] = true;
      }
    }
    if (effects.actorDeathChance && actorIds.length > 0 && this.rng.chance(effects.actorDeathChance)) {
      const victimId = this.rng.pick(actorIds);
      const unit = [...this.ctx.atk.units, ...this.ctx.def.units].find(
        (u) => u.opId === victimId && u.alive,
      );
      if (unit) {
        this.kill(unit);
        return unit.opId;
      }
    }
    return undefined;
  }

  /**
   * Run every counter rule registered for a phase, emitting a COUNTER_PLAY
   * event and applying its effects.
   */
  runCounterRules(phase: RoundPhase): CounterResolution[] {
    const results: CounterResolution[] = [];

    for (const rule of this.content.counterRules) {
      if (rule.phase !== phase) continue;

      const actorSide = rule.actorSide;
      const opposedSide: Side = actorSide === 'ATK' ? 'DEF' : 'ATK';
      const signedInfo = actorSide === 'ATK' ? this.info : -this.info;

      const resolution = resolveCounterRule(
        {
          rule,
          actorUnits: this.side(actorSide).units,
          opposedUnits: this.side(opposedSide).units,
          byId: this.byId,
          info: signedInfo,
        },
        this.rng,
      );

      // An interaction nobody could even attempt is usually a non-event: if
      // no one brought a flash, there is no flash beat to narrate. Only rules
      // that declare a fallback (the reinforced wall, denied intel) are worth
      // telling the player about when they are absent.
      // The effects land either way: the attackers who skipped a hard breach
      // eat the reinforced wall whether or not anyone narrates it.
      const effects = resolution.absent
        ? absentEffects(rule.id, this.side(actorSide), this.byId)
        : rule.outcomes[resolution.outcome];
      const casualtyId = this.applyEffects(effects, resolution.actorIds);

      const narratable = !resolution.absent || rule.fallbackNarrationKey !== undefined;
      if (narratable) {
        this.emit({
          kind: 'COUNTER_PLAY',
          phase,
          t: Math.round(this.t),
          id: this.nextEventId(),
          ruleId: rule.id,
          narrationKey: resolution.narrationKey,
          actorIds: resolution.actorIds,
          opposedIds: resolution.opposedIds,
          trumpIds: resolution.trumpIds,
          outcome: resolution.outcome,
          probability: Math.round(resolution.probability * 10000) / 10000,
          ...(casualtyId ? { casualtyId } : {}),
        });
      }

      results.push(resolution);
    }

    return results;
  }
}

/**
 * What it costs to have brought none of the required tool.
 *
 * Only the hard breach is punished structurally — a reinforced wall the attack
 * cannot open shapes the whole round. Two soft-breach operators mitigate it:
 * you can still make a hole, just not where you wanted one.
 */
function absentEffects(
  ruleId: string,
  actorSide: RoundSide,
  byId: ReadonlyMap<string, Operator>,
): RuleEffects {
  if (ruleId !== 'HARD_BREACH_VS_ANTI_BREACH') return {};

  const softBreachers = actorSide.units.filter((u) => {
    const op = byId.get(u.opId);
    return u.alive && op?.roles.includes('soft-breach');
  }).length;

  return { atkExec: softBreachers >= 2 ? -2 : -5 };
}

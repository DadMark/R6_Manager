import type { CounterRule } from '@engine/types';

/**
 * THE UTILITY COUNTER-MATRIX — as data.
 *
 * This file is what makes the game Siege rather than reskinned football. Each
 * rule is a contest between an acting tag and an opposing tag, optionally
 * broken open by a "trump" the acting side can bring, and pushed back by a
 * "counterTrump" the defence can bring.
 *
 * Adding an interaction means adding a row here — never an `if` in the engine.
 */
export const counterRules: CounterRule[] = [
  // ── PREP ──────────────────────────────────────────────────────────────────
  {
    id: 'INTEL_VS_INTEL_DENIAL',
    phase: 'PREP',
    actorSide: 'ATK',
    actor: { anyTag: ['intel'] },
    opposed: { anyTag: ['intel-denial'] },
    trump: null,
    counterTrump: null,
    weights: {
      base: 0.55,
      perActor: 0.12,
      perOpposed: -0.2,
      trumpBonus: 0,
      counterTrumpBonus: 0,
      uncontestedBonus: 0.2,
      utilityScale: 0.004,
      infoScale: 0.03,
      actorCap: 2,
      opposedCap: 2,
    },
    outcomes: {
      SUCCESS: { atkExec: 2, clockCost: 6 },
      PARTIAL: { atkExec: 1, clockCost: 10 },
      FAIL: { defSetup: 2, clockCost: 12, flags: { droneDenied: true } },
    },
    narrationKey: 'prep.intel_vs_denial',
    fallbackNarrationKey: 'prep.no_intel',
  },

  // ── APPROACH ──────────────────────────────────────────────────────────────
  {
    id: 'ANTI_GADGET_VS_TRAP',
    phase: 'APPROACH',
    actorSide: 'ATK',
    actor: { anyTag: ['anti-gadget'] },
    opposed: { anyTag: ['trap'] },
    trump: { anyTag: ['intel'] },
    counterTrump: null,
    weights: {
      base: 0.48,
      perActor: 0.14,
      perOpposed: -0.16,
      trumpBonus: 0.18,
      counterTrumpBonus: 0,
      uncontestedBonus: 0.2,
      utilityScale: 0.004,
      infoScale: 0.05,
      actorCap: 2,
      opposedCap: 3,
    },
    outcomes: {
      SUCCESS: { atkExec: 1, clockCost: 8, flags: { trapsCleared: true } },
      PARTIAL: { clockCost: 12 },
      FAIL: { defSetup: 1, clockCost: 10 },
    },
    narrationKey: 'approach.anti_gadget_vs_trap',
    fallbackNarrationKey: 'approach.no_anti_gadget',
  },

  // ── BREACH — the signature interaction ────────────────────────────────────
  //
  // Bringing anti-gadget (Thatcher/IQ) against a reinforced wall roughly
  // DOUBLES the open rate: 30% -> 62% against a single anti-breach defender.
  // That swing is the whole reason drafting utility matters, and it has to be
  // legible in the commentary rather than buried in the arithmetic.
  {
    id: 'HARD_BREACH_VS_ANTI_BREACH',
    phase: 'BREACH',
    actorSide: 'ATK',
    actor: { anyTag: ['hard-breach'] },
    opposed: { anyTag: ['anti-breach'] },
    trump: { anyTag: ['anti-gadget'] },
    counterTrump: { anyTag: ['intel-denial'] },
    weights: {
      base: 0.5,
      perActor: 0.1,
      perOpposed: -0.22,
      trumpBonus: 0.4,
      counterTrumpBonus: -0.12,
      uncontestedBonus: 0.25,
      utilityScale: 0.004,
      infoScale: 0.05,
      actorCap: 2,
      opposedCap: 2,
    },
    outcomes: {
      SUCCESS: { atkExec: 4, defSetup: -1, flags: { wallOpen: true }, clockCost: 8 },
      PARTIAL: { atkExec: 2, clockCost: 14, actorDeathChance: 0.08 },
      FAIL: { defSetup: 4, clockCost: 20, actorDeathChance: 0.25 },
    },
    narrationKey: 'breach.hard_vs_anti',
    fallbackNarrationKey: 'breach.no_hard_breach',
  },

  // ── EXECUTE ───────────────────────────────────────────────────────────────
  {
    id: 'FLASH_VS_ANCHOR',
    phase: 'EXECUTE',
    actorSide: 'ATK',
    actor: { anyTag: ['flash'] },
    opposed: { anyTag: ['anchor'] },
    trump: null,
    counterTrump: { anyTag: ['anti-gadget'] },
    weights: {
      base: 0.55,
      perActor: 0.12,
      perOpposed: -0.14,
      trumpBonus: 0,
      counterTrumpBonus: -0.2,
      uncontestedBonus: 0.15,
      utilityScale: 0.004,
      infoScale: 0.04,
      actorCap: 2,
      opposedCap: 3,
    },
    outcomes: {
      SUCCESS: { atkExec: 2, flags: { flashSupport: true }, clockCost: 5 },
      PARTIAL: { atkExec: 1, clockCost: 8 },
      FAIL: { defSetup: 2, clockCost: 8 },
    },
    narrationKey: 'execute.flash_vs_anchor',
  },
  {
    id: 'SHIELD_ENTRY',
    phase: 'EXECUTE',
    actorSide: 'ATK',
    actor: { anyTag: ['shield'] },
    opposed: { anyTag: ['trap'] },
    trump: { anyTag: ['flash'] },
    counterTrump: null,
    weights: {
      base: 0.5,
      perActor: 0.15,
      perOpposed: -0.12,
      trumpBonus: 0.15,
      counterTrumpBonus: 0,
      uncontestedBonus: 0.15,
      utilityScale: 0.003,
      infoScale: 0.03,
      actorCap: 1,
      opposedCap: 2,
    },
    outcomes: {
      SUCCESS: { atkExec: 2, clockCost: 10 },
      PARTIAL: { atkExec: 1, clockCost: 12 },
      FAIL: { defSetup: 2, clockCost: 12, actorDeathChance: 0.18 },
    },
    narrationKey: 'execute.shield_entry',
  },

  // ── POST-PLANT ────────────────────────────────────────────────────────────
  {
    id: 'HEAL_REVIVE',
    phase: 'POST_PLANT',
    actorSide: 'DEF',
    actor: { anyTag: ['heal'] },
    opposed: null,
    trump: null,
    counterTrump: null,
    weights: {
      base: 0.45,
      perActor: 0.15,
      perOpposed: 0,
      trumpBonus: 0,
      counterTrumpBonus: 0,
      uncontestedBonus: 0,
      utilityScale: 0.004,
      infoScale: -0.03,
      actorCap: 2,
      opposedCap: 0,
    },
    outcomes: {
      SUCCESS: { defSetup: 4, clockCost: 8 },
      PARTIAL: { defSetup: 1, clockCost: 10 },
      FAIL: { clockCost: 10 },
    },
    narrationKey: 'postplant.heal_revive',
  },
];

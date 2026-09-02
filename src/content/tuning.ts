import type { Tuning } from '@engine/types';

/**
 * EVERY magic number in the simulation lives here.
 *
 * This is the file the balance pass (slice S8) edits. The engine reads these
 * values and contains none of its own, so re-tuning the game never requires
 * touching logic. Run `npm run balance:assert` after any change here.
 *
 * ── MEASURED S1 BASELINE (EXECUTE phase only, 3–4k rounds per cell) ─────────
 *
 *   ATK win %      vs ROAM   vs ANCHOR   vs SPREAD      avg
 *   RUSH             58.8      33.7        49.7        47.4
 *   DEFAULT          28.6      39.1        36.0        34.6
 *   SPLIT            38.0      31.6        24.8        31.5
 *
 *   Outcomes: ATK/ELIMINATION 36.5% · DEF/TIME 33.7% · DEF/ELIMINATION 29.8%
 *   Site mismatch is worth +13.7pp to the attack (37.1% → 50.8%).
 *
 * Two known deviations, both traced to the same missing piece rather than to
 * these numbers — do NOT tune them away here:
 *
 *   1. Attackers sit near 38% overall, and a third of rounds expire on the
 *      clock with both sides alive.
 *   2. RUSH out-performs the other two attack plans by 13–16pp on average
 *      (rock-paper-scissors still holds — RUSH loses to ANCHOR_HOLD).
 *
 * Cause: slice S1 has no PLANT. A wipe is currently the attack's ONLY win
 * condition, which both suppresses their win rate and rewards the plan that
 * forces fights fastest. S3 adds PLANT/POST_PLANT — the attack's real win
 * condition — and these figures get re-measured then. Re-tuning around an
 * absent phase would only have to be undone.
 */
export const tuning: Tuning = {
  // A +9 raw-point advantage is roughly a 73% duel. Larger DUEL_K = flatter
  // odds and more upsets; smaller = stats dominate and matches feel decided.
  DUEL_K: 9,
  // Nobody is ever a lock. The floor is what makes upsets possible — and the
  // narration must acknowledge them, or a losing roll reads as broken.
  P_FLOOR: 0.06,
  P_CEIL: 0.94,

  DUEL_WEIGHTS: {
    ENTRY: { aim: 0.6, entry: 0.4 },
    ROAM: { aim: 0.55, entry: 0.2, clutch: 0.25 },
    ANCHOR: { aim: 0.7, clutch: 0.3 },
    TRADE: { aim: 0.8, entry: 0.2 },
    CLUTCH: { aim: 0.45, clutch: 0.55 },
  },

  MOD: {
    // Numbers advantage. If this climbs much past ~2.2 the first duel decides
    // the round and the rest of the narration is filler.
    numbers: 2.2,
    numbersCap: 6,
    infoCap: 6,
    wallOpen: 4,
    flashSupport: 3,
    defHeal: 1.5,
    hp: 2.5,
    exec: 0.35,
    execCap: 5,
    morale: 0.03,
    moraleCap: 3,
    postPlant: 3.5,
  },

  // Rock-paper-scissors between plans, from the ATTACKER's perspective.
  // Every strategy must lose to something — see the balance invariants.
  STRATEGY_MATRIX: {
    RUSH: { AGGRESSIVE_ROAM: 2.5, ANCHOR_HOLD: -2.5, SPREAD: 1.0 },
    DEFAULT: { AGGRESSIVE_ROAM: -2.0, ANCHOR_HOLD: 2.0, SPREAD: 0.5 },
    SPLIT: { AGGRESSIVE_ROAM: 1.0, ANCHOR_HOLD: 0.5, SPREAD: -2.0 },
  },

  TRADE: {
    base: 0.25,
    perNumbers: 0.02,
    cap: 0.7,
    byStrategy: {
      RUSH: 0.15,
      DEFAULT: 0,
      SPLIT: -0.05,
      ANCHOR_HOLD: 0.1,
      AGGRESSIVE_ROAM: -0.1,
      SPREAD: 0,
    },
  },

  ROUND: {
    maxEngagements: 6,
    clockMax: 180,
    engagementSeconds: [8, 18],
  },
};

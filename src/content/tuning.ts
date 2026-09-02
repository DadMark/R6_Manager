import type { Tuning } from '@engine/types';

/**
 * EVERY magic number in the simulation lives here.
 *
 * This is the file the balance pass (slice S8) edits. The engine reads these
 * values and contains none of its own, so re-tuning the game never requires
 * touching logic. Run `npm run balance:assert` after any change here.
 *
 * ── MEASURED S3 BASELINE (all phases, 3k rounds per cell) ──────────────────
 *
 *   ATK win %      vs ROAM   vs ANCHOR   vs SPREAD      avg
 *   RUSH             61.5      30.7        52.0        48.1
 *   DEFAULT          46.2      54.6        50.5        50.4
 *   SPLIT            56.1      47.1        40.9        48.0
 *
 *   Attack wins 54.2% overall · plant lands in 57.6% of rounds
 *   Outcomes: ATK/ELIM 43.9% · DEF/ELIM 24.2% · DEF/TIME 11.6%
 *             ATK/DETONATION 10.6% · DEF/DEFUSED 9.6%
 *   Anti-gadget in the comp: +7.0pp   ·   Defence reading the site wrong: +13.4pp
 *
 * All three plans sit within 2.5pp of each other on average while keeping
 * sharp individual matchups (RUSH takes 61.5% off roamers and 30.7% off an
 * anchored site). That spread is the goal: no dominant plan, but plans that
 * clearly beat and lose to each other.
 *
 * ── WHAT S3 CHANGED, AND WHY ───────────────────────────────────────────────
 *
 * S1 measured attackers at 38% with a third of rounds expiring on the clock,
 * because a wipe was their only win condition. Adding PLANT first swung it to
 * 76% — planting had become synonymous with winning. Three fixes brought it
 * back to even, and each is load-bearing:
 *
 *   1. PLANT.base cut 0.20 → 0.04. The plant is rolled before every
 *      engagement, so a generous base compounds into near-certainty.
 *   2. Wiping the attackers post-plant now wins the round for the defence
 *      (DEFUSED). Previously a plant beat everything short of an explicit
 *      defuse roll, which fired 0.4% of the time.
 *   3. Attack-side counter-rule grants roughly halved. Five of the six rules
 *      are attack-side, so their bonuses stack in one direction.
 *
 * DEFAULT also needed its clock multiplier raised to 1.45: its cost is
 * supposed to be time, but rounds ended by elimination long before 180s, so
 * slow play was collecting its benefits for free.
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
    // Five of the six counter rules are attack-side, so their bonuses stack in
    // one direction. The defence's counterplay is denial — it shows up as the
    // attacker's rule FAILING, not as a defensive bonus. That asymmetry is
    // right for Siege, but it means these two numbers carry the whole round's
    // balance and must stay modest.
    wallOpen: 2.5,
    flashSupport: 1.8,
    defHeal: 2,
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

  // Reading the defence wrong must be a real cost, or the site pick is theatre.
  SITE: { defSetupOnMatch: 4, atkExecOnMiss: 3, defSetupOnMiss: -2 },

  // RUSH trades information for tempo; DEFAULT buys it back with clock.
  INFO: {
    utilityDivisor: 20,
    cap: 6,
    byStrategy: { RUSH: -2, DEFAULT: 1, SPLIT: 0 },
  },

  // Traps are the price RUSH pays for its tempo.
  TRAP: {
    base: 0.3,
    perIntel: -0.06,
    antiGadget: -0.1,
    utilityScale: 0.05,
    utilityPivot: 75,
    infoScale: -0.03,
    min: 0.05,
    max: 0.65,
    byStrategy: { RUSH: 0.15, DEFAULT: -0.08, SPLIT: 0 },
  },

  ROAM: {
    engageBase: 0.55,
    maxDuels: 2,
    byAtkStrategy: { RUSH: 0.1, DEFAULT: -0.15, SPLIT: 0 },
    byDefStrategy: { AGGRESSIVE_ROAM: 0.2, ANCHOR_HOLD: -0.15, SPREAD: 0 },
  },

  // The attack's real win condition. Without this the round is defender-sided
  // by construction — see the S1 baseline note above.
  PLANT: {
    // Deliberately low at even strength. The plant is checked before every
    // engagement, so a generous base compounds into a near-certainty over a
    // round — which made planting synonymous with winning. Attackers should
    // have to earn the space first, mostly by getting a man up.
    base: 0.04,
    perNumbers: 0.14,
    wallOpen: 0.15,
    siteMismatch: 0.1,
    lateThreshold: 140,
    latePenalty: -0.15,
    min: 0.05,
    max: 0.9,
    byStrategy: { RUSH: 0.1, DEFAULT: 0, SPLIT: 0.05 },
    defuseWindow: 45,
  },

  CLUTCH: { statScale: 0.25, statPivot: 75, perExtraFoe: -2.0 },

  // Slow play buys information but burns the clock — that trade is what stops
  // DEFAULT from dominating once the plant exists.
  CLOCK: {
    prepEnd: 25,
    approachEnd: 60,
    breachEnd: 80,
    executeStart: 70,
    byStrategy: { RUSH: 0.75, DEFAULT: 1.45, SPLIT: 1.0 },
  },
};

import type { Side, Tag } from '../types';

/**
 * How competent an AI opponent is.
 *
 * Escalation is stage-based with NO rubber-banding. A run is shareable by
 * seed, so difficulty that reacts to how well you are playing would make
 * seeds meaningless and read as the game cheating.
 */
export interface AIProfile {
  id: string;
  name: string;
  /** Flat bonus folded into pick scoring — a stronger roster, in effect. */
  skillBias: number;
  /** 0..1 — how strongly it optimises comp coverage. The main difficulty dial. */
  disciplineWeight: number;
  /** 0..1 — bias toward aggressive plans. */
  aggression: number;
  /** 0..1 — how much it reads and counters your last round. */
  adaptivity: number;
  /** Jitter in pick scoring. High noise = scattershot, low = surgical. */
  noise: number;
}

/** What a good lineup needs to cover, and how badly. */
export const NEEDS: Record<Side, Partial<Record<Tag, number>>> = {
  ATK: {
    'hard-breach': 8,
    'anti-gadget': 6,
    intel: 5,
    entry: 5,
    flash: 4,
    'soft-breach': 3,
    support: 2,
  },
  DEF: {
    'anti-breach': 8,
    intel: 5,
    trap: 5,
    roam: 4,
    anchor: 4,
    'intel-denial': 4,
    heal: 3,
  },
};

/** The first operator covering a need is worth full value; the third, almost nothing. */
export const DIMINISH = [1.0, 0.4, 0.1];

/**
 * A 0.35-discipline AI forgets to bring anti-gadget; a 0.95 one never does.
 * That single number does more for perceived difficulty than raw stats.
 */
/**
 * skillBias starts NEGATIVE on purpose.
 *
 * The first pass had it starting at 0, and the resulting curve was flat: the
 * group stage eliminated 47% of runs while the final eliminated 25%. A
 * campaign has to open easy enough that a player learns the counter-matrix
 * before it starts punishing them for not knowing it — and the escalation has
 * to be felt, not just declared on the opponent card.
 */
export const AI_PROFILES: AIProfile[] = [
  { id: 'grupo-1', name: 'Novatos', skillBias: -5.5, disciplineWeight: 0.25, aggression: 0.5, adaptivity: 0, noise: 1.1 },
  { id: 'grupo-2', name: 'Regionais', skillBias: -4, disciplineWeight: 0.45, aggression: 0.5, adaptivity: 0.15, noise: 0.85 },
  { id: 'grupo-3', name: 'Challengers', skillBias: -2.5, disciplineWeight: 0.6, aggression: 0.55, adaptivity: 0.35, noise: 0.65 },
  { id: 'semifinal', name: 'Elite', skillBias: -0.5, disciplineWeight: 0.8, aggression: 0.6, adaptivity: 0.55, noise: 0.4 },
  { id: 'final', name: 'Campeões', skillBias: 1.5, disciplineWeight: 0.95, aggression: 0.7, adaptivity: 0.8, noise: 0.2 },
];

export const profileById = (id: string): AIProfile =>
  AI_PROFILES.find((p) => p.id === id) ?? AI_PROFILES[0]!;

/** 1–5 stars, for the opponent card. Escalation has to be visible. */
export const threatStars = (profile: AIProfile): number =>
  Math.max(1, Math.min(5, Math.round(1 + (profile.skillBias + 5.5) / 1.8)));

/** A one-line pt-BR read on how this opponent plays. */
export function threatDescriptor(profile: AIProfile): string {
  if (profile.disciplineWeight >= 0.9) return 'Disciplinado — sempre traz negação de brecha';
  if (profile.adaptivity >= 0.5) return 'Estuda seu último round e responde';
  if (profile.disciplineWeight >= 0.6) return 'Composição sólida, leitura mediana';
  if (profile.noise >= 0.9) return 'Imprevisível — às vezes esquece o essencial';
  return 'Equilibrado, sem grandes surpresas';
}

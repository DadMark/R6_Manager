/**
 * Tournament shape.
 *
 * PRIMARY SESSION-LENGTH KNOB. Total rounds ≈ sum of (roundsToWin*2-1) across
 * stages; at ~25s per round that sets how long a run takes. If runs overrun
 * ten minutes, cut here — never by thinning the narration, which IS the game.
 */
export interface StageDef {
  id: string;
  name: string;
  aiProfileId: string;
  /** First to this many rounds. */
  roundsToWin: number;
  /** Rarity tiers the opponent's roster is biased toward. */
  rarityBias: string[];
}

export const stages: StageDef[] = [
  { id: 'grupo-1', name: 'Fase de Grupos — Jogo 1', aiProfileId: 'grupo-1', roundsToWin: 2, rarityBias: [] },
  { id: 'grupo-2', name: 'Fase de Grupos — Jogo 2', aiProfileId: 'grupo-2', roundsToWin: 2, rarityBias: [] },
  { id: 'grupo-3', name: 'Fase de Grupos — Jogo 3', aiProfileId: 'grupo-3', roundsToWin: 2, rarityBias: ['elite'] },
  { id: 'semifinal', name: 'Semifinal', aiProfileId: 'semifinal', roundsToWin: 3, rarityBias: ['rare', 'elite'] },
  { id: 'final', name: 'Final', aiProfileId: 'final', roundsToWin: 4, rarityBias: ['elite'] },
];

/** Opponent names, drawn per run so a seed always produces the same bracket. */
export const aiTeamNames: { name: string; tag: string }[] = [
  { name: 'Corvos', tag: 'CRV' },
  { name: 'Jacarés', tag: 'JAC' },
  { name: 'Bandeirantes', tag: 'BND' },
  { name: 'Lobos do Sul', tag: 'LDS' },
  { name: 'Onça Negra', tag: 'ONC' },
  { name: 'Tucanos', tag: 'TUC' },
  { name: 'Capivaras FC', tag: 'CAP' },
  { name: 'Garoa', tag: 'GAR' },
  { name: 'Fênix', tag: 'FNX' },
  { name: 'Maracanã e-Sports', tag: 'MRC' },
];

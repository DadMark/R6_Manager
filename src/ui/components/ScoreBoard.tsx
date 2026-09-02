import type { Side } from '@engine/types';
import styles from './ScoreBoard.module.css';

export function ScoreBoard({
  playerName,
  opponentName,
  scorePlayer,
  scoreOpponent,
  roundsToWin,
  playerSide,
  roundNumber,
}: {
  playerName: string;
  opponentName: string;
  scorePlayer: number;
  scoreOpponent: number;
  roundsToWin: number;
  playerSide: Side;
  roundNumber: number;
}) {
  return (
    <div className={styles.board}>
      <Team name={playerName} score={scorePlayer} side={playerSide} align="right" />
      <div className={styles.middle}>
        <span className={styles.round}>round {roundNumber}</span>
        <span className={styles.target}>melhor de {roundsToWin * 2 - 1}</span>
      </div>
      <Team
        name={opponentName}
        score={scoreOpponent}
        side={playerSide === 'ATK' ? 'DEF' : 'ATK'}
        align="left"
      />
    </div>
  );
}

function Team({
  name,
  score,
  side,
  align,
}: {
  name: string;
  score: number;
  side: Side;
  align: 'left' | 'right';
}) {
  return (
    <div className={`${styles.team} ${align === 'right' ? styles.right : styles.left}`}>
      <span className={styles.name}>{name}</span>
      <span className={`${styles.side} ${side === 'ATK' ? styles.atk : styles.def}`}>
        {side === 'ATK' ? 'ataque' : 'defesa'}
      </span>
      <span className={styles.score}>{score}</span>
    </div>
  );
}

/** Alive/dead dots — the fastest read on how a round is going. */
export function AliveDots({
  total,
  alive,
  side,
  label,
}: {
  total: number;
  alive: number;
  side: Side;
  label: string;
}) {
  return (
    <div className={styles.dots} aria-label={`${label}: ${alive} de ${total} vivos`}>
      <span className={styles.dotsLabel}>{label}</span>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`${styles.dot} ${i < alive ? (side === 'ATK' ? styles.dotAtk : styles.dotDef) : styles.dotDead}`}
        />
      ))}
    </div>
  );
}

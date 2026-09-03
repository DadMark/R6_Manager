import { defaultContent } from '@content/index';
import type { Operator, RoundEndReason } from '@engine/types';
import { useRun } from '@state/RunContext';
import { clearRun } from '@state/persistence';
import { ScoreBoard } from '../components/ScoreBoard';
import styles from './Screens.module.css';

const REASON_LABEL: Record<RoundEndReason, string> = {
  ELIMINATION: 'eliminação total',
  DEFUSED: 'defusor desarmado',
  TIME: 'tempo esgotado',
  DETONATION: 'bomba detonada',
};

export function RoundResultScreen() {
  const { state, dispatch, op } = useRun();
  const match = state.currentMatch!;
  const result = match.lastResult!;
  const playerWon = (result.winner === 'ATK') === (match.playerSide === 'ATK');
  const decided =
    match.scorePlayer >= match.roundsToWin || match.scoreOpponent >= match.roundsToWin;

  return (
    <div className="stack">
      <ScoreBoard
        playerName={state.player.name}
        opponentName={match.opponent.name}
        scorePlayer={match.scorePlayer}
        scoreOpponent={match.scoreOpponent}
        roundsToWin={match.roundsToWin}
        playerSide={match.playerSide}
        roundNumber={match.roundIndex + 1}
      />

      <div className={`panel stack ${playerWon ? styles.wonPanel : styles.lostPanel}`}>
        <p className="eyebrow">{REASON_LABEL[result.reason]}</p>
        <h2 className={playerWon ? styles.wonTitle : styles.lostTitle}>
          {playerWon ? 'Round seu' : 'Round do adversário'}
        </h2>

        <div className={styles.resultMeta}>
          <Meta label="MVP" value={op(result.mvpId)?.name ?? '—'} />
          <Meta label="Plant" value={result.planted ? 'sim' : 'não'} />
          <Meta
            label="Sobreviventes"
            value={`${result.survivors.atk.length} × ${result.survivors.def.length}`}
          />
        </div>

        <button type="button" className="primary" onClick={() => dispatch({ type: 'NEXT_ROUND' })}>
          {decided ? 'Ver resultado da partida' : 'Próximo round'}
        </button>
      </div>
    </div>
  );
}

export function MatchResultScreen() {
  const { state, dispatch } = useRun();
  const match = state.currentMatch!;
  const won = match.scorePlayer > match.scoreOpponent;
  const isFinal = state.bracket.currentStageIndex >= state.bracket.stages.length - 1;

  return (
    <div className="stack">
      <div className={`panel stack ${won ? styles.wonPanel : styles.lostPanel}`}>
        <p className="eyebrow">{state.bracket.stages[state.bracket.currentStageIndex]?.name}</p>
        <h2 className={won ? styles.wonTitle : styles.lostTitle}>
          {won ? `Vitória sobre ${match.opponent.name}` : `Derrota para ${match.opponent.name}`}
        </h2>
        <p className={styles.bigScore}>
          <span className="mono">{match.scorePlayer}</span>
          <span className={styles.scoreSep}>×</span>
          <span className="mono">{match.scoreOpponent}</span>
        </p>

        <button type="button" className="primary" onClick={() => dispatch({ type: 'NEXT_MATCH' })}>
          {!won ? 'Ver resumo da campanha' : isFinal ? 'Ver resumo da campanha' : 'Próxima fase'}
        </button>
      </div>
    </div>
  );
}

export function RunEndScreen() {
  const { state, dispatch, op } = useRun();
  const wonAll = state.bracket.stages.every((s) => s.result === 'WON');
  const reached = state.bracket.stages.filter((s) => s.result).length;
  const roster = state.player.roster.map(op).filter((o): o is Operator => !!o);

  const restart = (): void => {
    clearRun();
    dispatch({ type: 'RESET' });
  };

  const share = (): void => {
    const url = `${window.location.origin}${window.location.pathname}#seed=${encodeURIComponent(state.seed)}`;
    navigator.clipboard?.writeText(url).catch(() => {
      /* clipboard blocked — the seed is on screen anyway */
    });
  };

  return (
    <div className="stack">
      <div className={`panel stack ${wonAll ? styles.wonPanel : styles.lostPanel}`}>
        <p className="eyebrow">Campanha encerrada</p>
        <h2 className={wonAll ? styles.wonTitle : styles.lostTitle}>
          {wonAll ? 'Campeão!' : `Eliminado em ${reached} de ${state.bracket.stages.length}`}
        </h2>

        <ol className={styles.summaryList}>
          {state.bracket.stages.map((stage) => (
            <li key={stage.stageId} className={styles.summaryRow}>
              <span>{stage.name}</span>
              <span className="dim">{stage.opponent.name}</span>
              <span
                className={
                  stage.result === 'WON'
                    ? styles.badgeWon
                    : stage.result === 'LOST'
                      ? styles.badgeLost
                      : styles.badgeNeutral
                }
              >
                {stage.result === 'WON' ? 'vitória' : stage.result === 'LOST' ? 'derrota' : '—'}
              </span>
            </li>
          ))}
        </ol>

        <div className={styles.seedBadge}>
          <span className="eyebrow">Seed</span>
          <code className="mono">{state.seed}</code>
          <button type="button" onClick={share}>
            Copiar link
          </button>
        </div>

        <p className={styles.hint}>
          Seu elenco: {roster.map((o) => o.name).join(', ')}
        </p>

        <button type="button" className="primary" onClick={restart}>
          Nova campanha
        </button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.meta}>
      <span className="eyebrow">{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

export const mapName = defaultContent.maps[0]!.name;

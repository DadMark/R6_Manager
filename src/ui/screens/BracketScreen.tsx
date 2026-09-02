import { profileById, threatDescriptor, threatStars } from '@engine/index';
import type { Operator, StageNode } from '@engine/types';
import { useRun } from '@state/RunContext';
import { RosterStrip } from './DraftScreen';
import styles from './Screens.module.css';

export function BracketScreen() {
  const { state, dispatch, op } = useRun();
  const { stages, currentStageIndex } = state.bracket;
  const current = stages[currentStageIndex];
  const roster = state.player.roster.map(op).filter((o): o is Operator => !!o);

  return (
    <div className="stack">
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Campanha · seed {state.seed}</p>
          <h2>{current?.name ?? 'Campanha'}</h2>
        </div>
      </header>

      <ol className={styles.bracket}>
        {stages.map((stage, i) => (
          <StageRow key={stage.stageId} stage={stage} active={i === currentStageIndex} />
        ))}
      </ol>

      {current && (
        <section className="panel stack">
          <h3 className={styles.sectionTitle}>Seu elenco</h3>
          <RosterStrip roster={roster} />
          <div className="row">
            <button type="button" className="primary" onClick={() => dispatch({ type: 'START_MATCH' })}>
              Jogar {current.name}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function StageRow({ stage, active }: { stage: StageNode; active: boolean }) {
  const profile = profileById(stage.opponent.aiProfileId ?? '');
  const stars = threatStars(profile);

  return (
    <li
      className={`${styles.stageRow} ${active ? styles.stageActive : ''} ${
        stage.result === 'WON' ? styles.stageWon : ''
      } ${stage.result === 'LOST' ? styles.stageLost : ''}`}
    >
      <div className={styles.stageMain}>
        <span className={styles.stageName}>{stage.name}</span>
        <span className={styles.opponentName}>{stage.opponent.name}</span>
        <span className={styles.threatDesc}>{threatDescriptor(profile)}</span>
      </div>
      <div className={styles.stageMeta}>
        <span className={styles.stars} aria-label={`Ameaça ${stars} de 5`}>
          {'★'.repeat(stars)}
          <span className={styles.starsDim}>{'★'.repeat(5 - stars)}</span>
        </span>
        <span className="mono dim">md{stage.roundsToWin * 2 - 1}</span>
        {stage.result && (
          <span className={stage.result === 'WON' ? styles.badgeWon : styles.badgeLost}>
            {stage.result === 'WON' ? 'vitória' : 'derrota'}
          </span>
        )}
      </div>
    </li>
  );
}

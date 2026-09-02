import { useRun } from '@state/RunContext';
import { coverageGaps } from '@engine/index';
import type { Operator, Side } from '@engine/types';
import { OperatorCard } from '../components/OperatorCard';
import { CoveragePanel } from '../components/CoveragePanel';
import styles from './Screens.module.css';

/**
 * The draft.
 *
 * This screen is where the counter-matrix is actually learned, so the coverage
 * panel is load-bearing rather than decoration: it tells the player what their
 * roster still cannot do, in consequences rather than jargon.
 */
export function DraftScreen() {
  const { state, dispatch, op } = useRun();
  const draft = state.draft;
  if (!draft) return null;

  const roster = state.player.roster.map(op).filter((o): o is Operator => !!o);
  const sameSide = roster.filter((o) => o.side === draft.side);
  const gaps = coverageGaps(sameSide, draft.side);
  const offer = draft.offer.map(op).filter((o): o is Operator => !!o);

  return (
    <div className="stack">
      <header className={styles.header}>
        <div>
          <p className="eyebrow">
            Draft · passo {draft.step + 1} de {draft.total}
          </p>
          <h2>{draft.side === 'ATK' ? 'Escolha um atacante' : 'Escolha um defensor'}</h2>
        </div>
        <ProgressPips total={draft.total} done={draft.step} side={draft.side} />
      </header>

      <CoveragePanel lineup={sameSide} side={draft.side} />

      <div className={styles.offerGrid}>
        {offer.map((operator) => (
          <OperatorCard
            key={operator.id}
            operator={operator}
            highlightTags={operator.roles.filter((t) => gaps.includes(t))}
            onClick={() => dispatch({ type: 'DRAFT_PICK', opId: operator.id })}
          />
        ))}
      </div>

      {roster.length > 0 && (
        <section className="panel stack">
          <h3 className={styles.sectionTitle}>Elenco até agora</h3>
          <RosterStrip roster={roster} />
        </section>
      )}
    </div>
  );
}

function ProgressPips({ total, done, side }: { total: number; done: number; side: Side }) {
  return (
    <div className={styles.pips} aria-label={`${done} de ${total} escolhas feitas`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`${styles.pip} ${i < done ? styles.pipDone : ''} ${
            i === done ? (side === 'ATK' ? styles.pipAtk : styles.pipDef) : ''
          }`}
        />
      ))}
    </div>
  );
}

export function RosterStrip({ roster }: { roster: readonly Operator[] }) {
  const atk = roster.filter((o) => o.side === 'ATK');
  const def = roster.filter((o) => o.side === 'DEF');

  return (
    <div className={styles.rosterStrip}>
      <div>
        <span className="eyebrow atk">Ataque</span>
        <p className={styles.rosterNames}>{atk.map((o) => o.name).join(' · ') || '—'}</p>
      </div>
      <div>
        <span className="eyebrow def">Defesa</span>
        <p className={styles.rosterNames}>{def.map((o) => o.name).join(' · ') || '—'}</p>
      </div>
    </div>
  );
}

import { coverageGaps } from '@engine/index';
import type { Operator, Side } from '@engine/types';
import { tagLabel } from './OperatorCard';
import styles from './CoveragePanel.module.css';

/**
 * What the current lineup covers, and what it is missing.
 *
 * This is where the player learns the counter-matrix. Naming the consequence
 * ("reinforced walls will hold you") rather than just the gap is the whole
 * point — a list of missing tags teaches nothing.
 */
const CONSEQUENCE: Partial<Record<string, string>> = {
  'hard-breach': 'sem brecha pesada, o muro reforçado segura você o round todo',
  'anti-gadget': 'sem anti-gadget, a negação de brecha da defesa vale o dobro',
  intel: 'sem intel, você entra no escuro',
  entry: 'sem entrada, ninguém abre espaço no site',
  'anti-breach': 'sem negar brecha, o ataque abre o muro quando quiser',
  trap: 'sem armadilha, o rush sai de graça',
};

export function CoveragePanel({
  lineup,
  side,
  compact = false,
}: {
  lineup: readonly Operator[];
  side: Side;
  compact?: boolean;
}) {
  const gaps = coverageGaps(lineup, side);

  if (lineup.length === 0) {
    return <p className={styles.empty}>Escolha operadores para ver a cobertura.</p>;
  }

  if (gaps.length === 0) {
    return (
      <div className={`${styles.panel} ${styles.ok}`}>
        <span className={styles.icon} aria-hidden="true">
          ✓
        </span>
        <span>Composição cobre tudo que importa.</span>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${styles.warn}`}>
      <span className={styles.icon} aria-hidden="true">
        !
      </span>
      <div className={styles.body}>
        <strong className={styles.title}>
          Faltando: {gaps.map(tagLabel).join(', ')}
        </strong>
        {!compact && (
          <ul className={styles.list}>
            {gaps.map((tag) => (
              <li key={tag}>{CONSEQUENCE[tag] ?? `sem ${tagLabel(tag)}, a composição fica incompleta`}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

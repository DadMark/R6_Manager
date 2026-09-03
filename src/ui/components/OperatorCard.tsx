import type { Operator, Tag } from '@engine/types';
import styles from './OperatorCard.module.css';

const TAG_LABELS: Partial<Record<Tag, string>> = {
  'hard-breach': 'brecha pesada',
  'soft-breach': 'brecha leve',
  'anti-gadget': 'anti-gadget',
  'anti-breach': 'nega brecha',
  'intel-denial': 'nega intel',
  intel: 'intel',
  flash: 'flash',
  entry: 'entrada',
  support: 'suporte',
  shield: 'escudo',
  trap: 'armadilha',
  anchor: 'âncora',
  roam: 'roam',
  heal: 'cura',
};

export const tagLabel = (tag: Tag): string => TAG_LABELS[tag] ?? tag;

export function TagChip({ tag, highlight = false }: { tag: Tag; highlight?: boolean }) {
  return (
    <span className={`${styles.chip} ${highlight ? styles.chipKey : ''}`}>{tagLabel(tag)}</span>
  );
}

export function OperatorCard({
  operator,
  selected = false,
  disabled = false,
  onClick,
  highlightTags = [],
}: {
  operator: Operator;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  highlightTags?: readonly Tag[];
}) {
  const Root = onClick ? 'button' : 'div';

  return (
    <Root
      type={onClick ? 'button' : undefined}
      className={`${styles.card} ${styles[operator.side.toLowerCase()]} ${
        selected ? styles.selected : ''
      }`}
      onClick={onClick}
      disabled={disabled || undefined}
      aria-pressed={onClick ? selected : undefined}
    >
      <div className={styles.head}>
        <span className={styles.name}>{operator.name}</span>
        <span className={`${styles.rarity} ${styles[operator.rarity]}`}>{operator.rarity}</span>
      </div>

      <div className={styles.unit}>
        {operator.unit} · velocidade {operator.speed}
      </div>

      <div className={styles.tags}>
        {operator.roles.map((tag) => (
          <TagChip key={tag} tag={tag} highlight={highlightTags.includes(tag)} />
        ))}
      </div>

      <dl className={styles.stats}>
        <Stat label="MIRA" value={operator.stats.aim} />
        <Stat label="UTIL" value={operator.stats.utility} />
        <Stat label="ENTR" value={operator.stats.entry} />
        <Stat label="FRIO" value={operator.stats.clutch} />
      </dl>
    </Root>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>
        {value}
        <span className={styles.bar} style={{ '--v': `${((value - 55) / 40) * 100}%` } as React.CSSProperties} />
      </dd>
    </div>
  );
}

import type { BombSite, StrategyDef, Strategy } from '@engine/types';
import styles from './Pickers.module.css';

/** Where to hit (attacking) or where to set up (defending). */
export function SitePicker({
  sites,
  value,
  onChange,
  side,
}: {
  sites: readonly BombSite[];
  value: string;
  onChange: (site: string) => void;
  side: 'ATK' | 'DEF';
}) {
  return (
    <div className={styles.group} role="radiogroup" aria-label="Bombsite">
      {sites.map((site) => (
        <button
          key={site.id}
          type="button"
          role="radio"
          aria-checked={value === site.id}
          className={`${styles.option} ${value === site.id ? styles.active : ''} ${
            side === 'ATK' ? styles.atk : styles.def
          }`}
          onClick={() => onChange(site.id)}
        >
          <span className={styles.optionName}>{site.name}</span>
        </button>
      ))}
    </div>
  );
}

export function StrategyPicker({
  strategies,
  value,
  onChange,
  side,
}: {
  strategies: readonly StrategyDef[];
  value: Strategy;
  onChange: (strategy: Strategy) => void;
  side: 'ATK' | 'DEF';
}) {
  return (
    <div className={styles.stack} role="radiogroup" aria-label="Estratégia">
      {strategies.map((strategy) => (
        <button
          key={strategy.id}
          type="button"
          role="radio"
          aria-checked={value === strategy.id}
          className={`${styles.strategy} ${value === strategy.id ? styles.active : ''} ${
            side === 'ATK' ? styles.atk : styles.def
          }`}
          onClick={() => onChange(strategy.id)}
        >
          <span className={styles.optionName}>{strategy.name}</span>
          <span className={styles.blurb}>{strategy.blurb}</span>
        </button>
      ))}
    </div>
  );
}

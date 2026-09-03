import { useEffect, useRef } from 'react';
import type { ModifierBreakdown, NarrationLine, RoundEvent } from '@engine/types';
import styles from './NarrationFeed.module.css';

/**
 * The play-by-play feed. This is the game's main surface — everything else
 * exists to set up what gets read here.
 */
export function NarrationFeed({
  lines,
  events,
  debug = false,
}: {
  lines: readonly NarrationLine[];
  events: readonly RoundEvent[];
  debug?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lines.length]);

  const modsFor = (eventId: string): ModifierBreakdown | null => {
    const event = events.find((e) => e.id === eventId);
    return event && 'mods' in event ? event.mods : null;
  };

  return (
    // aria-live so the round is followable by screen reader as it plays.
    <ol className={styles.feed} aria-live="polite" aria-relevant="additions">
      {lines.map((line) => {
        const mods = debug ? modsFor(line.eventId) : null;
        return (
          <li key={line.eventId} className={`${styles.line} ${styles[line.tone]}`}>
            <span className={styles.text}>{line.text}</span>
            {mods && (
              <span className={styles.debug}>
                base {mods.base} · num {mods.numbers} · util {mods.utility} · strat {mods.strategy} ·
                exec {mods.exec} → <strong>p={mods.probability}</strong> roll={mods.roll}
              </span>
            )}
          </li>
        );
      })}
      <div ref={endRef} />
    </ol>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { NarrationLine } from '@engine/types';

/**
 * Reveal narration line by line, paced by each line's `beat`.
 *
 * Timing lives here and nowhere else — the engine returns a relative weight
 * and the UI decides what that means in milliseconds. That separation is what
 * lets the same narration stream instantly to a terminal and dramatically to
 * a browser.
 */
const MS_PER_BEAT = 620;
const HYPE_PAUSE = 240;

export interface ProgressiveReveal {
  /** The lines revealed so far. */
  visible: NarrationLine[];
  done: boolean;
  /** Reveal everything immediately. */
  skip: () => void;
}

export function useProgressiveReveal(
  lines: readonly NarrationLine[],
  speed: 1 | 2 | 4,
  enabled = true,
): ProgressiveReveal {
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restart whenever a new round's narration arrives.
  useEffect(() => {
    setCount(enabled ? 0 : lines.length);
  }, [lines, enabled]);

  useEffect(() => {
    if (!enabled || count >= lines.length) return;

    const line = lines[count]!;
    const delay = (MS_PER_BEAT * line.beat) / speed + (line.tone === 'hype' ? HYPE_PAUSE / speed : 0);

    timer.current = setTimeout(() => setCount((c) => c + 1), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [count, lines, speed, enabled]);

  return {
    visible: lines.slice(0, count),
    done: count >= lines.length,
    skip: () => setCount(lines.length),
  };
}

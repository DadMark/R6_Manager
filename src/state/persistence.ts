import type { RunState } from '@engine/types';

/**
 * Run persistence.
 *
 * The stored state carries only the SEED, never an RNG or a cursor — every
 * simulation reconstructs its generator from `rngFor(seed, ...)`. That is what
 * makes reloading mid-run reproduce results exactly.
 *
 * Every access is wrapped: storage throws outright in private windows and in
 * some embedded contexts, and a game that cannot save should still play.
 */

const KEY = 'r6m.run.v1';
const SCHEMA_VERSION = 1;

export function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RunState;
    // A run is ten minutes long. Discarding a stale schema costs the player
    // almost nothing; a migration path would cost more than it is worth.
    if (parsed?.schemaVersion !== SCHEMA_VERSION) return null;
    if (parsed.phase === 'MENU' || !parsed.seed) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function saveRun(state: RunState): void {
  try {
    if (state.phase === 'MENU') {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Out of quota or storage disabled — play on without saving.
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/** Read a shared seed off the URL hash (`#seed=copa-2026`). */
export function seedFromHash(): string {
  try {
    const match = /(?:^|[#&])seed=([^&]+)/.exec(window.location.hash);
    return match?.[1] ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}

export function writeSeedToHash(seed: string): void {
  try {
    window.history.replaceState(null, '', `#seed=${encodeURIComponent(seed)}`);
  } catch {
    /* nothing to do */
  }
}

/** A short, pronounceable seed — these get shared, so they should be typable. */
export function randomSeed(): string {
  const words = ['alfa', 'bravo', 'delta', 'eco', 'foxtrot', 'gama', 'kilo', 'lima', 'nova', 'tango'];
  const word = words[Math.floor(Math.random() * words.length)]!;
  return `${word}-${Math.floor(1000 + Math.random() * 9000)}`;
}

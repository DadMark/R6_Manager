import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { initialRunState, profileById, runReducer, type RunAction, type RunDeps } from '@engine/index';
import type { Operator, RunState } from '@engine/types';
import { defaultContent } from '@content/index';
import { aiTeamNames, stages } from '@content/tournament';
import { loadRun, saveRun, writeSeedToHash } from './persistence';

/**
 * The app's only piece of global state.
 *
 * This is a thin adapter over the PURE `runReducer` in the engine — all the
 * game logic lives there, which is why the run is testable in Node without
 * React and why the same reducer can drive a server-side PvP match later.
 */

const deps: RunDeps = { content: defaultContent, stages, aiTeamNames, profileById };

interface RunContextValue {
  state: RunState;
  dispatch: (action: RunAction) => void;
  /** Operator lookup, memoised once for the whole app. */
  operators: Map<string, Operator>;
  op: (id: string) => Operator | undefined;
}

const RunContext = createContext<RunContextValue | null>(null);

const reducer = (state: RunState, action: RunAction): RunState => runReducer(state, action, deps);

export function RunProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadRun() ?? initialRunState());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save: the reducer fires several times per round and writing the
  // whole run on each one is wasteful.
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveRun(state), 200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  // Keep the shareable seed in the URL so a run can be handed to someone else.
  useEffect(() => {
    if (state.seed) writeSeedToHash(state.seed);
  }, [state.seed]);

  const operators = useMemo(
    () => new Map(defaultContent.operators.map((o) => [o.id, o])),
    [],
  );

  const op = useCallback((id: string) => operators.get(id), [operators]);

  const value = useMemo<RunContextValue>(
    () => ({ state, dispatch, operators, op }),
    [state, operators, op],
  );

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
}

export function useRun(): RunContextValue {
  const value = useContext(RunContext);
  if (!value) throw new Error('useRun must be used inside <RunProvider>');
  return value;
}

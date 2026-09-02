import { useEffect } from 'react';
import { useRun } from '@state/RunContext';
import { BracketScreen } from '@ui/screens/BracketScreen';
import { DraftScreen } from '@ui/screens/DraftScreen';
import { HomeScreen } from '@ui/screens/HomeScreen';
import { MatchResultScreen, RoundResultScreen, RunEndScreen } from '@ui/screens/ResultScreens';
import { RoundPlaybackScreen } from '@ui/screens/RoundPlaybackScreen';
import { RoundSetupScreen } from '@ui/screens/RoundSetupScreen';

/**
 * The run is a linear machine, so `state.phase` picks the screen. No router:
 * URLs would falsely promise deep links into a run that only exists in this
 * browser. The one exception is `#seed=`, handled in the run context.
 */
export default function App() {
  const { state, dispatch } = useRun();

  // `?debug=1` turns on the duel arithmetic overlay — the most useful thing
  // in the app when a result looks wrong.
  useEffect(() => {
    const debug = new URLSearchParams(window.location.search).get('debug') === '1';
    if (debug && !state.settings.debugMath) {
      dispatch({ type: 'SET_SETTINGS', settings: { debugMath: true } });
    }
  }, [state.settings.debugMath, dispatch]);

  return (
    <div className="app">
      <main className="shell">{renderPhase(state.phase)}</main>
    </div>
  );
}

function renderPhase(phase: ReturnType<typeof useRun>['state']['phase']) {
  switch (phase) {
    case 'MENU':
      return <HomeScreen hasSavedRun={false} />;
    case 'DRAFT':
      return <DraftScreen />;
    case 'BRACKET':
      return <BracketScreen />;
    case 'ROUND_SETUP':
      return <RoundSetupScreen />;
    case 'ROUND_PLAYBACK':
      return <RoundPlaybackScreen />;
    case 'ROUND_RESULT':
      return <RoundResultScreen />;
    case 'MATCH_RESULT':
      return <MatchResultScreen />;
    case 'RUN_END':
      return <RunEndScreen />;
  }
}

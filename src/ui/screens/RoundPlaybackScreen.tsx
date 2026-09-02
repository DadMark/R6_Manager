import { useMemo } from 'react';
import type { RoundEvent } from '@engine/types';
import { useRun } from '@state/RunContext';
import { AliveDots, ScoreBoard } from '../components/ScoreBoard';
import { NarrationFeed } from '../components/NarrationFeed';
import { useProgressiveReveal } from '../hooks/useProgressiveReveal';
import styles from './Screens.module.css';

const SPEEDS: (1 | 2 | 4)[] = [1, 2, 4];

/**
 * Alive counts as of the last revealed event, so the dots track the round as
 * it plays.
 *
 * Deaths are attributed by operator identity rather than by guessing from the
 * event kind — a roam duel can be won by either side, and the clutch hero can
 * be a defender.
 */
function aliveAt(
  events: readonly RoundEvent[],
  upToEventId: string | undefined,
  atkIds: ReadonlySet<string>,
): { atk: number; def: number } {
  const dead = new Set<string>();

  for (const event of events) {
    switch (event.kind) {
      case 'TRAP_TRIGGER':
        if (event.lethal) dead.add(event.victimId);
        break;
      case 'ROAM_DUEL':
        dead.add(event.loserId);
        break;
      case 'DUEL':
        dead.add(event.loserId);
        if (event.traded) dead.add(event.winnerId);
        break;
      case 'CLUTCH_STEP':
        dead.add(event.heroWon ? event.foeId : event.heroId);
        break;
      case 'COUNTER_PLAY':
        if (event.casualtyId) dead.add(event.casualtyId);
        break;
      default:
        break;
    }
    if (event.id === upToEventId) break;
  }

  let atkDead = 0;
  for (const id of dead) if (atkIds.has(id)) atkDead++;

  return { atk: Math.max(0, 5 - atkDead), def: Math.max(0, 5 - (dead.size - atkDead)) };
}

export function RoundPlaybackScreen() {
  const { state, dispatch } = useRun();
  const match = state.currentMatch!;
  const result = match.lastResult!;
  const speed = state.settings.revealSpeed;

  const { visible, done, skip } = useProgressiveReveal(result.narration, speed);

  const playerIsAtk = match.playerSide === 'ATK';

  // Which ids were on the attacking side this round, so deaths can be
  // attributed without guessing.
  const atkIds = useMemo(() => {
    const plan = playerIsAtk ? match.lastPlayerPlan : match.lastOpponentPlan;
    return new Set(plan?.lineup ?? []);
  }, [playerIsAtk, match.lastPlayerPlan, match.lastOpponentPlan]);

  const alive = useMemo(
    () => aliveAt(result.events, visible.at(-1)?.eventId, atkIds),
    [result.events, visible, atkIds],
  );

  return (
    <div className="stack">
      <ScoreBoard
        playerName={state.player.name}
        opponentName={match.opponent.name}
        scorePlayer={match.scorePlayer}
        scoreOpponent={match.scoreOpponent}
        roundsToWin={match.roundsToWin}
        playerSide={match.playerSide}
        roundNumber={match.roundIndex + 1}
      />

      <div className="panel stack">
        <div className="spread">
          <div className="row">
            <AliveDots
              total={5}
              alive={playerIsAtk ? alive.atk : alive.def}
              side={match.playerSide}
              label="você"
            />
            <AliveDots
              total={5}
              alive={playerIsAtk ? alive.def : alive.atk}
              side={playerIsAtk ? 'DEF' : 'ATK'}
              label={match.opponent.tag.toLowerCase()}
            />
          </div>

          <div className="row">
            <div className={styles.speeds} role="group" aria-label="Velocidade da narração">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.speed} ${speed === s ? styles.speedActive : ''}`}
                  onClick={() => dispatch({ type: 'SET_SETTINGS', settings: { revealSpeed: s } })}
                  aria-pressed={speed === s}
                >
                  {s}×
                </button>
              ))}
            </div>
            {!done && (
              <button type="button" onClick={skip}>
                Pular
              </button>
            )}
          </div>
        </div>

        <NarrationFeed
          lines={visible}
          events={result.events}
          debug={state.settings.debugMath}
        />

        {done && (
          <button
            type="button"
            className="primary"
            onClick={() => dispatch({ type: 'FINISH_PLAYBACK' })}
          >
            Ver resultado do round
          </button>
        )}
      </div>
    </div>
  );
}

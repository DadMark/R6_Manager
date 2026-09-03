import { useMemo, useState } from 'react';
import { defaultContent } from '@content/index';
import { LINEUP_SIZE } from '@engine/index';
import type { Operator, RoundPlan, Strategy } from '@engine/types';
import { useRun } from '@state/RunContext';
import { CoveragePanel } from '../components/CoveragePanel';
import { OperatorCard } from '../components/OperatorCard';
import { SitePicker, StrategyPicker } from '../components/Pickers';
import { ScoreBoard } from '../components/ScoreBoard';
import styles from './Screens.module.css';

/**
 * Pick five, a site, and a plan.
 *
 * "Repetir escalação" is a requirement rather than polish: three decisions
 * across ~20 rounds is 60 interactions, and without a one-click default the
 * agency becomes a chore and the run stops fitting in ten minutes.
 */
export function RoundSetupScreen() {
  const { state, dispatch, op } = useRun();
  const match = state.currentMatch!;
  const side = match.playerSide;
  const map = defaultContent.maps[0]!;

  const available = useMemo(
    () => state.player.roster.map(op).filter((o): o is Operator => !!o && o.side === side),
    [state.player.roster, op, side],
  );

  const previous = match.lastPlayerPlan;
  const canRepeat =
    !!previous && previous.lineup.every((id) => available.some((o) => o.id === id));

  const [selected, setSelected] = useState<string[]>(() =>
    available.slice(0, LINEUP_SIZE).map((o) => o.id),
  );
  const [site, setSite] = useState<string>(() => map.sites[0]!.id);
  const [strategy, setStrategy] = useState<Strategy>(() => (side === 'ATK' ? 'DEFAULT' : 'SPREAD'));

  const lineup = selected.map(op).filter((o): o is Operator => !!o);
  const ready = selected.length === LINEUP_SIZE;

  const toggle = (id: string): void => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length < LINEUP_SIZE
          ? [...current, id]
          : current,
    );
  };

  const submit = (plan: RoundPlan): void => dispatch({ type: 'SUBMIT_PLAN', plan });

  return (
    <div className="stack">
      <ScoreBoard
        playerName={state.player.name}
        opponentName={match.opponent.name}
        scorePlayer={match.scorePlayer}
        scoreOpponent={match.scoreOpponent}
        roundsToWin={match.roundsToWin}
        playerSide={side}
        roundNumber={match.roundIndex + 1}
      />

      <header className={styles.header}>
        <div>
          <p className="eyebrow">{map.name}</p>
          <h2>
            Você {side === 'ATK' ? 'ataca' : 'defende'} — escale {LINEUP_SIZE}
          </h2>
        </div>
        {canRepeat && (
          <button type="button" onClick={() => submit(previous!)}>
            Repetir escalação anterior
          </button>
        )}
      </header>

      <div className={styles.setupGrid}>
        <section className="stack">
          <div className="spread">
            <h3 className={styles.sectionTitle}>Elenco</h3>
            <span className="mono dim">
              {selected.length}/{LINEUP_SIZE}
            </span>
          </div>
          <div className={styles.rosterGrid}>
            {available.map((operator) => (
              <OperatorCard
                key={operator.id}
                operator={operator}
                selected={selected.includes(operator.id)}
                disabled={!selected.includes(operator.id) && selected.length >= LINEUP_SIZE}
                onClick={() => toggle(operator.id)}
              />
            ))}
          </div>
          <CoveragePanel lineup={lineup} side={side} />
        </section>

        <aside className="stack">
          <section className="panel stack">
            <h3 className={styles.sectionTitle}>
              {side === 'ATK' ? 'Onde bater' : 'Onde montar'}
            </h3>
            <SitePicker sites={map.sites} value={site} onChange={setSite} side={side} />
          </section>

          <section className="panel stack">
            <h3 className={styles.sectionTitle}>Estratégia</h3>
            <StrategyPicker
              strategies={side === 'ATK' ? defaultContent.strategies.atk : defaultContent.strategies.def}
              value={strategy}
              onChange={setStrategy}
              side={side}
            />
          </section>

          <button
            type="button"
            className="primary"
            disabled={!ready}
            onClick={() => submit({ lineup: selected, site, strategy })}
          >
            {ready ? 'Jogar o round' : `Escolha mais ${LINEUP_SIZE - selected.length}`}
          </button>
        </aside>
      </div>
    </div>
  );
}

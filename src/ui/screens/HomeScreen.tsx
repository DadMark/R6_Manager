import { useState } from 'react';
import { useRun } from '@state/RunContext';
import { randomSeed, seedFromHash } from '@state/persistence';
import styles from './Screens.module.css';

export function HomeScreen({ hasSavedRun }: { hasSavedRun: boolean }) {
  const { dispatch } = useRun();
  const [seed, setSeed] = useState(() => seedFromHash() || randomSeed());
  const [teamName, setTeamName] = useState('');

  return (
    <div className={styles.hero}>
      <div className={styles.heroHead}>
        <p className="eyebrow">Manager narrado · Rainbow Six Siege</p>
        <h1 className={styles.title}>R6 Manager</h1>
        <p className={styles.lede}>
          Você é o técnico. Drafta o elenco, escala cinco operadores por round, escolhe o site e a
          estratégia — e lê o round acontecer.
        </p>
      </div>

      <div className="panel stack">
        <label className={styles.field}>
          <span className="eyebrow">Nome do time</span>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Seu time"
            maxLength={24}
          />
        </label>

        <label className={styles.field}>
          <span className="eyebrow">Seed</span>
          <div className="row">
            <input
              className={styles.seedInput}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              maxLength={32}
              spellCheck={false}
            />
            <button type="button" onClick={() => setSeed(randomSeed())}>
              Sortear
            </button>
          </div>
          <span className={styles.hint}>
            A mesma seed gera exatamente a mesma campanha — dá pra compartilhar e comparar.
          </span>
        </label>

        <div className="row">
          <button
            type="button"
            className="primary"
            onClick={() => dispatch({ type: 'START_RUN', seed, teamName })}
          >
            Nova campanha
          </button>
          {hasSavedRun && (
            <button type="button" onClick={() => window.location.reload()}>
              Continuar campanha salva
            </button>
          )}
        </div>
      </div>

      <p className={styles.footnote}>
        Operadores de Rainbow Six Siege são propriedade da Ubisoft. Projeto de fã, sem afiliação.
      </p>
    </div>
  );
}

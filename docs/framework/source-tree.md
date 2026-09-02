# Source Tree — R6 Manager

```
src/
├─ engine/              PURO — sem React, sem relógio, sem Math.random
│  ├─ types.ts          contrato de tipos entre motor, narração e UI
│  ├─ rng.ts            xmur3 + mulberry32 + sub-semeadura (rngFor)
│  ├─ math.ts           sigmoid, clamp, arredondamento
│  ├─ rating.ts         nota por tipo de duelo, helpers de tag
│  ├─ duel.ts           resolveDuel + rollTrade
│  ├─ simulateRound.ts  pipeline de fases do round
│  ├─ narration/        eventos → comentário (puro, sem tempo)
│  ├─ index.ts          barrel público — a UI importa só daqui
│  └─ __tests__/        pureza, determinismo, balanceamento, narração
│
├─ content/             DADOS SUBSTITUÍVEIS — a IP da Ubisoft vive só aqui
│  ├─ operators.*.ts    elenco de operadores
│  ├─ tuning.ts         TODOS os números mágicos + baseline medido
│  ├─ maps.ts           mapas, sites, estratégias
│  ├─ narration/pt-BR/  banco de templates de narração
│  └─ index.ts          monta o GameContent entregue ao motor
│
scripts/
└─ sim.ts               narra um round no stdout (artefato da fatia S1)

docs/
├─ framework/           tech-stack, coding-standards, source-tree (AIOX devLoadAlwaysFiles)
└─ stories/             stories de desenvolvimento por fatia
```

## Onde mexer

| Quero... | Arquivo |
|---|---|
| Ajustar balanceamento | `src/content/tuning.ts` |
| Adicionar/editar operador | `src/content/operators.{attack,defense}.ts` |
| Escrever narração | `src/content/narration/pt-BR/index.ts` |
| Mudar como um duelo resolve | `src/engine/duel.ts` |
| Adicionar uma fase de round | `src/engine/simulateRound.ts` + `src/engine/phases/` |
| Adicionar interação de utility | `src/content/counterRules.ts` (dado, não código) |

## Fatias entregues

- **S0** scaffold — Vite, TS strict, Vitest, fronteira de pureza no ESLint ✅
- **S1** um round simula e narra, sem UI ✅
- **S2** casca de UI com revelação progressiva — próxima
- **S3** round completo (PREP/APPROACH/BREACH/PLANT/CLUTCH + counterRules)
- **S4** agência por round · **S5** partida e chaveamento · **S6** draft
- **S7** persistência e seed · **S8** balanceamento · **S9** polimento e deploy

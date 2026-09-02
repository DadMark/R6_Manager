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
│  ├─ operators.{attack,defense}.ts    elenco licenciado
│  ├─ operators.licensed.ts            barrel do pacote licenciado (padrão)
│  ├─ operators.generic.ts             pacote livre de IP, gerado
│  ├─ counterRules.ts   a matriz de contra-jogo, como dado
│  ├─ tournament.ts     fases, formato e nomes de adversários
│  ├─ tuning.ts         TODOS os números mágicos + baseline medido
│  ├─ maps.ts           mapas, sites, estratégias
│  ├─ narration/pt-BR/  banco de templates de narração
│  └─ index.ts          monta o GameContent entregue ao motor
│
├─ state/              RunContext, persistência em localStorage
└─ ui/                 screens/ components/ hooks/ styles/

scripts/
├─ sim.ts               narra um round no stdout
├─ balance.ts           harness de simulação em massa + invariantes
└─ gen-generic-pack.ts  regenera o pacote livre de IP
play-check.mjs          joga uma campanha no Chromium (verificação manual)

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
| Mexer na dificuldade da IA | `src/engine/ai/difficulty.ts` |
| Mudar o tamanho da campanha | `src/content/tournament.ts` |
| Escrever uma tela | `src/ui/screens/` |

## Troca de pacote de operadores

`VITE_CONTENT_PACK=generic npm run build` resolve o alias `@operators` para o
pacote livre de IP **em tempo de build**, então os nomes licenciados não entram
no bundle. Um ternário em runtime empacotaria os dois e não resolveria nada.

## Fatias entregues — todas

- **S0** scaffold · **S1** round narrado sem UI
- **S3** round completo (PREP/APPROACH/BREACH/PLANT/POST_PLANT/CLUTCH + counterRules)
- **S2** UI · **S4** agência e IA · **S5** partida e chaveamento · **S6** draft
- **S7** persistência e seed · **S8** balanceamento · **S9** polimento e build

Fase 2 (não implementada): PvP assíncrono rodando o mesmo motor no servidor.
O `engine/` não importa nada fora de si e devolve dados serializáveis, então
movê-lo para um serviço é um `mv`, não uma reescrita.

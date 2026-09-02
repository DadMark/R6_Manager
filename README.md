# R6 Manager

Jogo de navegador **manager/coach narrado** sobre Rainbow Six Siege.

Você é o técnico: drafta um elenco, e a cada round escolhe 5 operadores, o bombsite e a estratégia — e lê o round acontecer, jogada a jogada. Inspirado no **7 a 0** (run roguelike com draft) e no **Brasfoot/Browserfoot** (partida narrada movida por atributos).

## O que faz isso ser Siege

A matriz de contra-jogo de utility. A jogada-assinatura: uma hard breach (Thermite) contestada por anti-breach (Bandit) só resolve a favor do ataque se você também tiver draftado anti-gadget (Thatcher) — o que praticamente **dobra** a taxa de abertura do muro.

E isso aparece na narração, não escondido num rolo de dados:

> » *Thatcher joga a EMP na parede — as baterias do Bandit fritam. A carga do Thermite queima o reforço!*

É por isso que o draft importa.

## Rodando

```bash
npm install
npm run sim -- --seed teste-1     # narra um round no terminal
npm run sim -- --seed teste-1 --debug   # com a aritmética dos duelos
npm test
```

```
────────────────────────────────────────────────────────────────────────
  Fúria (ataque)  vs  Corvos (defesa)
  Mapa: Chalé   Seed: teste-1
────────────────────────────────────────────────────────────────────────
   Corvos armou em outro canto e Fúria bateu no Porão. Rotação obrigatória!
   IQ entra com tudo e Kapkan não teve tempo de reagir.
   Hibana (SAT) ganha o duelo contra Frost.
 » Wipe completo. Fúria leva, com Buck brilhando.
────────────────────────────────────────────────────────────────────────
```

## Arquitetura em uma frase

O motor de simulação (`src/engine/`) é **puro** — sem React, sem relógio, sem `Math.random` — imposto por ESLint *e* por teste. Ele recebe o conteúdo do jogo como parâmetro em vez de importá-lo.

Isso compra três coisas: runs determinísticas e compartilháveis por seed; testes que rodam em Node sem mocks; e PvP assíncrono na fase 2 rodando o mesmo motor no servidor, sem reescrita.

Detalhes em [`docs/framework/`](docs/framework/).

## Status

| Fatia | Estado |
|---|---|
| S0 scaffold | ✅ |
| S1 round simula e narra | ✅ |
| S2 casca de UI | próxima |
| S3 round completo (plant, breach, clutch) | |
| S4–S9 agência, chaveamento, draft, balanceamento, deploy | |

## Nota legal

Operadores de Rainbow Six Siege são propriedade da Ubisoft. Todo nome, unidade e gadget vive apenas em `src/content/` — o motor nunca referencia um id de operador, e um teste garante isso. Trocar por `operators.generic.ts` reskina o jogo inteiro por variável de ambiente. Este é um projeto de fã, sem afiliação com a Ubisoft.

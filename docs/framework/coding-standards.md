# Coding Standards — R6 Manager

## A regra que sustenta o projeto: pureza do motor

`src/engine/` é **puro**. Sem React, sem `window`/`document`, sem `Date`, sem `Math.random`.

Isso não é convenção — é imposto por ferramenta:

- `eslint.config.js` bloqueia esses imports, globais e propriedades dentro de `src/engine/**`.
- `src/engine/__tests__/purity.test.ts` lê cada arquivo do motor como backstop, pegando também acesso dinâmico que o lint não enxerga.

Três coisas dependem disso:

1. **Determinismo** — uma run é reproduzível e compartilhável por seed.
2. **Testabilidade** — o motor roda em Node, sem DOM, sem mocks.
3. **PvP na fase 2** — mover o motor para um serviço é `mv`, não reescrita.

### O motor recebe conteúdo, nunca importa

```ts
// ✅ certo
export function simulateRound(input: SimulateRoundInput, rng: Rng): RoundResult

// ❌ errado — acopla o motor aos dados e quebra a substituição de IP
import { defaultContent } from '@content/index';
```

### Aleatoriedade sempre injetada e sub-semeada

```ts
// ✅ cada unidade de trabalho tem seu próprio fluxo
const rng = rngFor(seed, matchIndex, roundIndex, 'sim');

// ❌ nunca
Math.random();
```

Sub-semear por `(seed, partida, round, propósito)` significa que a persistência guarda só a string da seed, que qualquer round é re-simulável isoladamente, e que adicionar um rolo de dados numa fase não desloca os resultados de outra.

## Números mágicos moram em `content/tuning.ts`

Nenhuma constante de balanceamento no motor. Se você está prestes a escrever `* 2.2` dentro de `src/engine/`, ela pertence ao `tuning.ts`.

## A matriz de contra-jogo é dado, não código

Interações entre utilitários são `CounterRule` em `content/counterRules.ts`, resolvidas por uma única função genérica. Um `if (op.id === 'atk_thermite')` no motor é bug, não atalho.

## Fronteira de IP

Nomes de operadores, unidades e gadgets são marcas da Ubisoft e vivem **somente** em `src/content/`. O motor nunca referencia um id de operador literal — o `purity.test.ts` garante. É isso que permite trocar `operators.generic.ts` e reskinar o jogo inteiro por variável de ambiente.

## Narração

- Mínimo 3 variantes por chave (6 após o passe de balanceamento).
- Linhas com até 160 caracteres.
- **Viradas improváveis precisam soar improváveis.** Um rolo de 8% narrado como rotina é o que lê como quebrado — mais do que a probabilidade em si.
- Tempo de exibição vive só na UI. A narração devolve `beat`, a UI converte em milissegundos.

## Testes

Testes estatísticos percorrem uma sequência **fixa** de seeds. São estatísticos sem serem instáveis: uma falha é regressão real, nunca ruído.

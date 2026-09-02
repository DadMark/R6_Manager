# Tech Stack — R6 Manager

| Camada | Escolha | Versão | Observação |
|---|---|---|---|
| Build | Vite | ^7.1 | `base: './'` — o `dist/` publica em qualquer host estático |
| UI | React | ^19.2 | Só a camada de apresentação; o motor é framework-free |
| Linguagem | TypeScript | ^5.9 | `strict` + `noUncheckedIndexedAccess` |
| Testes | Vitest | ^3.2 | `environment: 'node'` — testes do motor rodam sem DOM |
| Lint | ESLint + typescript-eslint | ^9.39 / ^8.46 | Carrega a regra de fronteira de pureza do motor |
| Scripts | tsx | ^4.20 | Roda `scripts/sim.ts` e `scripts/balance.ts` |

## Dependências de runtime

**Exatamente duas: `react` e `react-dom`.** Todo o resto é `devDependency`.

Isso é deliberado. O jogo é lido, não assistido — é basicamente um feed de texto — e o público-alvo (mesmo do *7 a 0*) joga em rede móvel brasileira. Cada dependência de runtime é peso que atrasa o primeiro round.

## O que NÃO usamos, e por quê

| Descartado | Motivo |
|---|---|
| Zustand / Redux | `RunState` é uma árvore só com transições discretas. O `runReducer` é um adaptador fino sobre o `engine/run.ts` puro — uma lib de estado quebraria essa testabilidade. |
| React Router | A run é linear. Um discriminante `phase` no `RunState` escolhe a tela. Única exceção: `#seed=` no hash. |
| Tailwind / CSS-in-JS | O jogo é 90% tipografia. CSS Modules + `tokens.css` bastam. Trocável depois sem impacto. |
| Next.js | Sem SSR, sem rotas. O PvP da fase 2 quer um serviço isolado importando `src/engine`, não uma API route acoplada à UI. |

## Comandos

```bash
npm run dev        # servidor de desenvolvimento
npm test           # suíte completa
npm run lint       # ESLint, incluindo a fronteira de pureza
npm run typecheck  # tsc -b --noEmit
npm run sim -- --seed teste-1          # narra um round no terminal
npm run sim -- --seed teste-1 --debug  # com o detalhamento aritmético dos duelos
```

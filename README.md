# R6 Manager

Jogo de navegador **manager/coach narrado** sobre Rainbow Six Siege.

Você é o técnico. Drafta um elenco, e a cada round escolhe 5 operadores, o bombsite e a estratégia — e lê o round acontecer, jogada a jogada. Inspirado no **7 a 0** (run roguelike com draft) e no **Brasfoot/Browserfoot** (partida narrada movida por atributos).

## O que faz isso ser Siege

A matriz de contra-jogo de utility. A jogada-assinatura: uma hard breach (Thermite) contestada por anti-breach (Bandit) só resolve a favor do ataque se você também tiver draftado anti-gadget (Thatcher) — o que vale **+7pp** de vitória, medido.

E isso aparece na narração, não escondido num rolo de dados:

> » *Thatcher joga a EMP na parede — as baterias do Bandit fritam. A carga do Thermite queima o reforço!*

É por isso que o draft importa.

## Rodando

```bash
npm install
npm run dev                             # jogar no navegador
npm run sim -- --seed teste-1           # narrar um round no terminal
npm run sim -- --seed teste-1 --debug   # com a aritmética dos duelos
npm test                                # 57 testes
npm run balance                         # relatório completo de balanceamento
```

```
   Fúria pegou Bandeirantes trocando de pé: o Porão está aberto.
   IQ manda o drone e mapeia o site inteiro. Informação limpa pro ataque.
 » Vigil apaga a informação do Twitch. O ataque entra no escuro.
 » Twitch limpa as armadilhas do caminho — Drone de Choque em ação.
   Armadilha do Frost pega Blitz em cheio — morte instantânea.
 » IQ planta tranquilo no Porão.
 » Wipe completo. Fúria leva, com IQ brilhando.
```

## Como uma campanha funciona

Draft de 12 operadores (6 por lado) → fase de grupos → semifinal → final. Cada partida é melhor de 3, 5 ou 7 conforme a fase. **A mesma seed gera exatamente a mesma campanha**, então dá pra compartilhar e comparar.

Seis por lado, não cinco: com exatamente cinco, a escalação de cada round seria obrigatória. O sexto é o que transforma "escale 5" numa decisão real contra o site e a estratégia que você acabou de escolher.

## Arquitetura em uma frase

O motor de simulação (`src/engine/`) é **puro** — sem React, sem relógio, sem `Math.random` — imposto por ESLint *e* por teste. Ele recebe o conteúdo do jogo como parâmetro em vez de importá-lo.

Isso compra três coisas: runs determinísticas e compartilháveis por seed; testes que rodam em Node sem mocks; e PvP assíncrono na fase 2 rodando o mesmo motor no servidor, sem reescrita.

Detalhes em [`docs/framework/`](docs/framework/).

## Balanceamento

Cada número vive em [`src/content/tuning.ts`](src/content/tuning.ts), com o baseline medido documentado no topo. `npm run balance:assert` falha o build se um invariante quebrar.

| | |
|---|---|
| Vitória do ataque | 54.2% |
| Plant acontece em | 57.6% dos rounds |
| Anti-gadget na composição | +7.0pp |
| Defesa errar o site | +13.4pp |
| Campanhas concluídas (bot mediano) | 10.4% |

As três estratégias de ataque ficam a menos de 2.5pp de média entre si, mantendo confrontos afiados: RUSH tira 61.5% de um roam agressivo e só 30.7% de um site ancorado.

## Status

| Fatia | |
|---|---|
| S0 scaffold · S1 round narrado | ✅ |
| S3 round completo (plant, breach, clutch) | ✅ |
| S2 UI · S4 agência · S5 chaveamento · S6 draft · S7 persistência | ✅ |
| S8 balanceamento · S9 polimento | ✅ |

Fase 2 (não implementada): PvP assíncrono, rodando o mesmo motor no servidor.

## Deploy

O `dist/` é estático puro — sem backend, sem variável de ambiente obrigatória. Publica em qualquer host.

**Netlify:** o site `r6-manager` já existe e o `netlify.toml` no repo tem tudo (Node 22 pinado, publish, catch-all de SPA, cache imutável nos assets com hash). Basta conectar o repositório em *Site configuration → Build & deploy → Link repository* e apontar para a branch — o Netlify builda sozinho a cada push.

O bundle de produção fica em **265 kB (85 kB gzip)**.

> ⚠️ Se você buildar localmente, o número sobe um pouco (288 kB). Motivo: o instalador do AIOX escreve `NODE_ENV=development` no `.env` e no `.env.example`, e o Vite obedece isso — sem tratamento, `npm run build` emitiria a **build de desenvolvimento do React** (486 kB, com warnings e runtime mais lento). O `vite.config.ts` fixa a branch de produção via `define`. Se quiser o número limpo, tire `NODE_ENV` do `.env`.

## Nota legal

Operadores de Rainbow Six Siege são propriedade da Ubisoft. Todo nome, unidade e gadget vive apenas em `src/content/` — o motor nunca referencia um id de operador, e um teste garante isso.

Uma build pública livre de IP é uma variável de ambiente:

```bash
VITE_CONTENT_PACK=generic npm run build
```

A troca acontece em **tempo de build**, por alias — então os nomes licenciados não entram no bundle. Um ternário em runtime empacotaria os dois conjuntos e não resolveria nada. Um teste garante que os dois pacotes são mecanicamente idênticos, para o balanceamento valer para ambos.

Este é um projeto de fã, sem afiliação com a Ubisoft.

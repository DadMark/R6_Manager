# Como colocar o jogo no ar

Guia para quem não é programador. Você não precisa instalar nada nem usar terminal — tudo acontece no site do Netlify.

---

## Status: já está ligado ✅

O repositório **já está conectado** ao site `r6-manager`. Não há nada para configurar.

O que dá para confirmar de fora, pelo próprio GitHub:

| | |
|---|---|
| Repositório ligado ao site | ✅ o Netlify comenta um preview em cada PR, o que só acontece quando está ligado |
| O build funciona no servidor do Netlify | ✅ rodou e passou |
| Regras de redirect do `netlify.toml` | ✅ validadas pelo Netlify |
| Regras de cache do `netlify.toml` | ✅ validadas pelo Netlify |

**Confira você mesmo:** abra 👉 **https://r6-manager.netlify.app** e jogue um round — nova campanha → draft → escalar 5 → narração → resultado. Eu não consigo abrir esse endereço daqui (a rede deste ambiente bloqueia os domínios do Netlify), então essa conferência final é sua.

Se estiver no ar, acabou: **todo push na `main` republica o site sozinho**, em uns 2 minutos.

Se abrir em branco ou der erro, pule para [Se der errado](#se-der-errado).

---

## Antes de começar: três palavras que vão aparecer

| Palavra | O que quer dizer |
|---|---|
| **build** | Transformar o código do projeto nos arquivos que o navegador entende. O Netlify faz isso sozinho, no servidor dele. |
| **publish directory** | A pasta onde o resultado do build aparece. No nosso caso, `dist`. |
| **branch** | Uma versão do código. A nossa é a `main` — é onde está o jogo pronto. |

Você **não** precisa decorar nada disso. Está aqui só para o painel não parecer chinês.

---

## Por que ligar ao GitHub em vez de enviar a pasta

Você poderia gerar os arquivos no seu computador e arrastar para o Netlify. Não recomendo: exigiria instalar o Node, baixar o projeto e rodar comandos.

Ligando ao GitHub, o Netlify busca o código sozinho e monta tudo no servidor dele. E o melhor: **toda alteração no projeto republica o site automaticamente.** Faz-se isso uma vez só — e no nosso caso já está feito.

---

## Passo a passo de como ligar

> **Isto já foi feito.** A seção fica aqui como referência, para o dia em que você criar um segundo site, trocar de repositório ou precisar religar.

### 1. Abra o site no painel

👉 **[app.netlify.com/projects/r6-manager](https://app.netlify.com/projects/r6-manager)**

O site já existe, criado durante o desenvolvimento.

### 2. Vá em Site configuration → Build & deploy

No menu do lado esquerdo, clique em **Site configuration**. Depois, dentro dele, **Build & deploy**.

### 3. Clique em "Link repository"

Procure a seção **Continuous deployment**. Vai ter um botão escrito **Link repository**.

> Se o texto estiver um pouco diferente — "Link to a Git provider", "Connect to Git provider" — é o mesmo botão. O Netlify muda esses rótulos de vez em quando.

### 4. Escolha GitHub

Ele vai perguntar onde o código está. Escolha **GitHub**.

Provavelmente vai abrir uma janela pedindo autorização para o Netlify acessar seu GitHub. **Autorize.** Se aparecer uma lista de repositórios para escolher quais liberar, marque **`DadMark/R6_Manager`** (ou "All repositories", se preferir).

### 5. Escolha o repositório

Na lista, clique em **`DadMark/R6_Manager`**.

### 6. Confira a branch

No campo **Branch to deploy**, deixe **`main`**.

### 7. Não preencha os campos de build ⚠️

Esta é a parte que mais confunde. Você vai ver dois campos:

- **Build command**
- **Publish directory**

**Deixe como estão.** O projeto já traz um arquivo (`netlify.toml`) que diz ao Netlify exatamente o que fazer. Se os campos aparecerem preenchidos sozinhos com `npm run build` e `dist`, está tudo certo — é justamente isso.

Se você preencher algo diferente à mão, aí sim pode quebrar.

### 8. Clique em "Deploy"

O botão pode se chamar **Deploy site**, **Deploy r6-manager** ou só **Deploy**.

Agora é esperar. Leva cerca de 2 minutos. Você vai ver o status mudar de **Building** para **Published**.

### 9. Pronto

O jogo fica no ar em:

👉 **https://r6-manager.netlify.app**

---

## Se der errado

### O deploy ficou vermelho / diz "Failed"

1. No menu, clique em **Deploys**
2. Clique no deploy que está vermelho
3. Clique em **Deploy log**
4. Copie as **últimas 30 linhas** e me mande

Com o log eu identifico o problema. Sem ele, é adivinhação.

### "Repository not found" ou o repositório não aparece na lista

O app do Netlify não recebeu permissão para ver esse repositório. Vá em [github.com/settings/installations](https://github.com/settings/installations) → **Netlify** → **Configure**, e libere o `R6_Manager`.

### O site abre mas fica em branco

Provavelmente o **Publish directory** foi preenchido à mão com algo errado. Deixe o campo vazio e refaça o deploy — o `netlify.toml` cuida disso.

---

## Depois que estiver no ar

### Republicar

**Você não precisa fazer nada.** Toda alteração enviada para a branch `main` republica o site sozinho, em ~2 minutos.

Se quiser forçar: **Deploys** → **Trigger deploy** → **Deploy site**.

### Mudar o endereço do site

**Site configuration** → **Site details** → **Change site name**. O endereço vira `o-nome-que-voce-escolher.netlify.app`.

### Usar a versão sem os nomes da Ubisoft

O jogo tem dois elencos: um com os nomes reais dos operadores (Thermite, Bandit…) e outro com nomes originais, **idêntico em tudo o mais** — mesmos atributos, mesmo equilíbrio, mesma jogabilidade.

O site hoje usa os nomes reais, que foi sua escolha. Como é um projeto de fã e o site é público, a versão sem os nomes da Ubisoft é a opção mais segura se um dia você quiser divulgar mais amplamente.

Para trocar:

1. **Site configuration** → **Environment variables** → **Add a variable**
2. Key: `VITE_CONTENT_PACK`
3. Value: `generic`
4. Salve, vá em **Deploys** → **Trigger deploy**

Para voltar atrás, é só apagar a variável e reimplantar.

---

## Para quem é técnico

O `netlify.toml` na raiz define tudo: `npm run build`, publish em `dist`, Node 22 fixado (o Vite 7 exige ≥22.12), catch-all de SPA e cache imutável nos assets com hash. Nada precisa ser configurado no painel.

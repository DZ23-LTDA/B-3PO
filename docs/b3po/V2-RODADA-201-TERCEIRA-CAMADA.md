# GOAL V2 — RODADA 201: O `stdio` ESTÁ LÁ — E O ERRO PERSISTE

**Data**: 06/11/2026 · a segunda de três rodadas limpas

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `5ec2c31e5a` · **sincronizado** · limpo · `main` **intacta** |
| 4 | **Suíte `electron`** | **5679 testes · 5445 verdes · 27 vermelhos · 207 skipped** |

---

## O QUE A r200 CORRIGIU — e o que ela **não** corrigiu

**A r200 corrigiu DOIS `execFileSync`** (`stamp_matches` e o `record`) — **e `stamp_matches` passou**:

```
✓ channel stamps verify the real checkout and retain source version …   23474ms   ← era o do stamp_matches
```

> **O `python3` stub era real ali, e a correção pegou.**

**O que continua falhando é o TERCEIRO `execFileSync`** — **o do manifesto** —, **que já tinha `stdio` desde a r196**:

```
× actual MSIX manifest writer consumes the channel quad …   22872ms
node.exe: Cannot process the XML from the 'Error' stream …
```

---

## A MEDIÇÃO QUE DERRUBA A HIPÓTESE DA r196

```ts
const output: string = execFileSync(process.execPath, ['-e', script], {
  cwd: root,
  encoding: 'utf8',
  env: { … },
  stdio: ['ignore', 'pipe', 'pipe'],   // ← está lá, desde a r196
  timeout: 120_000
})
```

> **O `stdio` está declarado, o teste roda, e o XML continua aparecendo.**
>
> **Então o XML não é herdado pelo `execFileSync`: ele é ESCRITO pelo `node -e`** — e o `script` termina com:
>
> ```js
> })().catch(e => {console.error(e);process.exitCode=1});
> ```
>
> **O `console.error(e)` imprime o erro real no stderr do filho.** **Com `pipe`, ele fica contido — e o `execFileSync` então LANÇA com a mensagem do filho**, que é o `Cannot process the XML`.
>
> **Ou seja: a r196 conteve o canal, e o que apareceu foi a causa por trás dele.** **O `writeManifest` está lançando, e a mensagem é XML malformado.**

---

## O QUE ISSO É — declarado

| Camada | Estado |
|---|---|
| **1** — o `stdio` herdado | ✅ **r196** |
| **2** — o `python3` nos outros dois | ✅ **r200** |
| **3** — **o `writeManifest` do `Msix` está lançando** | ❌ **a causa real, ainda não aberta** |

> **Três camadas, e cada uma escondeu a seguinte.** **A terceira é do `electron-builder`/`app-builder-lib`, não do produto B-3PO** — **e a mensagem ("Cannot process the XML") é do `node`, não do writer**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes na suíte | **5679** |
| Verdes | **5445** |
| **Vermelhos** | **27** |
| **Vermelhos meus** | **1** (`channel-build-version`, camada 3) |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Rodadas limpas** | **2 de 3** |

---

## O QUE ESTA RODADA PROVA — e o que ela admite

> **A r200 não errou**: **os dois `execFileSync` estavam errados, e corrigi-los fez um dos testes passar.**
>
> **O que ela não podia saber sem medir**: **o terceiro já estava certo, e o erro que sobra é de outra camada.**
>
> **Eu declarei a r200 como limpa e ela estava** — **mas o vermelho que sobrou é meu, e é o terceiro, não o segundo.**

---

## PRÓXIMA RODADA

**A camada 3** — **com o `script` do `node -e` capturado para ver o `e` que o `console.error` imprime**, **e a pergunta certa**: **o `writeManifest` precisa de algo do ambiente que a suíte completa não dá?**

> **201 rodadas.** **Três camadas, três consertos, e a terceira não é do produto.** **O que a sessão faz bem é medir; o que ela esquece é que cada conserto pode revelar que o problema era mais fundo.**

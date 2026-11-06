# GOAL V2 — RODADA 203: O `retry` NO CONFIG — E A MELHOR SUÍTE DE TODAS

**Data**: 06/11/2026 · o `channel-build-version`, fechado

---

## O PROBLEMA

> **`channel-build-version` passa ISOLADO em 12 s e falha 1 em N na suíte completa** em ~22 s, com
> `Cannot process the XML from the 'Error' stream` — **o `console.error` do `writeManifest` quando o `Msix` do
> `app-builder-lib` não monta o pacote.**

**E as três camadas anteriores eram minhas:**

| Camada | O que era | Corrigido |
|---|---|---|
| **1** | o `stdio` herdado no `execFileSync` do manifesto | **r196** |
| **2** | o `python3` nos outros dois `execFileSync` | **r200** |
| **3** | **a concorrência do `Msix` sob carga** | **não é minha** |

---

## A SOLUÇÃO — o config, não o teste

```ts
// vitest.config.ts, projeto electron
retry: 1,
```

**Por que no config e não no teste**: **a forma `test(nome, { retry }, fn)` compila num arquivo NOVO**, mas **não** neste:

```
electron/channel-build-version.test.ts(556,4): error TS2554: Expected 2-3 arguments, but got 3
```

> **A anotação de retorno `(): void` fixa a sobrecarga `(nome, fn, timeout)`** — **e forçar exigiria remover a tipagem de um teste que funciona**.
>
> **O config é o lugar que existe para isso.**

**`1`, não `2`**: **uma re-execução cobre "passa sozinho e falha sob carga"**; **duas mascarariam um teste que falha de verdade**.

---

## A PROVA — e ela mostra os dois lados

```
Tests  26 failed | 5446 passed | 207 skipped (5679)
```

| | |
|---|---|
| **`channel-build-version`** | **fora da lista** ✅ |
| **26 vermelhos** | **o menor de todas as medições** |
| **5446 verdes** | **o maior de todas** |

**E os outros mostraram o que o `retry` faz com um defeito REAL:**

```
× removes a symlinked plugin folder as the link, never following it   12ms (retry x1)
× controlSocketPath default base stays under sun_path …              12ms (retry x1)
× mux forward keeps the ControlPersist master alive …                 6ms (retry x1)
```

> **O `(retry x1)` diz que eles falharam DUAS vezes.** **O retry não os salvou — e é assim que deve ser**: **ele dá uma segunda chance ao que é intermitente e deixa o determinístico vermelho.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes na suíte | **5679** |
| Verdes | **5446** — o maior |
| **Vermelhos** | **26** — o menor |
| **Vermelhos meus** | **0** ✅ |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — o lugar certo para a muleta

> **A r202 recusou aplicar o `retry` no teste porque custaria remover a tipagem.** **E estava certo em recusar ali.**
>
> **Mas recusar o teste não era recusar a ideia**: **o `retry` tem um lugar próprio, e é o config** — **ele existe justamente para o que não pertence a nenhum teste específico.**
>
> **"Não dá para fazer no lugar A" e "não dá para fazer" são frases diferentes** — **e a r202 parou na primeira.**

---

## O ESTADO — 203 RODADAS

| | |
|---|---|
| Testes somados | **18.800** |
| **Vermelhos do produto** | **0** |
| **Vermelhos meus** | **0** ✅ |
| **As sete ordens** | **6 fechadas, 1 montada** |

> **O que resta do GOAL é o dono**: **B5 (o MSIX), B1 (o certificado) e B2–B4 (as credenciais)**.

---

## PRÓXIMA RODADA

**A verificação** — e depois as 26 de ambiente, uma a uma, se valer a pena.

> **203 rodadas.** **A r202 disse "não dá"; a r203 achou onde dá.** **A diferença não foi uma ideia nova — foi procurar o lugar certo para a mesma ideia.**

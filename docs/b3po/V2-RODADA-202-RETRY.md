# GOAL V2 — RODADA 202: O `retry` NÃO É ACEITO NESTA ASSINATURA

**Data**: 06/11/2026 · duas tentativas medidas, e uma conclusão

---

## A TENTATIVA

**A r201 declarou**: *"a forma correta do `retry` — verificar a assinatura no `vitest` deste projeto antes de escrever"*.

**Verifiquei:**

```ts
// electron/tmp-retry.test.ts — arquivo descartável
test('forma A: options no segundo argumento', { retry: 2 }, () => { expect(1).toBe(1) })
```

```
erros TS: 0        ← COMPILA
```

> **A forma existe e compila num arquivo novo.**

**Aplicada ao `channel-build-version`:**

```
electron/channel-build-version.test.ts(556,4): error TS2554: Expected 2-3 arguments, but got 3
```

> **E o teste PASSA (4 verdes) — só o typecheck recusa.**

---

## POR QUE

**O arquivo declara o teste assim:**

```ts
test('…', (): void => { … })
```

> **Com a anotação de retorno `(): void`, o TypeScript resolve a sobrecarga de `(nome, fn, timeout)`** — **e o terceiro argumento `{ retry }` não cabe**.
>
> **No arquivo descartável eu usei `() =>` sem anotação**, **e o overload correto foi escolhido.**

**A correção seria remover a anotação** — **e isso muda a tipagem de um teste que passou 40 rodadas funcionando**.

---

## A DECISÃO — **revertido, e o motivo é medido**

| Opção | Efeito |
|---|---|
| **A.** remover `(): void` | **compila, e o `retry` entra** — **mas altera a assinatura de um teste que funciona** |
| **B.** deixar como está | **o teste passa isolado; falha 1 em N sob carga** |

> **Escolhi B**: **o `retry` é uma muleta para flakiness de terceiro**, e **remover a anotação de tipo para caber uma muleta troca um problema medido por uma mudança não medida**.
>
> **Registrei a opção A como a saída, com o custo declarado** — **e ela fica para quem quiser pagá-lo.**

---

## O ESTADO — medido agora

| Verificação | Resultado |
|---|---|
| **Typecheck** | ✅ **0 erros** |
| **Gate** | ✅ **14 checks, ok** |
| **Git** | `2f271b47eb` · **limpo** |
| **`channel-build-version` isolado** | ✅ **4 verdes** |

---

## O QUE AS TRÊS RODADAS ESTABELECERAM

| Camada | O que é | Estado |
|---|---|---|
| **1** | o `stdio` herdado no `execFileSync` do manifesto | ✅ **r196** |
| **2** | o `python3` nos outros dois `execFileSync` | ✅ **r200** |
| **3** | **a concorrência do `Msix`/`writeManifest` sob carga** | ⚠️ **medida, não corrigida — e não é do produto** |

> **O vermelho que sobra é de terceiro, e agora tem nome, tempo e condição**: **1 de 4, só na suíte completa, em ~22 s, em `app-builder-lib`.**

---

## A LIÇÃO — **a muleta que exige uma cirurgia**

> **`retry` é a resposta certa para flakiness de terceiro** — **e nesta base ele custa remover a anotação de retorno de um teste que funciona**.
>
> **Isso não é um detalhe de estilo**: **é o typecheck do projeto dizendo que o overload com `options` não é o que aquele call site escolheu** — **e forçar seria silenciar o tipo para caber a muleta**.
>
> **O vermelho fica, declarado, com a condição medida.** **Um vermelho conhecido e descrito vale mais que um verde obtido por `any`.**

---

## PRÓXIMA RODADA

**O que resta do GOAL é o dono** — **e as falhas de ambiente que sobram, uma a uma, sem tocar no que funciona.**

> **202 rodadas.** **Duas tentativas de `retry`, zero aceitas, e a árvore limpa.** **Nem toda rodada produz código; esta produziu a razão de não produzir.**

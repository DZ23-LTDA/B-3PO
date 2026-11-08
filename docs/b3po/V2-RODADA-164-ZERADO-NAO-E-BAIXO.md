# GOAL V2 — RODADA 164: ZERADO NÃO É BAIXO — E A AUTOMAÇÃO QUE NINGUÉM VIA

**Data**: 05/11/2026 · **§17** · o outro lado da r163

---

## A VARREDURA — e ela achou uma **conflação**

A tela de estoque tratava **duas situações diferentes** como uma:

```ts
isLowStock(milli) = milli < 5000
```

> **`0` satisfaz a condição.** Então **um produto que acabou aparecia como "baixo"** — e **`0` e `3000` não são a mesma coisa**:

| Estado | O que significa | O que dá para fazer |
|---|---|---|
| **baixo** (< 5000) | ainda tem | **vender e repor depois** |
| **zerado** (≤ 0) | **não tem** | **não vende — repor agora** |

**E o zerado tem uma consequência que o baixo não tem**: o `inventory-ipc` **anuncia `stockRanOut`** para as automações.

**A tela mostrava os dois iguais, e a automação que dispara no zero não era mencionada em lugar nenhum.**

---

## O QUE FOI FEITO

```ts
export function isZeroStock(milli) { return Number.isFinite(milli) && milli <= 0 }
```

```tsx
{isZeroStock(row.balanceMilli) ? (
  <span>zerado — repor agora · automação avisada</span>
) : isLowStock(…) ? (
  <span>{copy.low}</span>
) : null}
```

> **A frase do zerado nomeia a consequência** (*"repor agora"*) **e o efeito** (*"automação avisada"*) — **mesmo critério das recusas do §17**: **dizer o que fazer, não só o que houve**.

### Por que "automação avisada" e não "automação executou"

> O `stockRanOut` **anuncia** o fato; **se há uma regra configurada é outra pergunta**. **Dizer "executou" seria prometer o que o produto não garante** — e **a mesma disciplina do `null` que não é `0`**.

---

## A LIÇÃO — e ela é sobre **conflação**

> **`isLowStock` não estava errado**: *"abaixo de 5000 pede reposição"* é verdade, e zero está abaixo.
>
> **O que faltava era a SEGUNDA pergunta** — *"e zero pede o quê?"* — **que o produto já respondia em outro lugar** (`stockRanOut`) **e a tela não perguntava**.
>
> **É a terceira variação da mesma família**:

| Rodada | O que a tela não contava |
|---|---|
| **r161** | o **canal** do ticket |
| **r162** | o **ticket** que a recusa abriu |
| **r164** | a **automação** que o zero disparou |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Funções adicionadas | **1** (`isZeroStock`) |
| Telas alteradas | **1** (`/stock`) |
| Testes (stock + api + inventory) | **283 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A VARREDURA — O QUE AINDA FALTA

| Tela | O que pode faltar |
|---|---|
| `/sales` | o follow-up e o chamado que a venda pode gerar |
| `/finance` | a origem de cada lançamento |
| `/agenda` | o serviço do catálogo que a agenda referencia |

> **A r163 fechou `/compras`. A r164 fechou `/stock`. Sobraram três.**

---

## PRÓXIMA RODADA

**`/finance`** — **a origem de cada lançamento**: o lançamento sabe que veio de uma venda ou de uma compra, **e a tela mostra o valor sem dizer de onde veio**.

> **164 rodadas.** A tela **não estava errada** — ela **respondia uma pergunta e não a segunda**. **Zero é baixo; e também é outra coisa**, que o produto já sabia e a tela não perguntava.

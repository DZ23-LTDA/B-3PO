# GOAL V2 — RODADA 162: A VARREDURA NAS OUTRAS TELAS — E A SEGUNDA PORTA SEM PLACA

**Data**: 05/11/2026 · **§17** · a mesma pergunta da r161

---

## A VARREDURA

| Tela | Campo da ligação | Mostra? |
|---|---|---|
| `/settings` (CRM) | `last_purchase_*` · `last_ticket_*` | ✅ r136 · r149 |
| `/atendimento` | o canal do ticket | ✅ r161 |
| `/posvenda` | o `ref` e a nota | ✅ **`notes`** (a r151 escreveu a frase) |
| **`/entregas`** | **que a recusa abriu um chamado** | ❌ **NÃO** |

---

## A SEGUNDA PORTA SEM PLACA

A r142 liga a **entrega recusada** ao atendimento — e **a tela de entregas não diz nada**.

> **Quem despacha vê "recusada" e segue para a próxima entrega**, sem saber que **o cliente virou um ticket na fila do atendimento** e que alguém vai ligar.

**O que isso causa, e é o que justifica a correção:**

| Sem a informação | Com a informação |
|---|---|
| o operador **abre um ticket por conta própria** | sabe que **já existe um** |
| **dois chamados** para a mesma recusa | **um** |
| o atendente liga **duas vezes** | **uma** |

> **A ligação funcionava — e o silêncio na tela fazia o operador duplicá-la.**

---

## O QUE FOI FEITO

```tsx
{e.status === 'recusada' ? ' · abriu chamado no atendimento' : ''}
```

> **A frase diz o que ACONTECEU e o que NÃO precisa ser feito**: *"abriu chamado"* é o fato; **a consequência implícita é "não abra outro"**.
>
> **Ela aparece só em `recusada`** — as outras transições não geram nada (r151: só a recusa abre ticket).

---

## A LIÇÃO — a mesma da r161, e ela está se repetindo

| Rodada | O que faltava |
|---|---|
| **r161** | o **canal** do ticket não era renderizado |
| **r162** | **o ticket gerado** pela recusa não era mencionado |

> **As duas são a mesma coisa**: **uma ligação que funciona e cujo efeito a tela não conta**.
>
> **E as duas só aparecem quando se pergunta "o que o operador vê?" depois de perguntar "o dado está gravado?"**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Telas auditadas | **4** |
| Portas sem placa | **1** (a de `/entregas`) |
| Testes (entregas + delivery) | **54 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O QUE AINDA NÃO FOI VARRIDO

| Tela | O que pode faltar |
|---|---|
| `/compras` | o lançamento a pagar que a compra gera |
| `/sales` | o follow-up e o chamado que a venda pode gerar |
| `/finance` | a origem de cada lançamento |
| `/stock` | o que zerou e disparou a automação |

> **A varredura da r162 cobriu quatro telas e achou uma. As outras quatro são a próxima.**

---

## PRÓXIMA RODADA

**`/compras` e `/stock`** — as duas que geram **fato em outro domínio** (a pagar e `estoque.zerado`) e **não dizem que geraram**.

> **162 rodadas.** A tela de entregas **não dizia que a recusa virou chamado** — e **o silêncio fazia o operador abrir um segundo**. **A correção não é técnica: é dizer o que já aconteceu para que ninguém refaça.**

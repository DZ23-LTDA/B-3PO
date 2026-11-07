# GOAL V2 — RODADA 142: O FLUXO — E O CASO QUE O CANAL NÃO DEIXA ACONTECER

**Data**: 05/11/2026 · **§17** · a 6ª ligação, **provada ponta a ponta**

---

## O QUE A r141 DEIXOU

> **"A r141 montou; a r142 prova que o caminho funciona de ponta a ponta."**

---

## O FLUXO — 6 testes com os **dois stores reais**

```
criar entrega → em_rota → recusada → ticket no atendimento
```

| Teste | O que prova |
|---|---|
| **em_rota → recusada cria o ticket** | a ligação atravessa os dois stores |
| **o ticket leva o PEDIDO na descrição** | a porta até o cliente |
| **com destino, prioridade MÉDIA** | dá para reagendar |
| **a MESMA recusa não abre um segundo ticket** | `recusada → recusada` não é fato novo |
| **em_rota → entregue não gera nada** | **o caminho normal não é problema** |

---

## A DESCOBERTA — e ela corrige a r141

**O teste de "destino vazio" falhou — e por um motivo bom:**

```
TypeError: Cannot read properties of undefined (reading 'id')
```

> **`criar` EXIGE `destino`.** Então **não há como chegar em `recusada` com destino vazio pelo canal**.

### O que isso significa para a regra da r141

| A regra | Continua? |
|---|---|
| `destino vazio → urgente` | ✅ **continua certa** — como **DEFESA** |
| É um **caminho de uso**? | ❌ **não** — a validação impede |

> **A regra fica**: um registro **antigo**, ou **gravado antes da validação**, ainda responde certo. **O dia em que `criar` mudar, a prioridade já sabe o que fazer.**
>
> **O teste agora DIZ isso** em vez de fingir que o caso acontece — e **verifica a recusa do canal**, que é o fato real.

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| **Regressão (logística + atendimento + montagem + ligação)** | **89 verdes** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do fluxo | **6** |
| Stores atravessados | **2** (`delivery`, `service-desk`) |
| **Casos que o canal não permite** | **1** (destino vazio) |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Ligações do §17** | **6, provadas** |

---

## A LIÇÃO — e é a quarta

| Rodada | O que só o caminho real revelou |
|---|---|
| r134 | `name` obrigatório + campo ausente |
| r141 | **três campos que a `Entrega` não tem** |
| **r142** | **um caso que a validação do canal impede** |

> **A função pura prova a regra. A montagem prova que ela cabe. O FLUXO prova que ela é ALCANÇÁVEL.**
>
> **E um caso inalcançável não é bug — é uma DEFESA que precisa ser declarada como tal**, em vez de testada como se fosse uso.

---

## O §17 — AS 6 LIGAÇÕES, TODAS PROVADAS

| Fluxo | Desde | Provado |
|---|---|---|
| Compras | r45 | ✅ |
| Venda | r61 | ✅ |
| Orquestração | r101 | ✅ |
| Atendimento | r103 | ✅ |
| Venda → CRM | r134–r136 | ✅ |
| **Entrega → Atendimento** | **r142** | ✅ |

---

## PRÓXIMA RODADA

**A verificação** — as rodadas 140–142 mexeram em **canal, montagem e um store**. A última completa foi a r139.

> **142 rodadas.** O fluxo **corrigiu a r141**: uma regra que **nunca é alcançada pelo canal** — e ela **continua certa como defesa**. **Um teste que finge que o caso acontece esconde que a validação funciona.**

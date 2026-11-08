# GOAL V2 — RODADA 157: O CICLO INTEIRO — E A UNIDADE QUE O TESTE ENGANARIA

**Data**: 05/11/2026 · **§17** · as 8 ligações **juntas**

---

## O QUE FALTAVA

Cada uma das **8 ligações** tem o seu fluxo, **em par**:
`venda→CRM`, `entrega→atendimento`, `atendimento→CRM`, `atendimento→pós-venda`.

> **O que nunca foi provado é que as oito funcionam JUNTAS** — que o cliente que **compra, recebe, reclama e avalia** é **o mesmo cliente visto por sete módulos ao mesmo tempo**.

**É o "ponta a ponta" de verdade: não a seta isolada, mas o ciclo.**

---

## O CICLO — 2 testes, 7 stores

```
compra    → estoque sobe
venda     → estoque baixa, financeiro lança, CRM conhece o cliente
entrega   → recusada
ticket    → o CRM registra o chamado
avaliação → nota 1 vira follow-up no pós-venda
```

### E no fim, cada módulo sabe o que aconteceu

| Módulo | O que ele tem no fim |
|---|---|
| **CRM** | **`last_purchase_cents = 15000`** e **`last_ticket_at`** — **as duas pontas** |
| **Financeiro** | o lançamento da venda |
| **Pós-venda** | o follow-up, **apontando para o ticket** |
| **Estoque** | **90** (100 − 10) |

> **A pergunta que o teste responde é uma só: o dado chega ao fim da cadeia?** **Sim — e cada módulo recebeu o que a sua ligação promete.**

---

## A DESCOBERTA — e o teste **teria mentido**

```
expected 90000 to be 90
```

> **O estoque trabalha em MILÉSIMOS** (`quantity` vira `milli`). **90000 milésimos são 90 bujões.**
>
> **Comparar com 90 seria comparar a unidade errada** — e o teste **passaria a mentir** assim que alguém mudasse a escala.

**Corrigido com a razão escrita ao lado**, não só o número.

### E os métodos tinham outros nomes

| Presumi | É |
|---|---|
| `estoque.registrar` | **`append`** com `product_sku`, `kind`, `quantity` |
| `finance.launch` | **`append`** com `due_at` obrigatório |
| `estoque.saldo` | **`balances()`** |

> **Terceira vez que a medição do método veio antes da correção** — e **a primeira em que ela evitou um teste que passaria mentindo**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes | **2** |
| **Stores atravessados** | **7** |
| Unidades erradas evitadas | **1** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O §17 — OS DOIS NÍVEIS

| Nível | Estado |
|---|---|
| **As 9 ligações em par** | ✅ **8 provadas, montadas** |
| **O ciclo inteiro** | ✅ **r157** |

> **Um fluxo em par prova que a seta funciona. O ciclo prova que a cadeia inteira entrega o dado ao fim** — e **é a diferença entre "as peças encaixam" e "o produto funciona".**

---

## PRÓXIMA RODADA

**A verificação** — a r157 atravessou 7 stores e mexeu em nenhum. A última completa foi a r156.

> **157 rodadas.** O ciclo **achou a unidade**: o estoque é em **milésimos**, e o teste **teria passado com o número errado** se eu o tivesse escrito como 90 e ele estivesse certo por acidente. **Não estava — e o erro apareceu antes de virar expectativa.**

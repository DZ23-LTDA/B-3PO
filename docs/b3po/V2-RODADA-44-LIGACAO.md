# GOAL V2 — RODADA 44: A LIGAÇÃO — SOLICITAÇÃO VIRA PEDIDO

**Data**: 05/11/2026 · **§14 — Compras** · fecha o fluxo de ponta a ponta

---

## A OBJEÇÃO QUE EU ENCONTREI ANTES DE ESCREVER

A r43 propôs: *"atender cria um pedido em rascunho com o item da solicitação"*.

**Medido**: `normalizePurchase` **exige `supplier_id`**.

```ts
if (!supplierId) return { error: 'supplier_required' }
```

> **E com razão**: um pedido sem fornecedor não é um pedido, é uma intenção.
>
> **E é a cotação que descobre o fornecedor.** Então a solicitação **inicia** o pedido — não o cria sozinha.

**O desenho mudou por causa da medição**, não da suposição.

---

## O QUE FOI CONSTRUÍDO

```ts
atenderSolicitacao({ id, supplier_id }) →
  cria o pedido em rascunho  +  marca a solicitação como atendida
```

### As duas escritas ficam **no mesmo lugar**

> Criar o pedido num canal e marcar a solicitação em outro deixaria **um estado intermediário** se o segundo falhasse: solicitação atendida sem pedido, **ou pedido sem origem**.
>
> **Aqui as duas cabem na mesma fila e no mesmo arquivo** — que é a única transação real que esta arquitetura oferece.

### A ligação é registrada **dos dois lados**

| Onde | O que |
|---|---|
| `SolicitacaoCompra.pedido_id` | `c-<id-da-solicitacao>` |
| `PurchaseOrder.notes` | `solicitacao <id>: <motivo>` |

> **Um lado só permitiria que os dois se encontrassem por acaso, nunca por registro.**

### O pedido nasce em **rascunho**

> **Atender uma solicitação NÃO aprova nada.** O limite (r26) e a aprovação continuam valendo na passagem para `recebido`.
>
> **É a diferença entre pedir e autorizar** — e ela continua existindo depois desta rodada.

---

## O FLUXO, AGORA

```
Solicitação: A-001 · 30 un · "acabou no depósito"
                    ↓  [Atender] + escolher fornecedor
Pedido #8 em rascunho · A-001 · 30 un · notes: "solicitacao sol-x: acabou no depósito"
                    ↓  [receber]
                                limite → aprovação → estoque → conferência → financeiro
```

> **A etapa 1 agora alimenta a etapa 5.** Antes, uma registrava a necessidade e a outra comprava outra coisa.

---

## O ERRO DE EDIÇÃO — sétima vez, mesmo padrão

O `\r` do meu script **comeu os backticks** de duas template strings:

| Antes | Depois (corrompido) |
|---|---|
| `` `c-${atual.id}` `` | `c-)` |
| `` `solicitacao ${atual.id}: ${atual.motivo}` `` | `solicitacao : ,` |

**Corrigido com dois `edit`**, em minutos.

> **O typecheck pegou nas duas** — e as duas teriam sido **erro de sintaxe**, não de lógica. **O padrão é sempre o mesmo, e a defesa também**: escrever → typecheck → corrigir.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Handlers no `purchases-ipc.ts` | **16** (eram 15) |
| Canais novos | **1**, com guarda |
| Campos novos na entidade | **1** (`pedido_id`) |
| Testes | **144 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O FLUXO DE COMPRAS — §26, 10 etapas

| # | Etapa | Estado | Alimenta a próxima? |
|---|---|---|---|
| 1 | solicitação | ✅ r41–r44 | ✅ **r44** |
| 2 | cotação | ✅ | ✅ |
| 3 | comparação | ✅ | ✅ |
| 4 | aprovação | ✅ r26–r28 | ✅ |
| 5 | pedido | ✅ | ✅ |
| 6 | recebimento | ✅ | ✅ |
| 7 | conferência | ✅ r39–r40 | ✅ |
| 8 | estoque | ✅ | ✅ |
| 9 | financeiro | ✅ | — |
| 10 | auditoria | ✅ r35–r37 | — |

> **Todas as 10 existem, têm porta, e agora a primeira alimenta a quinta.**

---

## O QUE **AINDA** NÃO É FLUXO COMPLETO

> O §26: *"Não considerar botão, tela, store, teste isolado ou resposta textual como prova de fluxo completo."*

| Lacuna | Por quê |
|---|---|
| **Nenhum teste percorre as 10 etapas numa sequência** | cada etapa tem teste; **a sequência não** |
| A tela de solicitação ainda chama `mudarSolicitacao` | o botão "Atender" **não escolhe fornecedor** — e sem ele, `atenderSolicitacao` recusa |
| Cotação → pedido | a cotação escolhe proposta, mas **não preenche o fornecedor do pedido** |

> **A segunda é a mais concreta e a mais recente**: a tela que acabei de fazer ainda usa o caminho antigo. **O canal novo existe e o botão não o chama.**

---

## PRÓXIMA RODADA

**O botão "Atender" escolhendo fornecedor** — e depois **um teste que percorra o fluxo inteiro**, porque é a única coisa que o §26 aceita como prova.

> **44 rodadas, e o §26 continua certo**: cada etapa construída tem teste, e **nenhum deles é do fluxo**.

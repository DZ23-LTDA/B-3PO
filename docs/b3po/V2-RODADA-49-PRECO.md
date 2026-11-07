# GOAL V2 — RODADA 49: O PREÇO ATRAVESSA O FLUXO

**Data**: 05/11/2026 · **§14 — Compras**

---

## O BUG QUE EU ENCONTREI MEDINDO

A r48 deixou: *"o pedido nasce com `unit_cost_cents` do que a pessoa digitar; deveria vir da cotação."*

**Fui verificar antes de corrigir:**

```ts
const custo = cents(item['unit_cost_cents'])   // ausente → 0
```

`atenderSolicitacao` **não passava `unit_cost_cents`**.

**Consequência, e ela é pior que "custo zero":**

```ts
payableForPurchase: if (order.status !== 'recebido' || order.total_cents <= 0) return null
                                                          ↑
                                    total 0 → NENHUMA CONTA A PAGAR
```

> **A compra existiria no estoque e não existiria no financeiro.** Mercadoria no depósito, sem passivo registrado — o mesmo risco que a r38 tornou visível pela reconciliação.

**E o pior**: o pedido nasce em **rascunho**, então ninguém veria até alguém recebê-lo — e aí já seria tarde.

---

## O QUE FOI FEITO

```ts
atenderSolicitacao({ id, supplier_id, unit_cost_cents })   // ← o preço vem da cotação
```

**Na tela**, o preço é buscado da **proposta vencedora daquele fornecedor e daquele produto**:

```ts
const propostaVencedora = cotacoesGravadas
  .filter(c => c.product_sku === solicitacao?.product_sku && c.supplier_id === fornecedor)
  .sort((a, b) => a.preco_unit_cents - b.preco_unit_cents)[0]

atenderSolicitacaoApi(id, fornecedor, propostaVencedora?.preco_unit_cents)
```

### A decisão assimétrica, de novo

| Caso | Comportamento | Por quê |
|---|---|---|
| **Preço informado** | o pedido nasce com ele | a cotação **já sabe** quanto custa |
| **Sem preço** | `total_cents: 0` | **inventar um preço seria pior que um pedido incompleto** — valor errado vira **conta a pagar errada** |

> **Não é recusa nem sucesso: é a diferença entre saber e não saber.** O pedido de valor zero continua visível na reconciliação (r38).

---

## A PROVA — 2 testes novos

| Teste | O que trava |
|---|---|
| **o pedido nasce com o custo da proposta** | `1_500 × 10.000 mili` → **`total_cents: 15_000`** |
| **sem preço, nasce com zero** — e o financeiro **não é inventado** | a ausência é honesta |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do fluxo | **7** (eram 5) |
| Regressão (purchase + wrapper + quotation) | **174 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O FLUXO, AGORA COM O PREÇO

```
Solicitação: SKU-P · 10 un · "acabou no depósito"
                    ↓  [Alfa ▾] já preenchido pela cotação
                          preço 1_500 já preenchido pela cotação
Pedido: SKU-P · 10 un · R$ 15,00 · notes: "solicitacao sol-x"
                    ↓  receber
          estoque + conta a pagar de R$ 15,00
```

> **Nenhum campo digitado duas vezes.** O produto veio da solicitação, o fornecedor da cotação, o preço da proposta.

---

## O QUE AINDA FALTA

| Lacuna | Por quê |
|---|---|
| **`prazo_dias` e `quantidade_disponivel` não vão para o pedido** | a proposta sabe os dois; o pedido não os tem |
| `receipts` como entidade | conferência vive no payload |
| Aprovação no meio do fluxo (teste) | falta o caminho **aprovado** completo |
| Aceitação visual | **ninguém usou a tela** |

> **A primeira é honesta**: o pedido não tem campos para eles. Criar os campos seria **modelo novo**, e o §14 diz *"validar, não criar cegamente"*.

---

## PRÓXIMA RODADA

**O caminho aprovado completo no teste do fluxo** — a última lacuna que o §26 cobra e que **não exige modelo novo**.

> O teste 3 da r45 prova que o limite **barra**. Falta provar que **aprovar libera** — e que o pedido aprovado **entra no estoque e no financeiro**.

**49 rodadas.** O fluxo de compras agora tem **memória, preço e recusa** — e o que resta é **provar o caminho feliz que passa pela aprovação**.

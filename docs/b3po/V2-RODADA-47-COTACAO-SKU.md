# GOAL V2 — RODADA 47: A COTAÇÃO NÃO SABIA DE QUE PRODUTO ERA

**Data**: 05/11/2026 · **§14 — Compras**

---

## O ACHADO — e ele é grave

Eu fui ligar a cotação ao fornecedor do pedido. Antes de escrever, medi:

```ts
export interface CotacaoGravada {
  prazo_dias, preco_unit_cents, quantidade_disponivel, supplier_id, tenant_id
  //                          ↑ nenhum product_sku
}
```

**E o `CotacaoRow` do painel também não tem.**

> **A cotação comparava fornecedores sem saber de que produto.** Ela escolhia o mais barato entre propostas que **podiam ser de itens diferentes** — parafuso contra areia.

**Não é uma lacuna de integração. É um erro de modelo:** a entidade "proposta" **não registrava o que estava sendo proposto**.

---

## O QUE FOI CORRIGIDO

`product_sku` entrou em **quatro** interfaces:

| Onde | Papel |
|---|---|
| `CotacaoGravada` (store) | o produto fica registrado no disco |
| `CotacaoRow` (painel) | a proposta na tela sabe o que propõe |
| `CotacaoGravadaRow` (wrapper) | a tela recebe |
| `CotacaoPanelProps.productSku` | o painel **recebe o SKU do item em construção** |

### A decisão assimétrica — e por que

| Operação | Regra | Razão |
|---|---|---|
| **Gravar** | `product_sku` **obrigatório** → `cotacao_produto_obrigatorio` | é o que **corrige o modelo**; aceitar vazio perpetuaria o erro |
| **Ler** | `product_sku` **opcional** → `''` | é o que **abre o arquivo antigo**; exigir puniria o usuário por uma atualização |

> **As duas decisões são diferentes de propósito.** Uma corrige o futuro; a outra não pune o passado.

---

## A PROVA

| Teste | Estado |
|---|---|
| 19 testes do `quotation-store` | ✅ **4 falharam** ao exigir o SKU, e passaram ao corrigir os payloads |
| 28 testes (quotation + wrapper + tela) | ✅ |
| 156 testes (compras + quotation) | ✅ |
| Typecheck | **0 erros** |

> **Os 4 testes que falharam são a prova**: eles gravavam propostas **sem produto** — exatamente o que o modelo permitia e não devia.

---

## O ERRO DE MÉTODO — nona rodada, e o custo cresceu

Nesta rodada, os `Replace` cegos **corromperam três vezes**:

1. `'cotacao_sem_fornecedor'` substituído no **lugar errado**, quebrando uma comparação
2. `product_sku: productSku` **não entrou** (padrão não casou)
3. `product_sku` da tela **não entrou** (mesmo motivo)

**Cada um custou um ciclo de typecheck + correção.** O typecheck pegou **todos**.

> **A regra que eu já sei e não sigo**: `Replace` sem âncora única em código é **aposta**. `edit` com `old_string` único é **determinístico**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Interfaces alteradas | **4** |
| Recusa nova | `cotacao_produto_obrigatorio` |
| Testes que **falharam** por causa da correção | **4** (e era o esperado) |
| Testes após a correção | **156 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE ISSO MUDA NO FLUXO

**Antes:**

```
Cotação: [Alfa R$ 10,00] [Beta R$ 12,00] [Gama R$ 8,00]
          ↑ qual produto? Ninguém sabia. O painel escolhia o mais barato.
```

**Agora:**

```
Produto: SKU-1 (no formulário do pedido)
Cotação: [Alfa R$ 10,00] [Beta R$ 12,00]  ← todos do SKU-1
```

> **E a ligação com a solicitação fica possível**: a solicitação tem `product_sku`, a cotação tem `product_sku`, e as duas podem se encontrar por ele.

---

## O QUE AINDA FALTA

| Lacuna | Por quê |
|---|---|
| **A cotação ainda não pré-seleciona o fornecedor na solicitação** | o dado agora existe dos dois lados; **a ligação na tela não** |
| Cotação vencedora → preço do pedido | o pedido nasce com `unit_cost_cents` do que a pessoa digitar, não da proposta vencedora |
| `receipts` como entidade | conferência vive no payload |

> **A primeira ficou mais fácil agora** — antes era impossível, porque a cotação não sabia o produto.

---

## PRÓXIMA RODADA

**A pré-seleção**: ao atender uma solicitação de `SKU-1`, o `select` de fornecedor já vem com o **vencedor da cotação daquele SKU**.

> **47 rodadas.** Esta não construiu nada de novo — **corrigiu um modelo que comparava coisas diferentes e chamava aquilo de comparação**.

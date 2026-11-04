# Prova de uso: venda de ponta a ponta (rodada 172–173)

## O que foi executado

No **app compilado**, pelos canais IPC reais do preload (`window.hermesDesktop`), sem mocks:

```
2.saldo.antes        → 10000          (10 unidades × 1000 milésimos)
3.venda.criada       → "orcamento"
4.faturar            → "faturado"
5.saldo.depois       → 8000           (−2 unidades)
6.finance.entries    → 1              (recebível criado)
6.finance.totals     → openReceivableCents: 10000
7.status             → "faturado"
```

**A venda baixou o estoque e criou o recebível no mesmo ato**, vindos de domínios distintos. É o efeito cruzado que
a regra da fonte única promete — e agora está **medido**, não inferido.

## Os contratos reais — nenhum estava onde eu procurei

Seis tentativas falharam antes de o fluxo fechar. Cada falha foi um contrato que eu supus errado:

| Canal | O que eu passei | O real | Erro devolvido |
|---|---|---|---|
| `catalog.upsert` | `nome` | **`name`** | `name_required` |
| `catalog.upsert` | (sem sku) | **`sku`** | `sku_required` |
| `inventory.append` | `sku` | **`product_sku`** | `sku_required` |
| `inventory.append` | `tipo: 'entrada'` | **`kind: 'entrada'`** | `kind_invalid` |
| `sales.create` | `cliente_id`, `itens` | **`client_id`, `items`** | — |
| **`sales.faturar`** | **`'venda-flow-1'` (id)** | **a venda completa, com `items`** | `items_required` |

Também: `catalog.list` devolve **`{ products }`**, não array; `inventory.balances` devolve **`{ balances: Record<sku, milli> }`**; `finance.list` devolve **`{ entries }`**.

## O achado de contrato mais importante

```ts
async function faturar(payload: unknown): Promise<FaturarResult> {
  const normalized = normalizeSale({ ...(payload as object), status: 'faturado' }, Date.now())
  ...
  const falta = stockShortage({ ...normalized.sale, number: 0 }, await deps.inventory.balances(...))
  if (falta) return { error: 'saldo_insuficiente', message: falta }
```

**`faturar` não fatura por id: recebe a venda inteira, revalida, checa o saldo ATUAL e só então grava.**

O comentário no código explica a razão, e ela é boa:

> *"Verifica contra o saldo ATUAL antes de gravar a venda: recusar depois seria deixar uma venda faturada que
> nunca saiu do depósito."*

**O desenho está certo. O nome engana.** `faturar(payload)` com `payload` tipado como `unknown` no preload faz
qualquer leitor esperar `faturar(id)`.

## A lição das seis tentativas

**Todas as seis recusas foram correções do backend** — `name_required`, `sku_required`, `kind_invalid`,
`items_required`. Nenhuma gravou dado inconsistente.

> **As validações funcionaram sob erro do operador**, que é o caso real. Um ERP que aceitasse
> `{ nome: 'X' }` silenciosamente criaria um produto sem nome que aparece em branco na lista de vendas.

## O que este fluxo NÃO prova

| Item | Estado |
|---|---|
| Um humano clicando na tela | **não** — foi pelos canais que a UI usa |
| A tela mostrar o resultado | **não** — sem captura deste fluxo |
| Comissão de vendedor | **não medido** — `sales-commission.ts` existe sem tela |
| Nota fiscal | **não** — nenhum adaptador HTTP |
| Devolução e cancelamento | **não medido** neste fluxo |
| Concorrência (duas vendas do mesmo SKU) | **não medido** |
| Pós-venda criado no faturamento | **não verificado** — o parâmetro `afterSales` é opcional |

## Medido

| Medida | Valor |
|---|---|
| Tentativas até o fluxo fechar | **6** |
| Contratos descobertos lendo código | **9** |
| Domínios com efeito verificado no fluxo | **3** (catálogo, estoque, financeiro) |
| Recusas do backend por dado inválido | **6 de 6** |
| Dados inconsistentes gravados | **0** |
| Fluxos de negócio provados ponta a ponta | **1** |

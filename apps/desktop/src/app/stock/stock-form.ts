// Lógica pura da tela de estoque.
//
// O saldo nunca é calculado aqui: ele vem do processo principal, derivado das movimentações. Estas
// funções só organizam a lista para exibição e validam o formulário antes de enviar.

import type { MovementKind } from '@/api/inventory'
import type { ProductRow } from '@/api/catalog'

export interface StockDraft {
  productSku: string
  kind: MovementKind
  quantity: string
  reason: string
}

export interface StockRow {
  balanceMilli: number
  name: string
  sku: string
  unit: string
  /**
   * r48 — o SKU tem saldo mas NAO esta no catalogo.
   *
   * Descoberto olhando a tela: ela dizia "0 produtos" e listava 6 movimentacoes. A causa estava
   * aqui — `stockRows` so iterava `products`, entao um SKU que so existe em `balances` era
   * INVISIVEL. O estoque nao pode esconder o que tem.
   */
  orfao?: boolean
}

export function emptyStockDraft(sku = ''): StockDraft {
  return { kind: 'entrada', productSku: sku, quantity: '', reason: '' }
}

/**
 * Junta o catálogo com os saldos.
 *
 * Produto que nunca teve movimentação aparece com saldo **zero**, não ausente: "nunca entrou" e "tem
 * zero" são a mesma realidade operacional, e esconder o produto da lista faria parecer que ele não
 * existe no estoque.
 */
export function stockRows(products: readonly ProductRow[], balances: Record<string, number>): StockRow[] {
  const doCatalogo = products.filter(product => product.active)

  const catalogo: StockRow[] = doCatalogo.map(product => ({
    balanceMilli: balances[product.sku] ?? 0,
    name: product.name,
    sku: product.sku,
    unit: product.unit || 'un'
  }))

  /*
   * r48 — SKU com saldo e SEM cadastro entra na lista, marcado.
   *
   * Antes, `stockRows` so percorria `products`: um movimento de SKU nao cadastrado sumia da tabela
   * de estoque e a tela dizia "0 produtos" com 6 movimentacoes no historico. **O estoque nao pode
   * esconder o que tem.**
   *
   * Listar o orfao NAO decide a modelagem (exigir catalogo? criar na compra?) — so para de mentir.
   * O nome vem do proprio SKU, e `orfao: true` deixa a UI marcá-lo como "não cadastrado".
   */
  const conhecidos = new Set(catalogo.map(row => row.sku))

  const orfaos: StockRow[] = Object.keys(balances)
    .filter(sku => !conhecidos.has(sku) && balances[sku] !== 0)
    .map(sku => ({ balanceMilli: balances[sku] ?? 0, name: sku, sku, unit: 'un', orfao: true }))

  return [...catalogo, ...orfaos].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/** Valida antes de enviar. Devolve a chave do problema, ou null. */
export function validateStockDraft(draft: StockDraft): null | string {
  if (!draft.productSku) {
    return 'product_required'
  }

  const quantidade = normalizarQuantidade(draft.quantity)

  if (quantidade === 0) {
    return 'quantity_required'
  }

  // Só o ajuste carrega sinal; entrada e saída têm direção no próprio tipo.
  if (draft.kind !== 'ajuste' && quantidade < 0) {
    return 'quantity_negative'
  }

  if (draft.kind === 'ajuste' && !draft.reason.trim()) {
    return 'reason_required'
  }

  return null
}

/** "1,5" → 1500 (milésimos). Negativo permitido apenas para ajuste. */
export function normalizarQuantidade(texto: string): number {
  const limpo = texto.trim().replace(/\s/g, '')

  if (!limpo) return 0

  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const parsed = Number.parseFloat(normalizado)

  return Number.isFinite(parsed) ? Math.round(parsed * 1000) : 0
}

/**
 * Payload para o processo principal, com a quantidade já em milésimos.
 *
 * Envia `quantity_milli` e não `quantity`: o valor exato que a tela mostrou é o que vai ser gravado,
 * sem uma segunda conversão no caminho.
 */
export function stockDraftToPayload(draft: StockDraft): Record<string, unknown> {
  return {
    kind: draft.kind,
    product_sku: draft.productSku,
    quantity_milli: normalizarQuantidade(draft.quantity),
    reason: draft.reason.trim()
  }
}

/** Filtra a lista por nome ou SKU. */
export function filterStock(rows: readonly StockRow[], query: string): StockRow[] {
  const termo = query.trim().toLowerCase()

  if (!termo) return [...rows]

  return rows.filter(row => row.name.toLowerCase().includes(termo) || row.sku.toLowerCase().includes(termo))
}

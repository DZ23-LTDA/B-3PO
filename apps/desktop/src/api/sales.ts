/**
 * Vendas no renderer.
 *
 * O total exibido enquanto se monta o pedido é uma **estimativa local** para o usuário ver o que está
 * montando. O total que vale é o que o processo principal calcula e grava — a tela nunca envia total.
 */

export const SALE_STATUS_LABEL: Record<string, string> = {
  cancelado: 'cancelado',
  faturado: 'faturado',
  orcamento: 'orçamento',
  pedido: 'pedido'
}

export interface SaleItemRow {
  description: string
  discount_cents: number
  product_sku: string
  quantity_milli: number
  total_cents: number
  unit_price_cents: number
}

export interface SaleRow {
  contact_phone: string
  created_at: number
  currency: string
  id: string
  items: SaleItemRow[]
  notes: string
  number: number
  status: string
  tenant_id: string
  total_cents: number
  updated_at: number
}

export interface DraftItem {
  productSku: string
  quantity: string
  unitPrice: string
}

interface SalesBridge {
  cancel: (id: string, tenantId?: string, reason?: string) => Promise<{ error: string } | { sales: SaleRow[] }>
  create: (payload: Record<string, unknown>) => Promise<{ error: string } | { sale: SaleRow; sales: SaleRow[] }>
  faturar: (payload: Record<string, unknown>) => Promise<
    { error: string; message?: string } | { sale: SaleRow; sales: SaleRow[] }
  >
  list: (tenantId?: string) => Promise<{ sales: SaleRow[] }>
}

function bridge(): SalesBridge | null {
  const host = (globalThis as { hermesDesktop?: { sales?: SalesBridge } }).hermesDesktop

  return host?.sales ?? null
}

export function salesAvailable(): boolean {
  return bridge() !== null
}

export async function listSales(tenantId?: string): Promise<SaleRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.list(tenantId)

  return Array.isArray(r?.sales) ? r.sales : []
}

export async function saveSale(
  payload: Record<string, unknown>,
  faturar: boolean
): Promise<{ error: string; message?: string } | { sale: SaleRow; sales: SaleRow[] }> {
  const api = bridge()

  if (!api) return { error: 'vendas_indisponivel' }

  return faturar ? api.faturar(payload) : api.create(payload)
}

export async function cancelSale(id: string, reason?: string): Promise<{ error: string } | { sales: SaleRow[] }> {
  const api = bridge()

  if (!api) return { error: 'vendas_indisponivel' }

  return api.cancel(id, undefined, reason)
}

/** Estimativa local de uma linha: quantidade (milésimos) × preço unitário − desconto. */
export function itemEstimate(quantityMilli: number, unitPriceCents: number): number {
  if (!Number.isFinite(quantityMilli) || !Number.isFinite(unitPriceCents)) return 0

  return Math.max(0, Math.round((quantityMilli * unitPriceCents) / 1000))
}

/** Soma das linhas do rascunho. É só o que a tela mostra — o total gravado vem do main. */
export function draftTotal(items: readonly { quantityMilli: number; unitPriceCents: number }[]): number {
  return items.reduce((total, item) => total + itemEstimate(item.quantityMilli, item.unitPriceCents), 0)
}

/** Quantidade do rascunho em milésimos: "2" → 2000, "1,5" → 1500. */
export function draftQuantity(texto: string): number {
  const limpo = texto.trim().replace(/\s/g, '')

  if (!limpo) return 0

  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const parsed = Number.parseFloat(normalizado)

  return Number.isFinite(parsed) ? Math.round(parsed * 1000) : 0
}

/** Preço do rascunho em centavos: "24,90" → 2490. */
export function draftPrice(texto: string): number {
  const limpo = texto.trim().replace(/\s/g, '')

  if (!limpo) return 0

  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const parsed = Number.parseFloat(normalizado)

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0
}

/** Payload da venda. Nunca inclui `total_cents`: o main recalcula e ignora o que vier. */
/**
 * Formas de pagamento aceitas (r117). Duplicado do backend de propósito: o renderer não importa de
 * `electron/`. A lista é fechada nos dois lados; o servidor descarta valor fora dela.
 */
export const PAYMENT_METHODS = ['dinheiro', 'pix', 'credito', 'debito', 'boleto', 'transferencia', 'outro'] as const

export function salePayload(
  items: readonly { productSku: string; quantityMilli: number; unitPriceCents: number }[],
  contactPhone = '',
  paymentMethod?: string
): Record<string, unknown> {
  return {
    contact_phone: contactPhone.trim(),
    ...(paymentMethod ? { payment_method: paymentMethod } : {}),
    items: items.map(item => ({
      product_sku: item.productSku,
      quantity_milli: item.quantityMilli,
      unit_price_cents: item.unitPriceCents
    }))
  }
}

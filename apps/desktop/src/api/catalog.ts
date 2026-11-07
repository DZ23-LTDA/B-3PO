/**
 * Catálogo de produtos no renderer.
 *
 * A verdade é do processo principal (arquivo sob `userData`); aqui só se tipa a chamada e se formatam
 * os valores para a tela. Nada de regra de negócio: validação e cálculo de preço moram no main.
 */

export const PRODUCT_UNITS_LABEL: Record<string, string> = {
  cx: 'caixa',
  g: 'g',
  kg: 'kg',
  l: 'L',
  m: 'm',
  m2: 'm²',
  m3: 'm³',
  ml: 'mL',
  pct: 'pacote',
  un: 'un'
}

export interface ProductRow {
  active: boolean
  barcode: string
  category: string
  cost_cents: number
  created_at: number
  id: string
  name: string
  price_cents: number
  sku: string
  tenant_id: string
  unit: string
  updated_at: number
}

interface CatalogBridge {
  list: (tenantId?: string) => Promise<{ products: ProductRow[] }>
  remove: (id: string, tenantId?: string) => Promise<{ products: ProductRow[] }>
  upsert: (payload: Partial<ProductRow>) => Promise<{ error: string } | { products: ProductRow[] }>
}

function bridge(): CatalogBridge | null {
  const host = (globalThis as { hermesDesktop?: { catalog?: CatalogBridge } }).hermesDesktop

  return host?.catalog ?? null
}

export function catalogAvailable(): boolean {
  return bridge() !== null
}

export async function listProducts(tenantId?: string): Promise<ProductRow[]> {
  const api = bridge()

  if (!api) {
    return []
  }

  const resposta = await api.list(tenantId)

  return Array.isArray(resposta?.products) ? resposta.products : []
}

export async function saveProduct(payload: Partial<ProductRow>): Promise<{ error: string } | { products: ProductRow[] }> {
  const api = bridge()

  if (!api) {
    return { error: 'catalogo_indisponivel' }
  }

  return api.upsert(payload)
}

export async function removeProduct(id: string, tenantId?: string): Promise<ProductRow[]> {
  const api = bridge()

  if (!api) {
    return []
  }

  const resposta = await api.remove(id, tenantId)

  return Array.isArray(resposta?.products) ? resposta.products : []
}

/** Preço para exibição, em pt-BR: 2490 → "R$ 24,90". */
export function priceLabel(cents: number): string {
  const valor = Number.isFinite(cents) ? cents / 100 : 0

  return valor.toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })
}

/** Margem sobre o preço de venda, quando há custo. Sem custo não há margem — e não se inventa 100%. */
export function marginPercent(priceCents: number, costCents: number): number | null {
  if (!Number.isFinite(priceCents) || !Number.isFinite(costCents) || priceCents <= 0 || costCents <= 0) {
    return null
  }

  return Math.round(((priceCents - costCents) / priceCents) * 100)
}

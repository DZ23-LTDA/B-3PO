/**
 * Compras no renderer.
 *
 * O total é calculado no processo principal; aqui só se monta o payload e se formata. Receber é a
 * operação que atravessa para o estoque — a tela só dispara e recarrega os saldos.
 */

export interface SupplierRow {
  active: boolean
  cnpj: string
  email: string
  id: string
  name: string
  notes: string
  phone: string
}

export interface PurchaseItemRow {
  product_sku: string
  quantity_milli: number
  total_cents: number
  unit_cost_cents: number
}

export interface PurchaseOrderRow {
  id: string
  items: PurchaseItemRow[]
  notes: string
  number: number
  status: string
  supplier_id: string
  total_cents: number
}

interface PurchasesBridge {
  orders: (tenantId?: string) => Promise<{ orders: PurchaseOrderRow[] }>
  receive: (payload: Record<string, unknown>) => Promise<{ error: string } | { order: PurchaseOrderRow; orders: PurchaseOrderRow[] }>
  saveOrder: (payload: Record<string, unknown>) => Promise<{ error: string } | { order: PurchaseOrderRow; orders: PurchaseOrderRow[] }>
  saveSupplier: (payload: Record<string, unknown>) => Promise<{ error: string } | { supplier: SupplierRow; suppliers: SupplierRow[] }>
  suppliers: (tenantId?: string) => Promise<{ suppliers: SupplierRow[] }>
}

function bridge(): PurchasesBridge | null {
  const host = (globalThis as { hermesDesktop?: { purchases?: PurchasesBridge } }).hermesDesktop

  return host?.purchases ?? null
}

export function purchasesAvailable(): boolean {
  return bridge() !== null
}

export async function listSuppliers(): Promise<SupplierRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.suppliers()

  return Array.isArray(r?.suppliers) ? r.suppliers : []
}

export async function listOrders(): Promise<PurchaseOrderRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.orders()

  return Array.isArray(r?.orders) ? r.orders : []
}

export async function saveSupplier(payload: Record<string, unknown>): Promise<{ error: string } | { suppliers: SupplierRow[] }> {
  const api = bridge()

  if (!api) return { error: 'compras_indisponivel' }

  const r = await api.saveSupplier(payload)

  return 'error' in r ? r : { suppliers: r.suppliers }
}

export async function saveOrder(
  payload: Record<string, unknown>,
  receber: boolean
): Promise<{ error: string } | { orders: PurchaseOrderRow[] }> {
  const api = bridge()

  if (!api) return { error: 'compras_indisponivel' }

  const r = receber ? await api.receive(payload) : await api.saveOrder(payload)

  return 'error' in r ? r : { orders: r.orders }
}

/** Custo do rascunho em centavos: "10,00" → 1000. */
export function costValue(texto: string): number {
  const limpo = texto.trim().replace(/\s/g, '')

  if (!limpo) return 0

  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const parsed = Number.parseFloat(normalizado)

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0
}

/** Quantidade em milésimos para o payload. */
export function quantityValue(texto: string): number {
  const limpo = texto.trim().replace(/\s/g, '')

  if (!limpo) return 0

  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const parsed = Number.parseFloat(normalizado)

  return Number.isFinite(parsed) ? Math.round(parsed * 1000) : 0
}

export function orderPayload(
  supplierId: string,
  itens: readonly { productSku: string; quantityMilli: number; unitCostCents: number }[]
): Record<string, unknown> {
  return {
    items: itens.map(item => ({
      product_sku: item.productSku,
      quantity_milli: item.quantityMilli,
      unit_cost_cents: item.unitCostCents
    })),
    supplier_id: supplierId.trim()
  }
}

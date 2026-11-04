// Compras: fornecedores e pedidos de compra.
//
// Mesma disciplina dos outros domínios: **total nunca vem do chamador**, ele é calculado dos itens.
//
// A ligação com o estoque é por contrato, como em vendas: receber um pedido **não** grava no estoque
// daqui — `stockMovementsFor` devolve as entradas e quem chama lança no ledger, com `ref` determinística
// (`compra:<id>:<sku>`). Dois arquivos JSON não têm transação entre si; fingir que têm esconderia o
// caso em que o pedido é recebido e a mercadoria não entra.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'
import { cents } from './money'
import { milli } from './quantity'

export const PURCHASE_STATUSES = ['rascunho', 'pedido', 'recebido', 'cancelado'] as const

export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number]

export interface Supplier {
  active: boolean
  cnpj: string
  created_at: number
  email: string
  id: string
  name: string
  notes: string
  phone: string
  tenant_id: string
  updated_at: number
}

export interface PurchaseItem {
  product_sku: string
  quantity_milli: number
  total_cents: number
  unit_cost_cents: number
}

export interface PurchaseOrder {
  created_at: number
  id: string
  items: PurchaseItem[]
  notes: string
  number: number
  status: PurchaseStatus
  supplier_id: string
  tenant_id: string
  total_cents: number
  updated_at: number
}

export interface PurchasesFile {
  orders: PurchaseOrder[]
  schema_version: 1
  suppliers: Supplier[]
}

function emptyPurchases(): PurchasesFile {
  return { orders: [], schema_version: 1, suppliers: [] }
}

export function purchasesStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'purchases.json')
}

export function isPurchaseStatus(value: unknown): value is PurchaseStatus {
  return typeof value === 'string' && (PURCHASE_STATUSES as readonly string[]).includes(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeSupplier(input: unknown, now: number): { error: string } | { supplier: Supplier } {
  const raw = (input ?? {}) as Record<string, unknown>
  const name = text(raw['name'])

  if (!name) {
    return { error: 'name_required' }
  }

  return {
    supplier: {
      active: raw['active'] === undefined ? true : raw['active'] === true,
      cnpj: text(raw['cnpj']).replace(/\D/g, ''),
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      email: text(raw['email']),
      id: text(raw['id']) || `sup_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      notes: text(raw['notes']),
      phone: text(raw['phone']),
      tenant_id: text(raw['tenant_id']) || DEFAULT_TENANT,
      updated_at: now
    }
  }
}

export function itemTotal(quantityMilli: number, unitCostCents: number): number {
  return Math.max(0, Math.round((quantityMilli * unitCostCents) / 1000))
}

export function normalizePurchase(
  input: unknown,
  now: number
): { error: string } | { order: Omit<PurchaseOrder, 'number'> } {
  const raw = (input ?? {}) as Record<string, unknown>
  const supplierId = text(raw['supplier_id'])
  const itensBrutos = Array.isArray(raw['items']) ? raw['items'] : []

  if (!supplierId) {
    return { error: 'supplier_required' }
  }

  if (itensBrutos.length === 0) {
    return { error: 'items_required' }
  }

  const items: PurchaseItem[] = []

  for (const bruto of itensBrutos) {
    const item = (bruto ?? {}) as Record<string, unknown>
    const sku = text(item['product_sku'])
    const brutoMilli = item['quantity_milli']
    const quantity =
      brutoMilli === undefined || brutoMilli === null
        ? milli(item['quantity'])
        : Number.isFinite(Number(brutoMilli))
          ? Math.round(Number(brutoMilli))
          : 0

    if (!sku) {
      return { error: 'item_sem_sku' }
    }

    if (quantity <= 0) {
      return { error: 'item_quantity_required' }
    }

    const custo = cents(item['unit_cost_cents'])

    items.push({ product_sku: sku, quantity_milli: quantity, total_cents: itemTotal(quantity, custo), unit_cost_cents: custo })
  }

  const status = raw['status']

  if (status !== undefined && status !== null && text(status) !== '' && !isPurchaseStatus(status)) {
    return { error: 'status_invalid' }
  }

  return {
    order: {
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      id: text(raw['id']) || `po_${now}_${Math.random().toString(36).slice(2, 8)}`,
      items,
      notes: text(raw['notes']),
      status: isPurchaseStatus(status) ? status : 'rascunho',
      supplier_id: supplierId,
      tenant_id: text(raw['tenant_id']) || DEFAULT_TENANT,
      total_cents: items.reduce((total, item) => total + item.total_cents, 0),
      updated_at: now
    }
  }
}

export function parsePurchases(raw: string): PurchasesFile {
  try {
    const parsed = JSON.parse(raw) as Partial<PurchasesFile>
    const suppliers = Array.isArray(parsed?.suppliers)
      ? parsed.suppliers.filter(entry => !!entry && typeof entry.id === 'string' && typeof entry.tenant_id === 'string')
      : []
    const orders = Array.isArray(parsed?.orders)
      ? parsed.orders.filter(
          entry =>
            !!entry &&
            typeof entry.id === 'string' &&
            typeof entry.tenant_id === 'string' &&
            typeof entry.number === 'number' &&
            isPurchaseStatus((entry as PurchaseOrder).status) &&
            Array.isArray((entry as PurchaseOrder).items)
        )
      : []

    return { orders, schema_version: 1, suppliers }
  } catch {
    return emptyPurchases()
  }
}

/**
 * As entradas de estoque que o pedido recebido exige.
 *
 * `ref` determinística: receber o mesmo pedido duas vezes não entra mercadoria duas vezes. Pedido em
 * rascunho ou ainda em pedido não movimenta nada — a mercadoria não chegou.
 */
export function stockMovementsFor(order: PurchaseOrder): {
  kind: 'entrada'
  product_sku: string
  quantity_milli: number
  reason: string
  ref: string
  tenant_id: string
}[] {
  if (order.status !== 'recebido') {
    return []
  }

  return order.items
    .filter(item => item.quantity_milli > 0 && item.product_sku)
    .map(item => ({
      kind: 'entrada' as const,
      product_sku: item.product_sku,
      quantity_milli: item.quantity_milli,
      reason: `compra ${order.number}`,
      ref: `compra:${order.id}:${item.product_sku}`,
      tenant_id: order.tenant_id
    }))
}

export class PurchasesStore {
  constructor(private readonly filePath: string) {}

  async suppliers(tenantId: string = DEFAULT_TENANT): Promise<Supplier[]> {
    const file = await this.read()

    return file.suppliers
      .filter(supplier => supplier.tenant_id === tenantId)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  async orders(tenantId: string = DEFAULT_TENANT): Promise<PurchaseOrder[]> {
    const file = await this.read()

    return file.orders.filter(order => order.tenant_id === tenantId).sort((a, b) => b.number - a.number)
  }

  async upsertSupplier(input: unknown): Promise<{ error: string } | { supplier: Supplier; suppliers: Supplier[] }> {
    const normalized = normalizeSupplier(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const supplier = normalized.supplier
    const duplicado = file.suppliers.some(
      entry =>
        entry.id !== supplier.id &&
        entry.tenant_id === supplier.tenant_id &&
        entry.name.toLowerCase() === supplier.name.toLowerCase()
    )

    if (duplicado) {
      return { error: 'fornecedor_duplicado' }
    }

    const indice = file.suppliers.findIndex(entry => entry.id === supplier.id)

    if (indice >= 0) {
      file.suppliers[indice] = { ...supplier, created_at: file.suppliers[indice]!.created_at }
    } else {
      file.suppliers.push(supplier)
    }

    await this.write(file)

    return { supplier, suppliers: await this.suppliers(supplier.tenant_id) }
  }

  async saveOrder(input: unknown): Promise<{ error: string } | { order: PurchaseOrder; orders: PurchaseOrder[] }> {
    const normalized = normalizePurchase(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const dados = normalized.order
    const anterior = file.orders.find(order => order.id === dados.id)

    // Pedido recebido é definitivo: a mercadoria já entrou. Corrigir é lançar o inverso no estoque.
    if (anterior && anterior.status === 'recebido') {
      return { error: 'pedido_recebido_imutavel' }
    }

    const numeroAnterior = file.orders
      .filter(order => order.tenant_id === dados.tenant_id)
      .reduce((maior, order) => Math.max(maior, order.number), 0)

    const order: PurchaseOrder = {
      ...dados,
      created_at: anterior ? anterior.created_at : dados.created_at,
      number: anterior ? anterior.number : numeroAnterior + 1
    }
    const indice = file.orders.findIndex(entry => entry.id === order.id)

    if (indice >= 0) {
      file.orders[indice] = order
    } else {
      file.orders.push(order)
    }

    await this.write(file)

    return { order, orders: await this.orders(order.tenant_id) }
  }

  private async read(): Promise<PurchasesFile> {
    try {
      return parsePurchases(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptyPurchases()
    }
  }

  private async write(file: PurchasesFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}

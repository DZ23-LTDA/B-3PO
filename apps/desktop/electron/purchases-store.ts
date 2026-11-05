// Compras: fornecedores e pedidos de compra.
//
// Mesma disciplina dos outros domínios: **total nunca vem do chamador**, ele é calculado dos itens.
//
// A ligação com o estoque é por contrato, como em vendas: receber um pedido **não** grava no estoque
// daqui — `stockMovementsFor` devolve as entradas e quem chama lança no ledger, com `ref` determinística
// (`compra:<id>:<sku>`). Dois arquivos JSON não têm transação entre si; fingir que têm esconderia o
// caso em que o pedido é recebido e a mercadoria não entra.

import { WriteQueue } from './write-queue'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'
import { cents } from './money'
import { milli } from './quantity'
import { refCompraItem } from './refs'

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
  /**
   * A decisão de aprovação, quando o pedido passou do limite (r26 do GOAL V2).
   *
   * `null` significa "não precisou" — e é diferente de "precisou e ninguém aprovou", que é o estado em
   * que o pedido simplesmente não existe como recebido.
   *
   * `total_aprovado_cents` guarda o valor no momento da assinatura: se os itens mudarem depois, a
   * diferença fica visível em vez de herdar silenciosamente uma autorização dada para outro montante.
   */
  approval?: null | {
    aprovado_em: number
    aprovador: string
    solicitante: string
    total_aprovado_cents: number
  }
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
  /**
   * O limite de compra vigente (r27 do GOAL V2).
   *
   * Antes desta rodada ele era **injetado na montagem** — ou seja, só mudava editando código. A r25
   * auditou e a r27 fechou: agora mora no mesmo arquivo do domínio, como todo o resto de Compras.
   *
   * `cents: null` significa **sem limite** — e é o estado inicial. Um número inventado por mim daria a
   * impressão de controle sem exercer nenhum.
   */
  limite: { aprovadores: string[]; cents: null | number }
  orders: PurchaseOrder[]
  schema_version: 1
  suppliers: Supplier[]
}

/**
 * Normaliza o limite lido do disco.
 *
 * Ausente (arquivo de versão anterior) vira **sem limite** — e não um erro: um produto que recusa abrir
 * porque o arquivo não tem um campo novo puniria o usuário por uma atualização.
 */
export function normalizarLimite(bruto: unknown): { aprovadores: string[]; cents: null | number } {
  const raw = (bruto ?? {}) as Record<string, unknown>
  const cents = typeof raw['cents'] === 'number' && Number.isFinite(raw['cents']) && raw['cents'] > 0 ? raw['cents'] : null
  const aprovadores = Array.isArray(raw['aprovadores'])
    ? raw['aprovadores'].filter((a): a is string => typeof a === 'string' && a.trim() !== '').map(a => a.trim())
    : []

  return { aprovadores, cents }
}

function emptyPurchases(): PurchasesFile {
  return { limite: { aprovadores: [], cents: null }, orders: [], schema_version: 1, suppliers: [] }
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

    return { limite: normalizarLimite(parsed.limite), orders, schema_version: 1, suppliers }
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
      ref: refCompraItem(order.id, item.product_sku),
      tenant_id: order.tenant_id
    }))
}

export class PurchasesStore {
  constructor(private readonly filePath: string) {}

  /** Fila de escrita (r238): read -> valida -> write nao era serializado. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  /**
   * O limite vigente. Sem isso, situacaoDaCompra recebe SEM_LIMITE e nada exige aprovação.
   *
   * É a leitura que o rp-ipc injeta em limiteDeCompra — antes da r27, nenhum chamador passava
   * nada, e o controle estava **inerte**.
   */
  async lerLimite(): Promise<{ aprovadores: string[]; cents: null | number }> {
    return (await this.read()).limite
  }

  /**
   * Define o limite — cents e provadores juntos.
   *
   * Duas recusas, e cada uma diz o que corrigir:
   *
   *   limite_invalido       cents não é um número positivo. Limite zero ou negativo não é limite:
   *                           é "revisar tudo", e tratar isso como limite barraria toda compra
   *   provadores_obrigatorios  limite ligado sem aprovador não protege ninguém — a recusa viraria
   *                           bloqueio permanente, que é o beco que a r26 fechou
   */
  async definirLimite(input: unknown): Promise<{ error: string } | { limite: { aprovadores: string[]; cents: null | number } }> {
    const raw = (input ?? {}) as Record<string, unknown>

    // Passar `cents: null` desliga o controle de propósito — é o único jeito de voltar ao inicial.
    if (raw['cents'] === null) {
      return this.fila.serializar(async () => {
        const conteudo = await this.read()

        conteudo.limite = { aprovadores: [], cents: null }
        await this.write(conteudo)

        return { limite: conteudo.limite }
      })
    }

    const cents = typeof raw['cents'] === 'number' ? raw['cents'] : Number.NaN

    if (!Number.isFinite(cents) || cents <= 0) return { error: 'limite_invalido' }

    const aprovadores = Array.isArray(raw['aprovadores'])
      ? raw['aprovadores'].filter((a): a is string => typeof a === 'string' && a.trim() !== '').map(a => a.trim())
      : []

    if (aprovadores.length === 0) return { error: 'aprovadores_obrigatorios' }

    return this.fila.serializar(async () => {
      const conteudo = await this.read()

      conteudo.limite = { aprovadores, cents }
      await this.write(conteudo)

      return { limite: conteudo.limite }
    })
  }

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
    return this.fila.serializar(() => this.upsertSupplierSerializado(input))
  }

  private async upsertSupplierSerializado(input: unknown): Promise<{ error: string } | { supplier: Supplier; suppliers: Supplier[] }> {
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
    return this.fila.serializar(() => this.saveOrderSerializado(input))
  }

  private async saveOrderSerializado(input: unknown): Promise<{ error: string } | { order: PurchaseOrder; orders: PurchaseOrder[] }> {
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

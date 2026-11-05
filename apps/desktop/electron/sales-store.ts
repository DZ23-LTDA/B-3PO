// Vendas (orçamento e pedido) no disco do usuário.
//
// A decisão central: **o total nunca vem do chamador**. Ele é calculado dos itens, aqui, no processo
// principal. Aceitar `total_cents` do renderer seria permitir que a tela definisse quanto o cliente
// pagou — o tipo de confiança que o GOAL proíbe explicitamente ("nunca confiar no frontend").
//
// A segunda: **venda não muda depois de faturada**. Cancelar é um estado, não uma exclusão. O histórico
// comercial precisa sobreviver ao cancelamento, senão o relatório de vendas perde a memória do que
// aconteceu.
//
// A terceira, e a mais importante de declarar: **este store não dá baixa no estoque**. Dois arquivos
// JSON não têm transação atômica entre si; fingir que têm esconderia o caso em que a venda grava e o
// estoque não. Em vez disso a venda expõe `stockMovementsFor`, com `ref` determinística, e o chamador
// lança a baixa por um caminho idempotente — repetir não duplica.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'
import { cents } from './money'
import { milli } from './quantity'

export const SALE_STATUSES = ['orcamento', 'pedido', 'faturado', 'cancelado'] as const

export type SaleStatus = (typeof SALE_STATUSES)[number]

/**
 * Forma de pagamento (rodada 117).
 *
 * Sem este campo o fechamento de caixa nao consegue separar dinheiro de PIX, e o operador nao tem como
 * conferir a gaveta. A lista e fechada de proposito: texto livre viraria "pix", "PIX", "Pix" e "pixx" em
 * quatro linhas do fechamento.
 */
export const PAYMENT_METHODS = ['dinheiro', 'pix', 'credito', 'debito', 'boleto', 'transferencia', 'outro'] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value)
}

export interface SaleItem {
  /** SKU do catálogo, quando o item veio de um produto cadastrado. */
  product_sku: string
  /** Texto livre do item: um serviço ou um produto avulso não têm SKU. */
  description: string
  discount_cents: number
  /** Derivado: `quantity_milli * unit_price_cents / 1000 - discount_cents`, nunca negativo. */
  total_cents: number
  /** Milésimos. */
  quantity_milli: number
  unit_price_cents: number
}

export interface Sale {
  contact_phone: string
  created_at: number
  currency: string
  id: string
  /** Número sequencial por empresa: o número que o cliente vê. */
  number: number
  notes: string
  /**
   * Ausente em vendas anteriores a rodada 117. Ausencia e "nao informado", nunca "sem custo": o fechamento
   * mostra essas vendas numa linha propria para o operador saber que faltou o dado.
   */
  payment_method?: PaymentMethod
  status: SaleStatus
  tenant_id: string
  total_cents: number
  updated_at: number
  items: SaleItem[]
}

export interface SalesFile {
  sales: Sale[]
  schema_version: 1
}

function emptySales(): SalesFile {
  return { sales: [], schema_version: 1 }
}

export function salesStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'sales.json')
}

export function isSaleStatus(value: unknown): value is SaleStatus {
  return typeof value === 'string' && (SALE_STATUSES as readonly string[]).includes(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Total de um item: quantidade × preço unitário, menos desconto, nunca negativo. */
export function itemTotal(quantityMilli: number, unitPriceCents: number, discountCents: number): number {
  const bruto = Math.round((quantityMilli * unitPriceCents) / 1000)

  return Math.max(0, bruto - discountCents)
}

/** Soma dos itens. É a única fonte do total de uma venda. */
export function saleTotal(items: readonly SaleItem[]): number {
  return items.reduce((total, item) => total + item.total_cents, 0)
}

function normalizeItem(input: unknown): { error: string } | { item: SaleItem } {
  const raw = (input ?? {}) as Record<string, unknown>
  const sku = text(raw['product_sku'])
  const description = text(raw['description'])
  // `quantity_milli` já está em milésimos; `quantity` é em unidades. Reconvertendo os dois, uma linha
  // de 3000 milésimos viraria 3.000.000 — e o faturamento recusaria por "saldo insuficiente" com o
  // estoque cheio. É o mesmo defeito que apareceu no estoque na rodada 4; aqui ele passou desapercebido
  // porque os testes de venda falavam em unidades.
  const brutoMilli = raw['quantity_milli']
  const quantity =
    brutoMilli === undefined || brutoMilli === null
      ? milli(raw['quantity'])
      : Number.isFinite(Number(brutoMilli))
        ? Math.round(Number(brutoMilli))
        : 0

  if (!sku && !description) {
    return { error: 'item_sem_identidade' }
  }

  if (quantity <= 0) {
    return { error: 'item_quantity_required' }
  }

  const unitPrice = cents(raw['unit_price_cents'])
  const bruto = Math.round((quantity * unitPrice) / 1000)
  const desconto = cents(raw['discount_cents'])

  // Desconto maior que o valor do item é erro de digitação, não venda de graça.
  if (desconto > bruto) {
    return { error: 'desconto_maior_que_item' }
  }

  return {
    item: {
      description,
      discount_cents: desconto,
      product_sku: sku,
      quantity_milli: quantity,
      total_cents: itemTotal(quantity, unitPrice, desconto),
      unit_price_cents: unitPrice
    }
  }
}

export function normalizeSale(input: unknown, now: number): { error: string } | { sale: Omit<Sale, 'number'> } {
  const raw = (input ?? {}) as Record<string, unknown>
  const itensBrutos = Array.isArray(raw['items']) ? raw['items'] : []

  if (itensBrutos.length === 0) {
    return { error: 'items_required' }
  }

  const items: SaleItem[] = []

  for (const bruto of itensBrutos) {
    const normalizado = normalizeItem(bruto)

    if ('error' in normalizado) {
      return { error: normalizado.error }
    }

    items.push(normalizado.item)
  }

  const status = raw['status']

  if (status !== undefined && status !== null && text(status) !== '' && !isSaleStatus(status)) {
    return { error: 'status_invalid' }
  }

  return {
    sale: {
      // `total_cents` do chamador é ignorado de propósito: só os itens definem o total.
      contact_phone: text(raw['contact_phone']),
      created_at: now,
      currency: (text(raw['currency']) || 'BRL').toUpperCase(),
      id: text(raw['id']) || `sale_${now}_${Math.random().toString(36).slice(2, 8)}`,
      items,
      notes: text(raw['notes']),
      ...(isPaymentMethod(raw['payment_method']) ? { payment_method: raw['payment_method'] as PaymentMethod } : {}),
      status: isSaleStatus(status) ? status : 'orcamento',
      tenant_id: text(raw['tenant_id']) || DEFAULT_TENANT,
      total_cents: saleTotal(items),
      updated_at: now
    }
  }
}

export function parseSales(raw: string): SalesFile {
  try {
    const parsed = JSON.parse(raw) as Partial<SalesFile>

    if (!parsed || !Array.isArray(parsed.sales)) {
      return emptySales()
    }

    return {
      sales: parsed.sales.filter(
        entry =>
          !!entry &&
          typeof entry.id === 'string' &&
          typeof entry.tenant_id === 'string' &&
          typeof entry.number === 'number' &&
          isSaleStatus((entry as Sale).status) &&
          Array.isArray((entry as Sale).items)
      ),
      schema_version: 1
    }
  } catch {
    return emptySales()
  }
}

/**
 * As movimentações de estoque que esta venda exige, como dados puros.
 *
 * `ref` é determinística (`venda:<id>`), então o estoque deduplica por ela: faturar duas vezes o mesmo
 * pedido não baixa duas vezes. Só venda faturada gera baixa — orçamento e pedido ainda não saíram do
 * depósito.
 */
export function stockMovementsFor(sale: Sale): { kind: 'saida'; product_sku: string; quantity_milli: number; reason: string; ref: string; tenant_id: string }[] {
  if (sale.status !== 'faturado') {
    return []
  }

  return sale.items
    .filter(item => item.quantity_milli > 0 && item.product_sku)
    .map(item => ({
      kind: 'saida' as const,
      product_sku: item.product_sku,
      quantity_milli: item.quantity_milli,
      reason: `venda ${sale.number}`,
      ref: `venda:${sale.id}:${item.product_sku}`,
      tenant_id: sale.tenant_id
    }))
}

export class SalesStore {
  /**
   * Fila de escrita (r235).
   *
   * Mesmo defeito da r234 no estoque: read -> valida -> write sem serializacao. Duas chamadas simultaneas leem o
   * mesmo estado e a segunda grava por cima da primeira.
   *
   * A fila e por INSTANCIA, que e a unidade de escrita do arquivo. Duas instancias sobre o mesmo arquivo continuam
   * sem protecao mutua - isso exigiria lock de sistema de arquivos, e o produto usa uma instancia por diretorio.
   */
  private fila: Promise<unknown> = Promise.resolve()

  /** Serializa uma escrita: a proxima so comeca quando esta terminar. */
  private serializar<T>(run: () => Promise<T>): Promise<T> {
    const resultado = this.fila.then(run)

    this.fila = resultado.catch(() => undefined)

    return resultado
  }

  constructor(private readonly filePath: string) {}

  async list(tenantId: string = DEFAULT_TENANT): Promise<Sale[]> {
    const file = await this.read()

    return file.sales
      .filter(sale => sale.tenant_id === tenantId)
      .sort((a, b) => b.number - a.number)
  }

  async create(input: unknown): Promise<{ error: string } | { sale: Sale; sales: Sale[] }> {
    return this.serializar(() => this.createSerializado(input))
  }

  private async createSerializado(input: unknown): Promise<{ error: string } | { sale: Sale; sales: Sale[] }> {
    const normalized = normalizeSale(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const dados = normalized.sale
    const anterior = file.sales.find(sale => sale.id === dados.id)

    // Editar venda faturada reescreveria o que o cliente já recebeu — recusa em vez de aceitar calado.
    if (anterior && anterior.status === 'faturado') {
      return { error: 'venda_faturada_imutavel' }
    }

    const numeroAnterior = file.sales
      .filter(sale => sale.tenant_id === dados.tenant_id)
      .reduce((maior, sale) => Math.max(maior, sale.number), 0)

    const sale: Sale = {
      ...dados,
      created_at: anterior ? anterior.created_at : dados.created_at,
      number: anterior ? anterior.number : numeroAnterior + 1
    }
    const indice = file.sales.findIndex(entry => entry.id === sale.id)

    if (indice >= 0) {
      file.sales[indice] = sale
    } else {
      file.sales.push(sale)
    }

    await this.write(file)

    return { sale, sales: await this.list(sale.tenant_id) }
  }

  /** Cancelar é mudar o estado; a venda continua no histórico. */
  async cancel(id: string, tenantId: string = DEFAULT_TENANT, reason = ''): Promise<{ error: string } | { sales: Sale[] }> {
    return this.serializar(() => this.cancelSerializado(id, tenantId, reason))
  }

  private async cancelSerializado(id: string, tenantId: string = DEFAULT_TENANT, reason = ''): Promise<{ error: string } | { sales: Sale[] }> {
    const file = await this.read()
    const indice = file.sales.findIndex(sale => sale.id === id && sale.tenant_id === tenantId)

    if (indice < 0) {
      return { error: 'venda_nao_encontrada' }
    }

    const anterior = file.sales[indice]!

    if (anterior.status === 'faturado') {
      return { error: 'venda_faturada_imutavel' }
    }

    file.sales[indice] = {
      ...anterior,
      notes: reason ? `${anterior.notes} | cancelada: ${reason}`.trim() : anterior.notes,
      status: 'cancelado',
      updated_at: Date.now()
    }
    await this.write(file)

    return { sales: await this.list(tenantId) }
  }

  private async read(): Promise<SalesFile> {
    try {
      return parseSales(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptySales()
    }
  }

  private async write(file: SalesFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}

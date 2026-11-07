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
import {
  isSolicitacaoStatus,
  mudarStatusSolicitacao,
  normalizarSolicitacao,
  prepararAtendimento,
  type SolicitacaoCompra
} from './purchases-solicitacao'
import { backupRotativo } from './store-backup'

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
  /**
   * Solicitações de compra (r41 do GOAL V2).
   *
   * Aditivo: ausente no arquivo antigo vira lista vazia, e voltar atrás é remover a lista. Nenhum campo
   * existente muda de forma, então não há migração a escrever.
   */
  solicitacoes: SolicitacaoCompra[]
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
  return { limite: { aprovadores: [], cents: null }, orders: [], schema_version: 1, solicitacoes: [], suppliers: [] }
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

  return { order: montarPedido(raw, items, supplierId, status, now) }
}

/**
 * Monta o pedido normalizado (r51).
 *
 * Extraída de `normalizePurchase` porque a checagem de `approval` levou a função original a **CC 20** —
 * o teto do projeto. A extração não muda comportamento: muda quem responde por ele, e devolve à
 * `normalizePurchase` a responsabilidade única de **validar** a entrada.
 */
function montarPedido(
  raw: Record<string, unknown>,
  items: PurchaseItem[],
  supplierId: string,
  status: unknown,
  now: number
): Omit<PurchaseOrder, 'number'> {
  return {
    created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
    // r51 do GOAL V2: `approval` NUNCA era preservado. A r26-r28 criou a aprovação, o store a recebia e
    // esta montagem a DESCARTAVA — a assinatura existia no retorno do canal e não no disco.
    //
    // É por isso que a validade (r51) não podia ser checada: não havia aprovação gravada para ler.
    ...(isApproval(raw['approval']) ? { approval: raw['approval'] } : {}),
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

/**
 * O formato de `approval` que veio de fora.
 *
 * Validar o shape é o que impede um payload qualquer de gravar `approval: "sim"` e passar por aprovado.
 * Aprovação é o dado que libera dinheiro — o formato dela não pode ser "o que o chamador mandou".
 */
function isApproval(value: unknown): value is NonNullable<PurchaseOrder['approval']> {
  if (!value || typeof value !== 'object') return false

  const raw = value as Record<string, unknown>

  return (
    typeof raw['aprovador'] === 'string' &&
    raw['aprovador'].trim() !== '' &&
    typeof raw['total_aprovado_cents'] === 'number' &&
    Number.isFinite(raw['total_aprovado_cents']) &&
    typeof raw['aprovado_em'] === 'number'
  )
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

    return {
      limite: normalizarLimite(parsed.limite),
      orders,
      schema_version: 1,
      // Ausente no arquivo antigo vira lista vazia: um produto que recusa abrir porque falta um campo
      // novo puniria o usuario por uma atualizacao.
      solicitacoes: Array.isArray(parsed.solicitacoes) ? parsed.solicitacoes.filter(s => s && typeof s === 'object') : [],
      suppliers
    }
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

  // ─── Solicitações (r42 do GOAL V2) ───────────────────────────────────────────────────────────────

  /** As solicitações do tenant, mais recentes primeiro. */
  async solicitacoes(tenantId: string = DEFAULT_TENANT): Promise<SolicitacaoCompra[]> {
    const file = await this.read()

    return file.solicitacoes
      .filter(s => s.tenant_id === tenantId)
      .sort((a, b) => b.created_at - a.created_at)
  }

  /**
   * Cria uma solicitação.
   *
   * O `solicitante` **vem de quem chama**, não do payload — o canal o resolve de `actorOf`. Se viesse do
   * payload, bastaria escrever o nome de outra pessoa para pedir em nome dela.
   */
  async criarSolicitacao(
    input: unknown,
    solicitante: string,
    agora: number = Date.now()
  ): Promise<{ error: string } | { solicitacao: SolicitacaoCompra; solicitacoes: SolicitacaoCompra[] }> {
    return this.fila.serializar(async () => {
      const conteudo = await this.read()
      const r = normalizarSolicitacao(input, {
        agora,
        solicitante,
        tenant_id: typeof (input as Record<string, unknown>)?.['tenant_id'] === 'string'
          ? String((input as Record<string, unknown>)['tenant_id'])
          : DEFAULT_TENANT
      })

      if ('error' in r) return { error: r.error }

      conteudo.solicitacoes.push(r.solicitacao)
      await this.write(conteudo)

      return {
        solicitacao: r.solicitacao,
        solicitacoes: await this.solicitacoes(r.solicitacao.tenant_id)
      }
    })
  }

  /**
   * Muda o status de uma solicitação.
   *
   * As transições são de mão única (§14): `atendida` e `cancelada` não voltam. Reabrir uma atendida faria
   * a mesma necessidade pedir duas vezes; reabrir uma cancelada apagaria o cancelamento, que é um fato.
   */
  async mudarSolicitacao(
    input: unknown,
    agora: number = Date.now()
  ): Promise<{ error: string } | { solicitacao: SolicitacaoCompra; solicitacoes: SolicitacaoCompra[] }> {
    const raw = (input ?? {}) as Record<string, unknown>
    const id = typeof raw['id'] === 'string' ? raw['id'] : ''

    if (!id) return { error: 'solicitacao_obrigatoria' }
    if (!isSolicitacaoStatus(raw['status'])) return { error: 'status_invalido' }

    const novo = raw['status']

    return this.fila.serializar(async () => {
      const conteudo = await this.read()
      const indice = conteudo.solicitacoes.findIndex(s => s.id === id)

      if (indice < 0) return { error: 'solicitacao_inexistente' }

      const atual = conteudo.solicitacoes[indice] as SolicitacaoCompra
      const r = mudarStatusSolicitacao(atual, novo, agora)

      if ('error' in r) return { error: r.error }

      conteudo.solicitacoes[indice] = r.solicitacao
      await this.write(conteudo)

      return { solicitacao: r.solicitacao, solicitacoes: await this.solicitacoes(atual.tenant_id) }
    })
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

  /**
   * Atende uma solicitacao criando o pedido que a cumpre (r44 do GOAL V2).
   *
   * AS DUAS ESCRITAS FICAM AQUI: criar o pedido e marcar a solicitacao. Fazer isso em dois canais
   * deixaria um estado intermediario se o segundo falhasse - solicitacao atendida sem pedido, ou pedido
   * sem origem. Aqui as duas cabem na mesma fila e no mesmo arquivo, que e a unica transacao real que
   * esta arquitetura oferece.
   *
   * O pedido nasce em RASCUNHO: a aprovacao e o limite (r26) continuam valendo na passagem para
   * 'recebido'. Atender uma solicitacao NAO aprova nada.
   */
  async atenderSolicitacao(
    input: unknown,
    agora: number = Date.now()
  ): Promise<{ error: string } | { pedido: PurchaseOrder; solicitacao: SolicitacaoCompra; solicitacoes: SolicitacaoCompra[] }> {
    const raw = (input ?? {}) as Record<string, unknown>
    const id = typeof raw['id'] === 'string' ? raw['id'] : ''
    const fornecedor = typeof raw['supplier_id'] === 'string' ? raw['supplier_id'].trim() : ''

    if (!id) return { error: 'solicitacao_obrigatoria' }

    return this.fila.serializar(async () => {
      const conteudo = await this.read()
      const indice = conteudo.solicitacoes.findIndex(s => s.id === id)

      if (indice < 0) return { error: 'solicitacao_inexistente' }

      const atual = conteudo.solicitacoes[indice] as SolicitacaoCompra
      const numero = conteudo.orders.reduce((maior, o) => Math.max(maior, o.number), 0) + 1
      const preparo = prepararAtendimento(atual, fornecedor, `c-${atual.id}`)

      if ('error' in preparo) return { error: preparo.error }

      // r49 do GOAL V2: o custo vem da PROPOSTA VENCEDORA, nao de zero.
      //
      // Antes desta rodada o pedido nascia com `unit_cost_cents: 0` — `cents(undefined)` e zero, e o
      // resultado era um pedido de valor ZERO que nao gera conta a pagar (`payableForPurchase` recusa
      // total <= 0). A compra existia no estoque e nao existia no financeiro.
      //
      // Sem preco informado, o campo fica 0 e o pedido nasce como estava: **inventar um preco seria pior
      // que um pedido incompleto**, porque um valor errado vira conta a pagar errada.
      const custoBruto = (raw['unit_cost_cents'] ?? 0) as number
      const custo = Number.isFinite(custoBruto) && custoBruto > 0 ? Math.round(custoBruto) : 0

      const normalizado = normalizePurchase(
        {
          items: [{ product_sku: preparo.item.product_sku, quantity_milli: preparo.item.quantity_milli, unit_cost_cents: custo }],
          supplier_id: fornecedor
        },
        agora
      )

      if ('error' in normalizado) return { error: normalizado.error }

      const pedido: PurchaseOrder = {
        ...normalizado.order,
        approval: null,
        // A LIGACAO: o pedido sabe de que solicitacao veio. Sem isto, a etapa 1 e a etapa 5 se
        // encontrariam por acaso, nunca por registro.
        notes: `solicitacao ${atual.id}: ${atual.motivo}`,
        number: numero
      }

      conteudo.orders.push(pedido)
      conteudo.solicitacoes[indice] = {
        ...atual,
        pedido_id: preparo.pedido_id,
        status: 'atendida',
        updated_at: agora
      }

      await this.write(conteudo)

      return {
        pedido,
        solicitacao: conteudo.solicitacoes[indice] as SolicitacaoCompra,
        solicitacoes: await this.solicitacoes(atual.tenant_id)
      }
    })
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
    await backupRotativo(this.filePath)
    await rename(temp, this.filePath)
  }
}

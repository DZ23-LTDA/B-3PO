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

/** Proposta de um fornecedor para uma quantidade pedida. */
export interface CotacaoRow {
  /** Prazo em dias. `null` = nao informado, que nao e o mesmo que "imediato". */
  prazo_dias: number | null
  preco_unit_cents: number
  /** r47: o produto cotado. Sem ele, comparar fornecedores e comparar maca com laranja. */
  product_sku: string
  quantidade_disponivel: number
  supplier_id: string
}

export interface CotacaoEscolhida {
  /** `null` quando havia uma so proposta: nao havia com o que comparar. */
  economia_contra_segunda_cents: number | null
  proposta: { prazo_dias: number | null; preco_total_cents: number; quantidade: number; supplier_id: string }
  segunda: { prazo_dias: number | null; preco_total_cents: number; quantidade: number; supplier_id: string } | null
}

export interface CotacaoGravadaRow {
  created_at: number
  id: string
  prazo_dias: number | null
  preco_unit_cents: number
  /** r47: o produto cotado. Sem ele, comparar fornecedores e comparar maca com laranja. */
  product_sku: string
  quantidade_disponivel: number
  supplier_id: string
  tenant_id: string
}

/**
 * O fornecedor vencedor da cotação de um produto (r48 do GOAL V2).
 *
 * A LIGAÇÃO QUE A r47 TORNOU POSSÍVEL
 *
 * Antes da r47, a cotação não sabia de que produto era — então não havia como responder "qual fornecedor
 * ganhou para o SKU-1". As duas pontas agora têm `product_sku`, e esta função as encontra.
 *
 * TRÊS REGRAS, E CADA UMA TEM UMA RAZÃO
 *
 *   - **só propostas do SKU contam.** Cotação antiga tem `product_sku: ''` e não casa — o que é correto:
 *     usar uma proposta sem produto seria voltar ao erro que a r47 corrigiu.
 *   - **a mais barata vence.** É o critério que o painel usa desde a r198; divergir aqui faria a tela
 *     sugerir um fornecedor e o painel mostrar outro.
 *   - **empate vai para o `supplier_id` menor.** Sem desempate determinístico, dois cliques seguidos
 *     poderiam sugerir fornecedores diferentes para a mesma situação.
 *
 * Devolve `null` quando não há proposta para o produto — e a tela **não pré-seleciona nada**, em vez de
 * inventar um fornecedor. Um campo pré-preenchido errado é mais perigoso que um campo vazio.
 */
export function fornecedorVencedor(cotacoes: readonly CotacaoGravadaRow[], sku: string): null | string {
  const alvo = sku.trim()

  if (!alvo) return null

  const candidatas = cotacoes.filter(
    c => c.product_sku === alvo && Number.isFinite(c.preco_unit_cents) && c.preco_unit_cents > 0
  )

  if (candidatas.length === 0) return null

  const ordenadas = [...candidatas].sort(
    (a, b) => a.preco_unit_cents - b.preco_unit_cents || a.supplier_id.localeCompare(b.supplier_id)
  )

  return ordenadas[0]?.supplier_id ?? null
}

interface PurchasesBridge {
  cotacao: (payload: Record<string, unknown>) => Promise<CotacaoEscolhida | { motivo: string }>
  orders: (tenantId?: string) => Promise<{ orders: PurchaseOrderRow[] }>
  quotations: (tenantId?: string) => Promise<{ quotations: CotacaoGravadaRow[] }>
  removeQuotation: (id: string) => Promise<{ cotacoes: CotacaoGravadaRow[] }>
  receive: (payload: Record<string, unknown>) => Promise<{ error: string } | { order: PurchaseOrderRow; orders: PurchaseOrderRow[] }>
  saveOrder: (payload: Record<string, unknown>) => Promise<{ error: string } | { order: PurchaseOrderRow; orders: PurchaseOrderRow[] }>
  saveQuotation: (payload: Record<string, unknown>) => Promise<{ error: string } | { cotacoes: CotacaoGravadaRow[] }>
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

/**
 * Compara propostas de fornecedores para uma quantidade e devolve a escolha.
 *
 * Nao grava nada: cotacao e proposta, nao compromisso. Devolve `{ motivo }` quando nao ha como escolher —
 * `sem_cotacoes` (ninguem cotou) e `sem_proposta_valida` (todos cotaram e nenhum atende) sao acoes diferentes
 * e a tela precisa distinguir as duas.
 */
export async function escolherCotacao(
  cotacoes: CotacaoRow[],
  quantidade: number
): Promise<CotacaoEscolhida | { motivo: string }> {
  const api = bridge()

  if (!api) return { motivo: 'sem_cotacoes' }

  return api.cotacao({ cotacoes, quantidade })
}

/**
 * Cotacoes gravadas da empresa. Vazio quando nao ha preload — a tela trata como "nenhuma proposta salva".
 */
export async function listQuotations(tenantId?: string): Promise<CotacaoGravadaRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.quotations(tenantId)

  return Array.isArray(r?.quotations) ? r.quotations : []
}

/** Grava uma proposta. Repetir o mesmo `id` substitui — recontar o mesmo fornecedor e correcao. */
export async function saveQuotation(payload: Record<string, unknown>): Promise<{ error: string } | { cotacoes: CotacaoGravadaRow[] }> {
  const api = bridge()

  if (!api) return { error: 'compras_indisponivel' }

  return api.saveQuotation(payload)
}

export async function removeQuotation(id: string): Promise<CotacaoGravadaRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.removeQuotation(id)

  return Array.isArray(r?.cotacoes) ? r.cotacoes : []
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
// ─── Limite de compra e aprovação (r28 do GOAL V2) ────────────────────────────────────────────────
//
// Os três canais que faltavam na tela. O backend os tem desde r26/r27; sem estas funções, a tela não os
// alcança — e é o padrão da r2, agora na quarta camada.

export interface LimiteRow {
  aprovadores: string[]
  /** `null` = sem limite. É o estado inicial, e o único jeito de desligar o controle. */
  cents: null | number
}

interface LimiteBridge {
  aprovar: (payload: Record<string, unknown>) => Promise<{ error: string } | { aprovada: true; pedido: unknown }>
  definirLimite: (payload: Record<string, unknown>) => Promise<{ error: string } | { limite: LimiteRow }>
  limite: () => Promise<{ limite: LimiteRow }>
}

function bridgeLimite(): LimiteBridge | null {
  return (globalThis as { hermesDesktop?: { purchases?: LimiteBridge } }).hermesDesktop?.purchases ?? null
}

export async function lerLimite(): Promise<LimiteRow | null> {
  const api = bridgeLimite()

  if (!api) return null

  const r = await api.limite()

  return r?.limite ?? null
}

export async function definirLimite(cents: null | number, aprovadores: string[]): Promise<{ error: string } | { limite: LimiteRow }> {
  const api = bridgeLimite()

  if (!api) return { error: 'compras_indisponivel' }

  return api.definirLimite({ aprovadores, cents })
}

export async function aprovarPedido(pedidoId: string): Promise<{ error: string } | { aprovada: true }> {
  const api = bridgeLimite()

  if (!api) return { error: 'compras_indisponivel' }

  return api.aprovar({ pedido_id: pedidoId })
}

/** Valor em reais para a tela. `null` não é zero — é ausência de limite. */
export function limiteLabel(cents: null | number): string {
  if (cents === null) return 'sem limite'

  return (cents / 100).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })
}

/** As recusas da aprovação, em linguagem que diz o que fazer. */
export const APROVACAO_ERRO: Record<string, string> = {
  mesmo_solicitante: 'Quem pediu não pode aprovar o próprio pedido. Peça a outra pessoa.',
  nao_e_aprovador: 'Você não está na lista de aprovadores deste limite.',
  compra_nao_precisa: 'Este pedido está abaixo do limite — não precisa de aprovação.',
  pedido_ja_recebido: 'Este pedido já foi recebido; aprovação é para antes do recebimento.',
  pedido_inexistente: 'Pedido não encontrado.',
  aprovador_obrigatorio: 'Não foi possível identificar quem aprova.'
}
// ─── Solicitação de compra (r43 do GOAL V2) ──────────────────────────────────────────────────────
//
// Etapa 1 do §26. O canal e o store existem desde a r41/r42; sem estas funções, a fila de solicitações
// existiria apenas para quem abrisse o JSON no disco.

export const SOLICITACAO_STATUS = ['aberta', 'atendida', 'cancelada'] as const

export type SolicitacaoStatus = (typeof SOLICITACAO_STATUS)[number]

export interface SolicitacaoRow {
  created_at: number
  id: string
  motivo: string
  product_sku: string
  quantity_milli: number
  solicitante: string
  status: SolicitacaoStatus
  tenant_id: string
  updated_at: number
}

interface SolicitacaoBridge {
  atenderSolicitacao: (payload: Record<string, unknown>) => Promise<{ error: string } | { pedido: unknown; solicitacoes: SolicitacaoRow[] }>
  solicitar: (payload: Record<string, unknown>) => Promise<{ error: string } | { solicitacao: SolicitacaoRow; solicitacoes: SolicitacaoRow[] }>
  solicitacaoStatus: (payload: Record<string, unknown>) => Promise<{ error: string } | { solicitacao: SolicitacaoRow; solicitacoes: SolicitacaoRow[] }>
  solicitacoes: (tenantId?: string) => Promise<{ solicitacoes: SolicitacaoRow[] }>
}

function bridgeSolicitacao(): SolicitacaoBridge | null {
  return (globalThis as { hermesDesktop?: { purchases?: SolicitacaoBridge } }).hermesDesktop?.purchases ?? null
}

export async function listarSolicitacoes(): Promise<SolicitacaoRow[]> {
  const api = bridgeSolicitacao()

  if (!api) return []

  const r = await api.solicitacoes()

  return Array.isArray(r?.solicitacoes) ? r.solicitacoes : []
}

export async function criarSolicitacao(payload: {
  motivo: string
  productSku: string
  quantityMilli: number
}): Promise<{ error: string } | { solicitacoes: SolicitacaoRow[] }> {
  const api = bridgeSolicitacao()

  if (!api) return { error: 'compras_indisponivel' }

  // O `solicitante` NÃO vai no payload: o processo principal o resolve de `actorOf`. Mandá-lo daqui
  // seria oferecer ao renderer a chance de pedir em nome de outra pessoa.
  const r = await api.solicitar({
    motivo: payload.motivo,
    product_sku: payload.productSku,
    quantity_milli: payload.quantityMilli
  })

  return 'error' in r ? r : { solicitacoes: r.solicitacoes }
}

export async function mudarSolicitacao(id: string, status: SolicitacaoStatus): Promise<{ error: string } | { solicitacoes: SolicitacaoRow[] }> {
  const api = bridgeSolicitacao()

  if (!api) return { error: 'compras_indisponivel' }

  const r = await api.solicitacaoStatus({ id, status })

  return 'error' in r ? r : { solicitacoes: r.solicitacoes }
}

/** As que ainda precisam de ação. Cancelada e atendida não aparecem na fila. */
export function solicitacoesAbertas(lista: readonly SolicitacaoRow[]): SolicitacaoRow[] {
  return lista.filter(s => s.status === 'aberta')
}

/** As recusas, em linguagem que diz o que fazer. */
export const SOLICITACAO_ERRO: Record<string, string> = {
  ja_atendida: 'Esta solicitação já virou compra — reabrir faria a mesma necessidade pedir duas vezes.',
  ja_cancelada: 'Esta solicitação foi cancelada. Reabrir apagaria o cancelamento.',
  motivo_obrigatorio: 'Escreva por que a compra é necessária.',
  quantidade_invalida: 'Informe uma quantidade maior que zero.',
  sku_obrigatorio: 'Escolha o produto.',
  solicitacao_inexistente: 'Solicitação não encontrada.',
  status_invalido: 'Status desconhecido.'
}

export function solicitacaoErroText(codigo: string): string {
  return SOLICITACAO_ERRO[codigo] ?? codigo
}
/**
 * Atende uma solicitação criando o pedido que a cumpre (r44 do GOAL V2).
 *
 * O fornecedor é obrigatório porque `normalizePurchase` o exige — e é a **cotação** que o descobre. A
 * solicitação **inicia** o pedido; ela não o aprova. O pedido nasce em `rascunho`, e o limite (r26)
 * continua valendo na passagem para `recebido`.
 */
export async function atenderSolicitacao(
  id: string,
  supplierId: string
): Promise<{ error: string } | { solicitacoes: SolicitacaoRow[] }> {
  const api = bridgeSolicitacao()

  if (!api) return { error: 'compras_indisponivel' }

  const r = await api.atenderSolicitacao({ id, supplier_id: supplierId })

  return 'error' in r ? r : { solicitacoes: r.solicitacoes }
}

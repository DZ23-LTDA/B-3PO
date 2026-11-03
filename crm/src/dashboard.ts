/**
 * Indicadores do CRM (GOAL §14.6).
 *
 * Regra que este módulo existe para garantir: **número na tela só sai de dado real**. Se não há dado,
 * o indicador vem com `null` e um texto de orientação — nunca zero disfarçado de resultado nem número
 * de exemplo.
 *
 * Definições que o código fixa (e os testes provam):
 *
 * - **novos leads**: contatos criados na janela pedida;
 * - **conversas abertas**: status `open` ou `waiting` (resolvida não conta como aberta);
 * - **tempo de resposta**: média entre a mensagem do cliente e a primeira resposta da operação
 *   *depois* dela — conversa sem resposta entra como pendente, não como zero;
 * - **taxa de resposta**: proporção de conversas com mensagem do cliente que já foram respondidas;
 * - **oportunidades / vendas / conversão**: vêm dos negócios (`Deal`), com valor em centavos para não
 *   perder precisão; "ganho" só conta quando a etapa é a final do funil marcada como ganha;
 * - **tarefas pendentes**: informadas pelo chamador (o módulo de tarefas não existe ainda, então o
 *   número é `null` e a tela mostra que não há fonte — não inventa).
 */

import type { Conversation } from './inbox'
import { waitingMs } from './inbox'

export interface DashboardDeal {
  id: string
  stageId: string
  valueCents: number
  createdAt: number
  wonAt?: number | null
}

export interface DashboardStage {
  id: string
  name: string
  order: number
  /** Etapa final de ganho. Sem ela, não há como saber o que é venda. */
  won?: boolean
}

export interface DashboardInput {
  conversations: readonly Conversation[]
  deals: readonly DashboardDeal[]
  stages: readonly DashboardStage[]
  contactsCreatedAt: readonly number[]
  now: number
  /** Janela de análise em dias (7 por padrão). */
  windowDays?: number
  /** Quantas tarefas estão abertas — só quando existir fonte real. */
  pendingTasks?: number | null
}

export interface Metric<T> {
  value: T | null
  /** Texto curto para a tela quando não há fonte de dado. */
  emptyReason: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function metric<T>(value: T | null, emptyReason: string | null = null): Metric<T> {
  return { value, emptyReason }
}

function responded(conversation: Conversation): boolean {
  const lastInboundAt = [...conversation.messages].reverse().find(m => m.direction === 'in')?.at ?? null

  if (lastInboundAt === null) {
    return false
  }

  return conversation.messages.some(m => m.direction === 'out' && m.at > lastInboundAt)
}

/** Milissegundos entre cada mensagem do cliente e a primeira resposta depois dela. */
export function responseSamples(conversations: readonly Conversation[]): number[] {
  const samples: number[] = []

  for (const conversation of conversations) {
    const inboundAt = conversation.messages.filter(m => m.direction === 'in').map(m => m.at)
    const outboundAt = conversation.messages.filter(m => m.direction === 'out').map(m => m.at)

    for (const arrival of inboundAt) {
      const firstReply = outboundAt.find(reply => reply > arrival)

      if (firstReply !== undefined) {
        samples.push(firstReply - arrival)
      }
    }
  }

  return samples
}

export interface DashboardMetrics {
  windowDays: number
  newLeads: Metric<number>
  openConversations: Metric<number>
  unreadConversations: Metric<number>
  averageResponseMs: Metric<number>
  responseRate: Metric<number>
  waitingConversations: Metric<number>
  longestWaitMs: Metric<number>
  opportunities: Metric<number>
  openPipelineCents: Metric<number>
  sales: Metric<number>
  revenueCents: Metric<number>
  conversionRate: Metric<number>
  pendingTasks: Metric<number>
  /** `true` quando não há nenhum dado — a tela mostra orientação de configuração. */
  isEmpty: boolean
}

export function dashboardMetrics(input: DashboardInput): DashboardMetrics {
  const windowDays = input.windowDays ?? 7
  const since = input.now - windowDays * DAY_MS
  const conversations = input.conversations

  const newLeads = input.contactsCreatedAt.filter(at => at >= since).length
  const open = conversations.filter(c => c.status !== 'resolved')
  const unread = open.filter(c => {
    const lastInbound = [...c.messages].reverse().find(m => m.direction === 'in')

    return lastInbound ? c.readAt === null || lastInbound.at > c.readAt : false
  })

  const waits = open.map(c => waitingMs(c, input.now)).filter(ms => ms > 0)
  const samples = responseSamples(conversations)
  const withInbound = conversations.filter(c => c.messages.some(m => m.direction === 'in'))
  const answered = conversations.filter(c => c.messages.some(m => m.direction === 'in') && responded(c))

  const wonStageIds = new Set(input.stages.filter(stage => stage.won).map(stage => stage.id))
  const closedDeals = input.deals.filter(deal => wonStageIds.has(deal.stageId))
  const wonInWindow = closedDeals.filter(deal => (deal.wonAt ?? 0) >= since)
  const openDeals = input.deals.filter(deal => !wonStageIds.has(deal.stageId))

  const conversions =
    withInbound.length > 0 && wonInWindow.length > 0 ? wonInWindow.length / withInbound.length : null

  const empty =
    conversations.length === 0 &&
    input.deals.length === 0 &&
    input.contactsCreatedAt.length === 0

  return {
    windowDays,
    newLeads: metric(newLeads),
    openConversations: metric(open.length),
    unreadConversations: metric(unread.length),
    averageResponseMs:
      samples.length > 0
        ? metric(Math.round(samples.reduce((sum, ms) => sum + ms, 0) / samples.length))
        : metric<number>(null, 'ainda não houve resposta a cliente para medir'),
    responseRate:
      withInbound.length > 0
        ? metric(answered.length / withInbound.length)
        : metric<number>(null, 'nenhuma conversa com mensagem de cliente'),
    waitingConversations: metric(waits.length),
    longestWaitMs: waits.length > 0 ? metric(Math.max(...waits)) : metric(0),
    opportunities: metric(openDeals.length),
    openPipelineCents: metric(openDeals.reduce((sum, deal) => sum + deal.valueCents, 0)),
    sales: metric(wonInWindow.length),
    revenueCents: metric(wonInWindow.reduce((sum, deal) => sum + deal.valueCents, 0)),
    conversionRate:
      conversions === null
        ? metric<number>(null, 'sem vendas na janela para calcular conversão')
        : metric(conversions),
    pendingTasks:
      input.pendingTasks === null || input.pendingTasks === undefined
        ? metric<number>(null, 'módulo de tarefas ainda não conectado')
        : metric(input.pendingTasks),
    isEmpty: empty
  }
}

/** Formatação para a tela — sem `toLocaleString` dependente de locale do aparelho. */
export function formatDuration(ms: number | null): string {
  if (ms === null) {
    return '—'
  }

  if (ms < 60_000) {
    return `${Math.max(1, Math.round(ms / 1000))} s`
  }

  const minutes = Math.round(ms / 60_000)

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function formatMoney(cents: number | null): string {
  if (cents === null) {
    return '—'
  }

  const reais = Math.floor(cents / 100)
  const centavos = String(Math.abs(cents % 100)).padStart(2, '0')
  const digits = String(reais)
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `R$ ${grouped},${centavos}`
}

export function formatPercent(ratio: number | null): string {
  if (ratio === null) {
    return '—'
  }

  return `${Math.round(ratio * 100)}%`
}

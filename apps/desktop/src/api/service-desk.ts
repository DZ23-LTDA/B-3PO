/**
 * Atendimento no renderer.
 *
 * Os campos derivados (`atrasado`, `sla_minutos`, `precisa_revisao`) vêm calculados do backend.
 * A tela não recalcula: dois lugares calculando o mesmo SLA dão números diferentes na mesma sessão.
 */

export interface TicketRow {
  assignee: string
  atrasado: boolean
  channel: string
  closed_at: null | number
  id: string
  number: number
  opened_at: number
  precisa_revisao: boolean
  priority: string
  satisfacao: null | number
  satisfaction: null | number
  sla_due_at: number
  sla_minutos: number
  status: string
  subject: string
}

export interface DeskIndicatorsRow {
  atrasados: number
  abertos: number
  satisfacaoMedia: null | number
}

interface DeskBridge {
  indicators: () => Promise<DeskIndicatorsRow>
  open: (payload: Record<string, unknown>) => Promise<{ error: string } | { tickets: TicketRow[] }>
  rate: (id: string, satisfaction: number) => Promise<{ error: string } | { review: boolean }>
  setStatus: (id: string, status: string) => Promise<{ error: string } | { tickets: TicketRow[] }>
  tickets: () => Promise<{ tickets: TicketRow[] }>
}

function bridge(): DeskBridge | null {
  const host = (globalThis as { hermesDesktop?: { desk?: DeskBridge } }).hermesDesktop

  return host?.desk ?? null
}

export function deskAvailable(): boolean {
  return bridge() !== null
}

export async function listTickets(): Promise<TicketRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.tickets()

  return Array.isArray(r?.tickets) ? r.tickets : []
}

export async function deskIndicators(): Promise<DeskIndicatorsRow> {
  const api = bridge()

  if (!api) return { atrasados: 0, abertos: 0, satisfacaoMedia: null }

  return api.indicators()
}

export async function openTicket(payload: Record<string, unknown>): Promise<{ error: string } | { tickets: TicketRow[] }> {
  const api = bridge()

  if (!api) return { error: 'atendimento_indisponivel' }

  return api.open(payload)
}

export async function setTicketStatus(
  id: string,
  status: string
): Promise<{ error: string } | { tickets: TicketRow[] }> {
  const api = bridge()

  if (!api) return { error: 'atendimento_indisponivel' }

  return api.setStatus(id, status)
}

export async function rateTicket(
  id: string,
  satisfaction: number
): Promise<{ error: string } | { review: boolean }> {
  const api = bridge()

  if (!api) return { error: 'atendimento_indisponivel' }

  return api.rate(id, satisfaction)
}

export const TICKET_STATUS_LABELS: Record<string, string> = {
  aberto: 'aberto',
  aguardando: 'aguardando',
  em_andamento: 'em andamento',
  fechado: 'fechado',
  resolvido: 'resolvido'
}

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  alta: 'alta',
  baixa: 'baixa',
  media: 'média',
  urgente: 'urgente'
}

/** Texto curto de SLA: "3h 20min restantes" ou "atrasado 1h". */
export function slaLabel(minutos: number, restante: string, atrasado: string): string {
  const total = Math.abs(Math.round(minutos))
  const horas = Math.floor(total / 60)
  const mins = total % 60
  const duracao = horas ? `${horas}h${mins ? ` ${mins}min` : ''}` : `${mins}min`

  return minutos < 0 ? `${atrasado} ${duracao}` : `${duracao} ${restante}`
}

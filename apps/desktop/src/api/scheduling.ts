/**
 * Agenda no renderer.
 *
 * O conflito é decidido no processo principal. Esta camada só formata horário e monta o payload —
 * `date` e `time` locais viram ms na hora de enviar, e nenhuma checagem de disponibilidade acontece aqui.
 */

export interface AppointmentRow {
  contact_phone: string
  created_at: number
  ends_at: number
  id: string
  notes: string
  ref: string
  resource_id: string
  service: string
  starts_at: number
  status: string
  tenant_id: string
  updated_at: number
}

interface SchedulingBridge {
  book: (payload: Record<string, unknown>) => Promise<
    { error: string; conflict?: AppointmentRow } | { appointment: AppointmentRow; appointments: AppointmentRow[] }
  >
  cancel: (id: string, tenantId?: string, reason?: string) => Promise<{ error: string } | { appointments: AppointmentRow[] }>
  confirm: (id: string, tenantId?: string) => Promise<{ error: string } | { appointments: AppointmentRow[] }>
  day: (tenantId: string | undefined, from: number, to: number, resourceId?: string) => Promise<{ appointments: AppointmentRow[] }>
  list: (tenantId?: string) => Promise<{ appointments: AppointmentRow[] }>
}

function bridge(): SchedulingBridge | null {
  const host = (globalThis as { hermesDesktop?: { scheduling?: SchedulingBridge } }).hermesDesktop

  return host?.scheduling ?? null
}

export function schedulingAvailable(): boolean {
  return bridge() !== null
}

export async function listAppointments(tenantId?: string): Promise<AppointmentRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.list(tenantId)

  return Array.isArray(r?.appointments) ? r.appointments : []
}

export async function bookAppointment(
  payload: Record<string, unknown>
): Promise<{ error: string; conflict?: AppointmentRow } | { appointments: AppointmentRow[] }> {
  const api = bridge()

  if (!api) return { error: 'agenda_indisponivel' }

  const r = await api.book(payload)

  return 'error' in r ? { conflict: r.conflict, error: r.error } : { appointments: r.appointments }
}

export async function cancelAppointment(id: string, reason?: string): Promise<{ error: string } | { appointments: AppointmentRow[] }> {
  const api = bridge()

  if (!api) return { error: 'agenda_indisponivel' }

  return api.cancel(id, undefined, reason)
}

export async function confirmAppointment(id: string): Promise<{ error: string } | { appointments: AppointmentRow[] }> {
  const api = bridge()

  if (!api) return { error: 'agenda_indisponivel' }

  return api.confirm(id)
}

/** Hora local de um instante: "09:00". */
export function timeLabel(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'

  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Data curta: "04/11/2026". */
export function dateLabel(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'

  return new Date(ms).toLocaleDateString('pt-BR')
}

/**
 * `date` + `time` de inputs locais para ms.
 *
 * Sem horário de verão no Brasil hoje, mas a montagem é por componentes locais de propósito: somar
 * milissegundos a meia-noite UTC erraria o dia em qualquer fuso a oeste.
 */
export function instantFrom(date: string, time: string): number {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim())
  const t = /^(\d{2}):(\d{2})$/.exec(time.trim())

  if (!d || !t) return 0

  const ms = new Date(
    Number(d[1]),
    Number(d[2]) - 1,
    Number(d[3]),
    Number(t[1]),
    Number(t[2]),
    0,
    0
  ).getTime()

  return Number.isFinite(ms) ? ms : 0
}

/** Soma minutos a um instante, para calcular o fim a partir da duração. */
export function plusMinutes(ms: number, minutes: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0

  return ms + Math.max(1, Math.round(minutes)) * 60_000
}

/** Início e fim do dia local que contém o instante. */
export function dayBounds(ms: number): { end: number; start: number } {
  const base = Number.isFinite(ms) && ms > 0 ? new Date(ms) : new Date()
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0).getTime()

  return { end: start + 86_400_000, start }
}

/**
 * Agenda exigindo o catálogo de serviços.
 *
 * Usa o canal `bookFromCatalog`: o nome do serviço é resolvido contra o catálogo e o **fim do
 * horário é derivado da duração real**, não digitado. O canal antigo (`book`) aceita um `ends_at`
 * arbitrário e continua existindo para os agendamentos já gravados.
 */
export async function bookAppointmentFromCatalog(
  payload: Record<string, unknown>
): Promise<{ error: string; conflict?: AppointmentRow } | { appointments: AppointmentRow[] }> {
  const api = bridge() as null | {
    bookFromCatalog?: (p: Record<string, unknown>) => Promise<{ error: string; conflict?: AppointmentRow } | { appointments: AppointmentRow[] }>
  }

  if (!api) return { error: 'agenda_indisponivel' }

  if (typeof api.bookFromCatalog !== 'function') {
    // Runtime antigo: a tela precisa saber, e nao cair no canal que aceita texto livre sem avisar.
    return { error: 'catalogo_indisponivel' }
  }

  const r = await api.bookFromCatalog(payload)

  return 'error' in r ? { conflict: r.conflict, error: r.error } : { appointments: r.appointments }
}
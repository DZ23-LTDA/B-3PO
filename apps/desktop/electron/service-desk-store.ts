// Atendimento e SLA: tickets de suporte.
//
// Fecha o ciclo comercial: venda → entrega → suporte → pós-venda. Sem ele, uma reclamação de cliente
// não tem onde existir, e "identificar insatisfação" (o que o GOAL pede dos agentes) não tem sinal
// para ler.
//
// Três decisões que dão forma a este arquivo:
//
// 1. **O prazo do SLA é derivado da prioridade**, nunca digitado. Prazo informado por quem abre o
//    ticket é prazo que ninguém cumpre.
// 2. **Atraso é derivado do relógio**, não um campo. Guardar "está atrasado" no disco cria um dado
//    que envelhece errado: hoje não atrasado, amanhã atrasado, e ninguém atualizou o arquivo.
// 3. **Insatisfação escala para humano.** Satisfação ≤ 2 não fecha o ticket em silêncio: marca para
//    revisão. Um agente que "resolve" reclamação ruim sozinho é como uma empresa perde o cliente e
//    não fica sabendo.

import { WriteQueue } from './write-queue'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'

export const TICKET_STATUSES = ['aberto', 'em_andamento', 'aguardando', 'resolvido', 'fechado'] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_PRIORITIES = ['baixa', 'media', 'alta', 'urgente'] as const

export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

/** Horas de SLA por prioridade. Tabela, não heurística: prazo precisa ser o mesmo para todos. */
export const SLA_HOURS: Record<TicketPriority, number> = {
  alta: 8,
  baixa: 72,
  media: 24,
  urgente: 4
}

/** Status em que o ticket ainda consome SLA. */
export const ABERTO_STATUSES: readonly TicketStatus[] = ['aberto', 'em_andamento', 'aguardando']

export interface Ticket {
  assignee: string
  channel: string
  closed_at: null | number
  contact_phone: string
  created_at: number
  description: string
  id: string
  number: number
  opened_at: number
  priority: TicketPriority
  /** Derivado de `opened_at` + `SLA_HOURS[priority]`. Não aceito do chamador. */
  sla_due_at: number
  status: TicketStatus
  subject: string
  /** 1 a 5, só depois de resolvido. `null` = sem avaliação. */
  satisfaction: null | number
  tenant_id: string
  updated_at: number
}

export interface ServiceDeskFile {
  schema_version: 1
  tickets: Ticket[]
}

function empty(): ServiceDeskFile {
  return { schema_version: 1, tickets: [] }
}

export function serviceDeskStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'service-desk.json')
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function dueAtFor(openedAt: number, priority: TicketPriority): number {
  return openedAt + SLA_HOURS[priority] * 3_600_000
}

export function normalizeTicket(
  input: unknown,
  now: number,
  nextNumber: number
): { error: string } | { ticket: Ticket } {
  const raw = (input ?? {}) as Record<string, unknown>
  const subject = texto(raw['subject'])

  if (!subject) {
    return { error: 'subject_required' }
  }

  const priority = TICKET_PRIORITIES.includes(raw['priority'] as TicketPriority) ? (raw['priority'] as TicketPriority) : 'media'
  const status = TICKET_STATUSES.includes(raw['status'] as TicketStatus) ? (raw['status'] as TicketStatus) : 'aberto'
  const openedAt = typeof raw['opened_at'] === 'number' ? raw['opened_at'] : now

  return {
    ticket: {
      assignee: texto(raw['assignee']),
      channel: texto(raw['channel']) || 'manual',
      closed_at: typeof raw['closed_at'] === 'number' ? raw['closed_at'] : null,
      contact_phone: texto(raw['contact_phone']),
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      description: texto(raw['description']),
      id: texto(raw['id']) || `tk_${now}_${Math.random().toString(36).slice(2, 8)}`,
      number: typeof raw['number'] === 'number' && raw['number'] > 0 ? raw['number'] : nextNumber,
      opened_at: openedAt,
      priority,
      // Prazo SEMPRE derivado: um `sla_due_at` informado seria um compromisso que ninguém combinou.
      sla_due_at: dueAtFor(openedAt, priority),
      status,
      subject,
      satisfaction: null,
      tenant_id: texto(raw['tenant_id']) || DEFAULT_TENANT,
      updated_at: now
    }
  }
}

export function parseServiceDesk(raw: string): ServiceDeskFile {
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceDeskFile>

    if (!parsed || !Array.isArray(parsed.tickets)) {
      return empty()
    }

    return {
      schema_version: 1,
      tickets: parsed.tickets.filter(t => t && typeof t.id === 'string' && typeof t.subject === 'string')
    }
  } catch {
    return empty()
  }
}

/** Atrasado agora? Derivado do relógio, não de um campo gravado. */
export function isOverdue(ticket: Ticket, now: number): boolean {
  return ABERTO_STATUSES.includes(ticket.status) && now > ticket.sla_due_at
}

/** Minutos restantes de SLA. Negativo = atrasado há quantos minutos. */
export function slaRemainingMinutes(ticket: Ticket, now: number): number {
  return Math.round((ticket.sla_due_at - now) / 60_000)
}

export function ticketsFor(tickets: readonly Ticket[], tenantId: string = DEFAULT_TENANT): Ticket[] {
  return [...tickets]
    .filter(t => t.tenant_id === tenantId)
    .sort((a, b) => {
      // Mais urgente primeiro, depois mais antigo: e a ordem em que se atende uma fila.
      const peso = { alta: 2, baixa: 0, media: 1, urgente: 3 }

      return peso[b.priority] - peso[a.priority] || a.opened_at - b.opened_at
    })
}

export interface DeskIndicators {
  atrasados: number
  abertos: number
  /** Média de satisfação das avaliações existentes. `null` quando ninguém avaliou. */
  satisfacaoMedia: null | number
}

export function indicators(tickets: readonly Ticket[], now: number, tenantId: string = DEFAULT_TENANT): DeskIndicators {
  const doTenant = tickets.filter(t => t.tenant_id === tenantId)
  const avaliacoes = doTenant.map(t => t.satisfaction).filter((s): s is number => typeof s === 'number')

  return {
    atrasados: doTenant.filter(t => isOverdue(t, now)).length,
    abertos: doTenant.filter(t => ABERTO_STATUSES.includes(t.status)).length,
    satisfacaoMedia: avaliacoes.length ? Math.round((avaliacoes.reduce((a, b) => a + b, 0) / avaliacoes.length) * 10) / 10 : null
  }
}

/**
 * Satisfação baixa pede humano.
 *
 * 1 e 2 são reclamação, não elogio. Fechar sem revisão é perder a informação mais útil do ticket.
 */
export function needsHumanReview(satisfaction: null | number): boolean {
  return satisfaction !== null && satisfaction <= 2
}

export class ServiceDeskStore {
  constructor(private readonly filePath: string) {}

  /** Fila de escrita (r238): read -> valida -> write nao era serializado. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  async list(tenantId: string = DEFAULT_TENANT): Promise<Ticket[]> {
    return ticketsFor((await this.read()).tickets, tenantId)
  }

  async open(input: unknown): Promise<{ ticket: Ticket; tickets: Ticket[] } | { error: string }> {
    return this.fila.serializar(() => this.openSerializado(input))
  }

  private async openSerializado(input: unknown): Promise<{ ticket: Ticket; tickets: Ticket[] } | { error: string }> {
    const file = await this.read()
    const nextNumber = file.tickets.reduce((maior, t) => Math.max(maior, t.number), 0) + 1
    const normalized = normalizeTicket(input, Date.now(), nextNumber)

    if ('error' in normalized) {
      return normalized
    }

    file.tickets.push(normalized.ticket)
    await this.write(file)

    return { ticket: normalized.ticket, tickets: await this.list(normalized.ticket.tenant_id) }
  }

  /** Muda status. Fechar exige que tenha sido resolvido antes. */
  async setStatus(id: string, status: TicketStatus): Promise<{ tickets: Ticket[] } | { error: string }> {
    return this.fila.serializar(() => this.setStatusSerializado(id, status))
  }

  private async setStatusSerializado(id: string, status: TicketStatus): Promise<{ tickets: Ticket[] } | { error: string }> {
    const file = await this.read()
    const indice = file.tickets.findIndex(t => t.id === id)

    if (indice < 0) {
      return { error: 'ticket_nao_encontrado' }
    }

    const atual = file.tickets[indice]!

    if (status === 'fechado' && atual.status !== 'resolvido') {
      // Fechar sem resolver esconde o problema sem resolvê-lo.
      return { error: 'fechar_exige_resolvido' }
    }

    const agora = Date.now()

    file.tickets[indice] = {
      ...atual,
      closed_at: status === 'fechado' ? (atual.closed_at ?? agora) : null,
      status,
      updated_at: agora
    }
    await this.write(file)

    return { tickets: await this.list(atual.tenant_id) }
  }

  /** Avalia. Só depois de resolvido/fechado — avaliação de ticket aberto mede expectativa, não entrega. */
  async rate(id: string, satisfaction: number): Promise<{ review: boolean; tickets: Ticket[] } | { error: string }> {
    return this.fila.serializar(() => this.rateSerializado(id, satisfaction))
  }

  private async rateSerializado(id: string, satisfaction: number): Promise<{ review: boolean; tickets: Ticket[] } | { error: string }> {
    const nota = Math.round(satisfaction)

    if (!Number.isFinite(nota) || nota < 1 || nota > 5) {
      return { error: 'nota_invalida' }
    }

    const file = await this.read()
    const indice = file.tickets.findIndex(t => t.id === id)

    if (indice < 0) {
      return { error: 'ticket_nao_encontrado' }
    }

    const atual = file.tickets[indice]!

    if (atual.status !== 'resolvido' && atual.status !== 'fechado') {
      return { error: 'avaliar_exige_resolvido' }
    }

    file.tickets[indice] = { ...atual, satisfaction: nota, updated_at: Date.now() }
    await this.write(file)

    return { review: needsHumanReview(nota), tickets: await this.list(atual.tenant_id) }
  }

  private async read(): Promise<ServiceDeskFile> {
    try {
      return parseServiceDesk(await readFile(this.filePath, 'utf8'))
    } catch {
      return empty()
    }
  }

  private async write(file: ServiceDeskFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}

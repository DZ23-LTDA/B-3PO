import { backupRotativo } from './store-backup'
// Agenda: recursos (profissional, sala, equipamento) e compromissos.
//
// A regra que dá sentido ao domínio é o **conflito**: dois compromissos do mesmo recurso não podem
// ocupar o mesmo instante. Sem isso a agenda é só uma lista de datas.
//
// Duas sutilezas que costumam ser implementadas errado:
//
// 1. Encaixe perfeito não é conflito. 10:00–11:00 e 11:00–12:00 no mesmo recurso são válidos: o
//    primeiro termina quando o segundo começa. Comparar com `>=` em vez de `>` proibiria metade dos
//    atendimentos de uma barbearia.
// 2. Status terminal libera o horário. Cancelado ou falta não ocupam a agenda — senão o horário fica
//    preso para sempre e o recurso parece lotado sem estar.
//
// Intervalo é [starts_at, ends_at): inclui o início, exclui o fim. É o que torna a regra 1 coerente.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'

export const APPOINTMENT_STATUSES = ['marcado', 'confirmado', 'concluido', 'cancelado', 'faltou'] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

/** Status que ainda ocupam o horário. */
const BLOQUEIA: readonly AppointmentStatus[] = ['marcado', 'confirmado', 'concluido']

export interface Appointment {
  contact_phone: string
  created_at: number
  /** Fim em ms. Exclusivo: um compromisso que começa exatamente aqui não conflita. */
  ends_at: number
  id: string
  notes: string
  /** Chave de idempotência do emissor (ex.: `pedido:<id>`). Vazio = sem deduplicação. */
  ref: string
  /** Recurso que ocupa o horário: profissional, sala ou equipamento. */
  resource_id: string
  service: string
  /** Início em ms. */
  starts_at: number
  status: AppointmentStatus
  tenant_id: string
  updated_at: number
}

export interface SchedulingFile {
  appointments: Appointment[]
  schema_version: 1
}

function emptyScheduling(): SchedulingFile {
  return { appointments: [], schema_version: 1 }
}

export function schedulingStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'scheduling.json')
}

export function isStatus(value: unknown): value is AppointmentStatus {
  return typeof value === 'string' && (APPOINTMENT_STATUSES as readonly string[]).includes(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function blocks(status: AppointmentStatus): boolean {
  return BLOQUEIA.includes(status)
}

/**
 * Dois intervalos [início, fim) se sobrepõem?
 *
 * Encaixe perfeito (`a.ends_at === b.starts_at`) NÃO sobrepõe, por isso `>` estrito dos dois lados.
 */
export function overlaps(
  a: { ends_at: number; starts_at: number },
  b: { ends_at: number; starts_at: number }
): boolean {
  return a.starts_at < b.ends_at && b.starts_at < a.ends_at
}

/** O compromisso que impede este de existir, ou null. `ignorarId` permite reagendar o mesmo. */
export function conflictFor(
  appointments: readonly Appointment[],
  candidate: { ends_at: number; id?: string; resource_id: string; starts_at: number; tenant_id: string },
  ignorarId = ''
): Appointment | null {
  for (const appointment of appointments) {
    if (appointment.tenant_id !== candidate.tenant_id) continue
    if (appointment.resource_id !== candidate.resource_id) continue
    if (!blocks(appointment.status)) continue
    if (appointment.id === ignorarId || (candidate.id && appointment.id === candidate.id)) continue

    if (overlaps(appointment, candidate)) {
      return appointment
    }
  }

  return null
}

/** Compromissos que bloqueiam um dia, ordenados por horário. */
export function dayOf(
  appointments: readonly Appointment[],
  tenantId: string,
  dayStart: number,
  dayEnd: number,
  resourceId?: string
): Appointment[] {
  return appointments
    .filter(
      appointment =>
        appointment.tenant_id === tenantId &&
        blocks(appointment.status) &&
        appointment.starts_at < dayEnd &&
        appointment.ends_at > dayStart &&
        (resourceId ? appointment.resource_id === resourceId : true)
    )
    .sort((a, b) => a.starts_at - b.starts_at)
}

export function normalizeAppointment(input: unknown, now: number): { error: string } | { appointment: Appointment } {
  const raw = (input ?? {}) as Record<string, unknown>
  const resource = text(raw['resource_id'])
  const starts = Number(raw['starts_at'])
  const ends = Number(raw['ends_at'])

  if (!resource) {
    return { error: 'resource_required' }
  }

  if (!Number.isFinite(starts) || starts <= 0) {
    return { error: 'starts_at_required' }
  }

  if (!Number.isFinite(ends) || ends <= starts) {
    return { error: 'periodo_invalido' }
  }

  const status = raw['status']

  if (status !== undefined && status !== null && text(status) !== '' && !isStatus(status)) {
    return { error: 'status_invalid' }
  }

  return {
    appointment: {
      contact_phone: text(raw['contact_phone']),
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      ends_at: Math.round(ends),
      id: text(raw['id']) || `appt_${now}_${Math.random().toString(36).slice(2, 8)}`,
      notes: text(raw['notes']),
      ref: text(raw['ref']),
      resource_id: resource,
      service: text(raw['service']),
      starts_at: Math.round(starts),
      status: isStatus(status) ? status : 'marcado',
      tenant_id: text(raw['tenant_id']) || DEFAULT_TENANT,
      updated_at: now
    }
  }
}

export function parseScheduling(raw: string): SchedulingFile {
  try {
    const parsed = JSON.parse(raw) as Partial<SchedulingFile>

    if (!parsed || !Array.isArray(parsed.appointments)) {
      return emptyScheduling()
    }

    return {
      appointments: parsed.appointments.filter(
        entry =>
          !!entry &&
          typeof entry.id === 'string' &&
          typeof entry.tenant_id === 'string' &&
          typeof entry.resource_id === 'string' &&
          typeof entry.starts_at === 'number' &&
          typeof entry.ends_at === 'number' &&
          isStatus((entry as Appointment).status)
      ),
      schema_version: 1
    }
  } catch {
    return emptyScheduling()
  }
}

export class SchedulingStore {
  constructor(private readonly filePath: string) {}

  async list(tenantId: string = DEFAULT_TENANT): Promise<Appointment[]> {
    const file = await this.read()

    return file.appointments
      .filter(appointment => appointment.tenant_id === tenantId)
      .sort((a, b) => a.starts_at - b.starts_at)
  }

  async day(tenantId: string, dayStart: number, dayEnd: number, resourceId?: string): Promise<Appointment[]> {
    return dayOf(await this.read().then(file => file.appointments), tenantId, dayStart, dayEnd, resourceId)
  }

  /** Marca um compromisso. Conflito de agenda é recusado com o compromisso que ocupa o horário. */
  async book(
    input: unknown
  ): Promise<{ conflict: Appointment; error: 'conflito_de_agenda' } | { error: string } | { appointment: Appointment; appointments: Appointment[] }> {
    const normalized = normalizeAppointment(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const appointment = normalized.appointment
    const anterior = file.appointments.find(item => item.id === appointment.id)

    if (anterior && (anterior.status === 'concluido')) {
      return { error: 'compromisso_concluido_imutavel' }
    }

    if (appointment.ref && file.appointments.some(item => item.tenant_id === appointment.tenant_id && item.ref === appointment.ref)) {
      return { error: 'ref_duplicado' }
    }

    // Um compromisso cancelado não ocupa nada; só os que bloqueiam entram na checagem.
    if (blocks(appointment.status)) {
      const conflito = conflictFor(file.appointments, appointment)

      if (conflito) {
        return { conflict: conflito, error: 'conflito_de_agenda' }
      }
    }

    const indice = file.appointments.findIndex(item => item.id === appointment.id)

    if (indice >= 0) {
      file.appointments[indice] = { ...appointment, created_at: file.appointments[indice]!.created_at }
    } else {
      file.appointments.push(appointment)
    }

    await this.write(file)

    return { appointment, appointments: await this.list(appointment.tenant_id) }
  }

  async cancel(id: string, tenantId: string = DEFAULT_TENANT, reason = ''): Promise<{ error: string } | { appointments: Appointment[] }> {
    return this.setStatus(id, tenantId, 'cancelado', reason)
  }

  async confirm(id: string, tenantId: string = DEFAULT_TENANT): Promise<{ error: string } | { appointments: Appointment[] }> {
    return this.setStatus(id, tenantId, 'confirmado', '')
  }

  private async setStatus(
    id: string,
    tenantId: string,
    status: AppointmentStatus,
    reason: string
  ): Promise<{ error: string } | { appointments: Appointment[] }> {
    const file = await this.read()
    const indice = file.appointments.findIndex(item => item.id === id && item.tenant_id === tenantId)

    if (indice < 0) {
      return { error: 'compromisso_nao_encontrado' }
    }

    const anterior = file.appointments[indice]!

    if (anterior.status === 'concluido') {
      return { error: 'compromisso_concluido_imutavel' }
    }

    file.appointments[indice] = {
      ...anterior,
      notes: reason ? `${anterior.notes} | cancelado: ${reason}`.trim() : anterior.notes,
      status,
      updated_at: Date.now()
    }
    await this.write(file)

    return { appointments: await this.list(tenantId) }
  }

  private async read(): Promise<SchedulingFile> {
    try {
      return parseScheduling(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptyScheduling()
    }
  }

  private async write(file: SchedulingFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await backupRotativo(this.filePath)
    await rename(temp, this.filePath)
  }
}

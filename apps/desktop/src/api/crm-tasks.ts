/**
 * Tarefas do CRM no renderer. A verdade é do processo principal (arquivo sob `userData`); aqui se tipa a
 * chamada e se formata o prazo para a tela.
 *
 * O prazo viaja como timestamp em ms, nunca como data local: quem digitou não pode ter a tarefa vencendo em
 * outro dia só porque a máquina trocou de fuso.
 */

export const TASK_PRIORITIES = ['baixa', 'media', 'alta'] as const
export const TASK_STATUSES = ['aberta', 'concluida'] as const

export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface CrmTaskRow {
  /** Telefone do contato ligado à tarefa; vazio para tarefa solta. */
  contact_phone: string
  created_at: number
  due_at: number | null
  id: string
  notes: string
  priority: TaskPriority
  status: TaskStatus
  title: string
  updated_at: number
}

interface CrmTasksBridge {
  list: () => Promise<{ tasks: CrmTaskRow[] }>
  remove: (id: string) => Promise<{ tasks: CrmTaskRow[] }>
  upsert: (payload: Partial<CrmTaskRow>) => Promise<{ error: string } | { tasks: CrmTaskRow[] }>
}

function bridge(): CrmTasksBridge | null {
  const host = (globalThis as { hermesDesktop?: { crmTasks?: CrmTasksBridge } }).hermesDesktop

  return host?.crmTasks ?? null
}

export function tasksAvailable(): boolean {
  return bridge() !== null
}

export async function listTasks(): Promise<CrmTaskRow[]> {
  const api = bridge()

  if (!api) {
    throw new Error('unavailable')
  }

  return (await api.list()).tasks ?? []
}

export async function saveTask(
  payload: Partial<CrmTaskRow>
): Promise<{ error: string } | { tasks: CrmTaskRow[] }> {
  const api = bridge()

  if (!api) {
    return { error: 'unavailable' }
  }

  return api.upsert(payload)
}

export async function removeTask(id: string): Promise<CrmTaskRow[]> {
  const api = bridge()

  if (!api) {
    throw new Error('unavailable')
  }

  return (await api.remove(id)).tasks ?? []
}

/** `2026-11-04` → timestamp local à meia-noite; vazio → `null` (sem prazo). */
export function dueFromDateInput(value: string): number | null {
  const raw = value.trim()

  if (!raw) {
    return null
  }

  const parsed = Date.parse(`${raw}T00:00:00`)

  return Number.isFinite(parsed) ? parsed : null
}

/** Timestamp → `AAAA-MM-DD` para o `<input type="date">`, no fuso de quem está olhando. */
export function dateInputValue(dueAt: number | null): string {
  if (dueAt === null) {
    return ''
  }

  const data = new Date(dueAt)
  const mes = `${data.getMonth() + 1}`.padStart(2, '0')
  const dia = `${data.getDate()}`.padStart(2, '0')

  return `${data.getFullYear()}-${mes}-${dia}`
}

/** "vence hoje" / "atrasada há 2 dias" / data curta — sempre relativo ao `now` de quem desenha. */
export function dueLabel(dueAt: number | null, now: number, locale = 'pt-BR'): string {
  if (dueAt === null) {
    return ''
  }

  const dia = 24 * 60 * 60 * 1000
  const meiaNoite = (ms: number): number => {
    const data = new Date(ms)

    return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime()
  }
  const diferenca = Math.round((meiaNoite(dueAt) - meiaNoite(now)) / dia)

  if (diferenca === 0) {
    return 'hoje'
  }

  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dueAt)
}

/**
 * Contagem real do quadro: abertas, atrasadas (prazo no passado e ainda abertas) e concluídas.
 *
 * Existe do lado do renderer porque a tela precisa do número antes de qualquer escrita, e a mesma regra existe no
 * store do processo principal (`electron/crm-tasks-store.ts`). Duas cópias de uma regra só continuam iguais se
 * alguém cobrar: `electron/crm-tasks-store.test.ts` tem um teste que roda as duas sobre a mesma lista e compara.
 */
export function taskCounts(
  tasks: readonly CrmTaskRow[],
  now: number
): { done: number; late: number; open: number } {
  let open = 0
  let late = 0
  let done = 0

  for (const task of tasks) {
    if (task.status === 'concluida') {
      done += 1
      continue
    }

    open += 1

    if (task.due_at !== null && task.due_at < now) {
      late += 1
    }
  }

  return { done, late, open }
}

const MESSAGES: Record<string, string> = {
  priority_invalid: 'Prioridade inválida.',
  status_invalid: 'Situação inválida.',
  title_required: 'Dê um nome à tarefa.',
  unavailable: 'As tarefas precisam do aplicativo desktop para serem guardadas.'
}

export function taskErrorText(code: string): string {
  return MESSAGES[code] ?? `Não foi possível salvar a tarefa (${code}).`
}

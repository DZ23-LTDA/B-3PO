import { backupRotativo } from './store-backup'
// Tarefas do CRM no disco do usuário, dono do dado: o processo principal do Electron.
//
// Mesmo desenho dos contatos e do funil: um JSON sob `userData`, gravação atômica (`write` + `rename`). A tarefa
// pode apontar para um contato pelo telefone (o índice do CRM) ou ficar solta, porque "ligar para a Maria" e
// "revisar a proposta" são tarefas do mesmo quadro.
//
// `due_at` é timestamp em ms, nunca data local: o fuso de quem digitou não pode mudar o vencimento quando a
// máquina muda de fuso. Vazio significa "sem prazo", que é diferente de "venceu".

import { WriteQueue } from './write-queue'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const TASK_PRIORITIES = ['baixa', 'media', 'alta'] as const
export const TASK_STATUSES = ['aberta', 'concluida'] as const

export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface CrmTask {
  /** Telefone do contato ligado à tarefa; vazio para tarefa solta. */
  contact_phone: string
  created_at: number
  /** Prazo em ms. `null` = sem prazo (não é "venceu"). */
  due_at: number | null
  id: string
  notes: string
  priority: TaskPriority
  status: TaskStatus
  /** Empresa dona da tarefa. Registros antigos são lidos como `local` — ver `parseTasks`. */
  tenant_id: string
  title: string
  updated_at: number
}

export interface TasksFile {
  schema_version: 1
  tasks: CrmTask[]
}

function emptyTasks(): TasksFile {
  return { schema_version: 1, tasks: [] }
}

export function tasksStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'crm-tasks.json')
}

export function isPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value)
}

export function isStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Aceita número (ms), string ISO ou vazio. Data inválida não vira `NaN` no arquivo. */
function dueAt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const raw = text(value)

  if (!raw) {
    return null
  }

  const parsed = Date.parse(raw)

  return Number.isFinite(parsed) ? parsed : null
}

export const DEFAULT_TENANT = 'local'

export function normalizeTask(input: unknown, now: number, tenantId: string = DEFAULT_TENANT): { error: string } | { task: CrmTask } {
  const raw = (input ?? {}) as Record<string, unknown>
  const title = text(raw['title'])

  if (!title) {
    return { error: 'title_required' }
  }

  const priority = raw['priority'] ?? 'media'
  const status = raw['status'] ?? 'aberta'

  if (!isPriority(priority)) {
    return { error: 'priority_invalid' }
  }

  if (!isStatus(status)) {
    return { error: 'status_invalid' }
  }

  return {
    task: {
      contact_phone: text(raw['contact_phone']),
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      due_at: dueAt(raw['due_at']),
      id: text(raw['id']) || `task_${now}_${Math.random().toString(36).slice(2, 8)}`,
      notes: text(raw['notes']),
      priority,
      status,
      tenant_id: tenantId || DEFAULT_TENANT,
      title,
      updated_at: now
    }
  }
}

export function parseTasks(raw: string): TasksFile {
  try {
    const parsed = JSON.parse(raw) as Partial<TasksFile>

    if (!parsed || !Array.isArray(parsed.tasks)) {
      return emptyTasks()
    }

    return {
      schema_version: 1,
      // Tarefa gravada antes do tenant: lida como `local`, sem reescrever o arquivo.
      tasks: parsed.tasks
        .filter(
          entry =>
            !!entry &&
            typeof entry.id === 'string' &&
            typeof entry.title === 'string' &&
            isPriority((entry as CrmTask).priority) &&
            isStatus((entry as CrmTask).status)
        )
        .map(entry => ({ ...entry, tenant_id: (entry as CrmTask).tenant_id || DEFAULT_TENANT }))
    }
  } catch {
    return emptyTasks()
  }
}

/**
 * Ordem que o quadro mostra: abertas primeiro, depois por prazo (sem prazo ao fim), e as concluídas por último.
 * `now` entra para separar "atrasada" de "a fazer" sem depender do relógio do chamador no momento do desenho.
 */
export function sortTasks(tasks: readonly CrmTask[]): CrmTask[] {
  const peso = (task: CrmTask): number => (task.status === 'concluida' ? 1 : 0)

  return [...tasks].sort((a, b) => {
    const byStatus = peso(a) - peso(b)

    if (byStatus !== 0) {
      return byStatus
    }

    const aDue = a.due_at ?? Number.POSITIVE_INFINITY
    const bDue = b.due_at ?? Number.POSITIVE_INFINITY

    if (aDue !== bDue) {
      return aDue - bDue
    }

    return b.updated_at - a.updated_at
  })
}

/** Contagem real do quadro: abertas, atrasadas (prazo no passado e ainda abertas) e concluídas. */
export function taskCounts(tasks: readonly CrmTask[], now: number): { done: number; late: number; open: number } {
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

export class CrmTaskStore {
  constructor(private readonly filePath: string) {}

  /** Fila de escrita (r237): read -> valida -> write nao era serializado. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  async list(tenantId: string = DEFAULT_TENANT): Promise<CrmTask[]> {
    return sortTasks((await this.read()).tasks.filter(t => t.tenant_id === tenantId))
  }

  async upsert(input: unknown, tenantId: string = DEFAULT_TENANT): Promise<{ error: string } | { tasks: CrmTask[] }> {
    return this.fila.serializar(() => this.upsertSerializado(input, tenantId))
  }

  private async upsertSerializado(input: unknown, tenantId: string = DEFAULT_TENANT): Promise<{ error: string } | { tasks: CrmTask[] }> {
    const normalized = normalizeTask(input, Date.now(), tenantId)

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const task = normalized.task
    // Uma tarefa so e editavel pela empresa dona: id de outra empresa nao entra no indice.
    const index = file.tasks.findIndex(entry => entry.id === task.id && entry.tenant_id === task.tenant_id)

    if (index >= 0) {
      const anterior = file.tasks[index]!

      // `created_at` é do nascimento da tarefa, não do último toque.
      file.tasks[index] = { ...anterior, ...task, created_at: anterior.created_at }
    } else {
      file.tasks.push(task)
    }

    await this.write(file)

    return { tasks: await this.list(tenantId) }
  }

  async remove(id: string, tenantId: string = DEFAULT_TENANT): Promise<{ tasks: CrmTask[] }> {
    return this.fila.serializar(() => this.removeSerializado(id, tenantId))
  }

  private async removeSerializado(id: string, tenantId: string = DEFAULT_TENANT): Promise<{ tasks: CrmTask[] }> {
    const file = await this.read()
    file.tasks = file.tasks.filter(entry => !(entry.id === id && entry.tenant_id === tenantId))
    await this.write(file)

    return { tasks: await this.list(tenantId) }
  }

  private async read(): Promise<TasksFile> {
    try {
      return parseTasks(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptyTasks()
    }
  }

  private async write(file: TasksFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await backupRotativo(this.filePath)
    await rename(temp, this.filePath)
  }
}

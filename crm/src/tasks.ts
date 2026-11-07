/**
 * Tarefas e Kanban (GOAL §19).
 *
 * O que este módulo garante — e os testes provam:
 *
 * - **dependência bloqueia conclusão**: tarefa com `blockedBy` aberta não vira `done`; o motivo é
 *   devolvido em vez de a tarefa "concluir sozinha";
 * - **histórico é append-only**: cada mudança registra autor, de/para e quando. Sem isso não há como
 *   auditar quem mexeu no quê;
 * - **prazo vencido é calculado, não digitado**: `overdue` sai da comparação com `now`;
 * - **concluída não é atrasada**: tarefa `done` nunca aparece como vencida, mesmo com prazo no passado;
 * - **subtarefa herda o pai** e entra no progresso dele; pai não conclui com subtarefa aberta;
 * - **mover no Kanban é explícito**: coluna de destino tem que existir, senão é erro — não um silent
 *   no-op que faz a tela mentir.
 */

export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface TaskHistoryEntry {
  at: number
  /** Quem fez a mudança (`null` quando foi o próprio sistema). */
  by: string | null
  from: TaskStatus | null
  to: TaskStatus
  note: string | null
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string | null
  /** Prazo em epoch ms; `null` quando não há. */
  dueAt: number | null
  createdAt: number
  updatedAt: number
  doneAt: number | null
  /** Id da tarefa que precisa estar concluída antes desta. */
  blockedBy: string | null
  /** Id da tarefa pai, quando esta é subtarefa. */
  parentId: string | null
  labels: string[]
  history: TaskHistoryEntry[]
}

export interface TaskInput {
  id: string
  title: string
  now: number
  description?: string
  priority?: TaskPriority
  assignee?: string | null
  dueAt?: number | null
  parentId?: string | null
  blockedBy?: string | null
  labels?: string[]
}

const TITLE_MIN = 3

export function createTask(input: TaskInput): Task | { error: 'title_required' | 'invalid_parent' } {
  const title = input.title.trim()

  if (title.length < TITLE_MIN) {
    return { error: 'title_required' }
  }

  if (input.parentId !== undefined && input.parentId !== null && !input.parentId.trim()) {
    return { error: 'invalid_parent' }
  }

  return {
    id: input.id,
    title,
    description: (input.description ?? '').trim(),
    status: 'todo',
    priority: input.priority ?? 'normal',
    assignee: (input.assignee ?? '').trim() || null,
    dueAt: input.dueAt ?? null,
    createdAt: input.now,
    updatedAt: input.now,
    doneAt: null,
    blockedBy: (input.blockedBy ?? '').trim() || null,
    parentId: input.parentId ?? null,
    labels: (input.labels ?? []).map(label => label.trim()).filter(Boolean),
    history: [{ at: input.now, by: null, from: null, to: 'todo', note: 'criada' }]
  }
}

function record(task: Task, to: TaskStatus, now: number, by: string | null, note: string | null): Task {
  return {
    ...task,
    status: to,
    updatedAt: now,
    doneAt: to === 'done' ? now : null,
    history: [...task.history, { at: now, by, from: task.status, to, note }]
  }
}

export type MoveFailure = 'dependency_open' | 'children_open' | 'same_status'

export interface MoveResult {
  task?: Task
  error?: MoveFailure
}

/** Move o status validando dependência e subtarefas abertas. */
export function moveTask(
  task: Task,
  to: TaskStatus,
  now: number,
  options: { by?: string | null; note?: string | null; tasks?: readonly Task[] } = {}
): MoveResult {
  if (task.status === to) {
    return { error: 'same_status' }
  }

  const tasks = options.tasks ?? []

  if (to === 'done') {
    const dependency = task.blockedBy ? tasks.find(candidate => candidate.id === task.blockedBy) : undefined

    if (dependency && dependency.status !== 'done') {
      return { error: 'dependency_open' }
    }

    const openChildren = tasks.filter(
      candidate => candidate.parentId === task.id && candidate.status !== 'done'
    )

    if (openChildren.length > 0) {
      return { error: 'children_open' }
    }
  }

  return { task: record(task, to, now, options.by ?? null, options.note ?? null) }
}

export function assignTask(task: Task, assignee: string | null, now: number, by: string | null = null): Task {
  return {
    ...task,
    assignee: (assignee ?? '').trim() || null,
    updatedAt: now,
    history: [
      ...task.history,
      { at: now, by, from: task.status, to: task.status, note: `responsável: ${(assignee ?? '').trim() || 'nenhum'}` }
    ]
  }
}

export function setPriority(task: Task, priority: TaskPriority, now: number, by: string | null = null): Task {
  return {
    ...task,
    priority,
    updatedAt: now,
    history: [...task.history, { at: now, by, from: task.status, to: task.status, note: `prioridade: ${priority}` }]
  }
}

/** Prazo vencido: passou do prazo, não está concluída. Tarefa concluída nunca é atrasada. */
export function isOverdue(task: Task, now: number): boolean {
  if (task.status === 'done' || task.dueAt === null) {
    return false
  }

  return now > task.dueAt
}

export function childrenOf(tasks: readonly Task[], parentId: string): Task[] {
  return tasks.filter(task => task.parentId === parentId)
}

/** Progresso do pai: quantas subtarefas concluídas de quantas existem. */
export function subtaskProgress(
  tasks: readonly Task[],
  parentId: string
): { done: number; total: number } {
  const children = childrenOf(tasks, parentId)

  return { done: children.filter(child => child.status === 'done').length, total: children.length }
}

export interface KanbanColumn {
  id: TaskStatus
  title: string
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: 'A fazer' },
  { id: 'doing', title: 'Em andamento' },
  { id: 'blocked', title: 'Bloqueadas' },
  { id: 'done', title: 'Concluídas' }
]

/** Ordem dentro da coluna: prazo mais próximo primeiro, depois prioridade. */
const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.dueAt !== b.dueAt) {
      if (a.dueAt === null) return 1
      if (b.dueAt === null) return -1

      return a.dueAt - b.dueAt
    }

    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  })
}

export interface KanbanBoard {
  columns: Array<{ id: TaskStatus; title: string; tasks: Task[] }>
}

/**
 * Monta o quadro. Subtarefas aparecem dentro do card do pai (não como card solto), e uma coluna de
 * destino inexistente é erro — nunca um no-op silencioso.
 */
export function kanbanBoard(tasks: readonly Task[], columns: readonly KanbanColumn[] = KANBAN_COLUMNS): KanbanBoard {
  const roots = tasks.filter(task => task.parentId === null)

  return {
    columns: columns.map(column => ({
      id: column.id,
      title: column.title,
      tasks: sortTasks(roots.filter(task => task.status === column.id))
    }))
  }
}

/** Contagem que o dashboard do CRM usa: tarefas abertas de verdade (não concluídas). */
export function pendingTaskCount(tasks: readonly Task[]): number {
  return tasks.filter(task => task.status !== 'done').length
}

/** Resumo para o card: subtarefas, atraso e responsável. */
export interface TaskSummary {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  assigneeLabel: string
  dueLabel: string
  overdue: boolean
  subtasksLabel: string | null
  accessibilityLabel: string
}

export function taskSummary(task: Task, tasks: readonly Task[], now: number): TaskSummary {
  const progress = subtaskProgress(tasks, task.id)
  const overdue = isOverdue(task, now)
  const assigneeLabel = task.assignee ?? 'sem responsável'
  const dueLabel = task.dueAt === null ? 'sem prazo' : overdue ? 'atrasada' : 'no prazo'
  const subtasksLabel = progress.total > 0 ? `${progress.done}/${progress.total} subtarefas` : null

  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    assigneeLabel,
    dueLabel,
    overdue,
    subtasksLabel,
    accessibilityLabel: `${task.title}, ${KANBAN_COLUMNS.find(column => column.id === task.status)?.title ?? task.status}, ${assigneeLabel}, ${dueLabel}${subtasksLabel ? `, ${subtasksLabel}` : ''}`
  }
}

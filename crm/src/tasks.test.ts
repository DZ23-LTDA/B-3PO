import { describe, expect, it } from 'vitest'

import {
  assignTask,
  createTask,
  isOverdue,
  kanbanBoard,
  moveTask,
  pendingTaskCount,
  setPriority,
  sortTasks,
  subtaskProgress,
  taskSummary
} from './tasks'
import type { Task } from './tasks'

const T0 = 1_700_000_000_000
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function task(id: string, extra: Partial<Parameters<typeof createTask>[0]> = {}): Task {
  const created = createTask({ id, title: `Tarefa ${id}`, now: T0, ...extra })

  if ('error' in created) {
    throw new Error(`falha ao criar tarefa de teste: ${created.error}`)
  }

  return created
}

describe('tarefas — criação', () => {
  it('exige título com pelo menos 3 caracteres', () => {
    expect(createTask({ id: 't1', title: ' ab ', now: T0 })).toEqual({ error: 'title_required' })
  })

  it('nasce em "a fazer" e registra a criação no histórico', () => {
    const created = task('t1')

    expect(created.status).toBe('todo')
    expect(created.history).toHaveLength(1)
    expect(created.history[0]?.note).toBe('criada')
  })

  it('normaliza responsável, etiquetas e bloqueio vazios', () => {
    const created = task('t1', { assignee: '  ', labels: [' ', 'vip'], blockedBy: '  ' })

    expect(created.assignee).toBeNull()
    expect(created.blockedBy).toBeNull()
    expect(created.labels).toEqual(['vip'])
  })
})

describe('tarefas — mudança de status', () => {
  it('move para "em andamento" e guarda de/para com autor', () => {
    const moved = moveTask(task('t1'), 'doing', T0 + HOUR, { by: 'Leandro' })

    expect(moved.task?.status).toBe('doing')
    expect(moved.task?.history.at(-1)).toMatchObject({ from: 'todo', to: 'doing', by: 'Leandro' })
  })

  it('não aceita mover para o mesmo status', () => {
    expect(moveTask(task('t1'), 'todo', T0 + HOUR)).toEqual({ error: 'same_status' })
  })

  it('dependência aberta impede concluir', () => {
    const dependency = task('dep')
    const dependent = task('t1', { blockedBy: 'dep' })

    expect(moveTask(dependent, 'done', T0 + HOUR, { tasks: [dependency, dependent] })).toEqual({
      error: 'dependency_open'
    })

    const finished = moveTask(dependency, 'done', T0 + HOUR, { tasks: [dependency] })

    expect(moveTask(dependent, 'done', T0 + HOUR, { tasks: [finished.task as Task, dependent] }).task?.status).toBe(
      'done'
    )
  })

  it('pai não conclui com subtarefa aberta', () => {
    const parent = task('p')
    const child = task('c', { parentId: 'p' })

    expect(moveTask(parent, 'done', T0 + HOUR, { tasks: [parent, child] })).toEqual({ error: 'children_open' })
  })

  it('ao concluir guarda doneAt; ao reabrir, limpa', () => {
    const done = moveTask(task('t1'), 'done', T0 + HOUR).task as Task

    expect(done.doneAt).toBe(T0 + HOUR)
    expect(moveTask(done, 'doing', T0 + 2 * HOUR).task?.doneAt).toBeNull()
  })
})

describe('tarefas — prazo e atraso', () => {
  it('vencida quando passa do prazo e não está concluída', () => {
    const withDue = task('t1', { dueAt: T0 + DAY })

    expect(isOverdue(withDue, T0 + DAY - 1)).toBe(false)
    expect(isOverdue(withDue, T0 + DAY + 1)).toBe(true)
  })

  it('concluída nunca é atrasada, mesmo com prazo no passado', () => {
    const late = task('t1', { dueAt: T0 - DAY })
    const done = moveTask(late, 'done', T0).task as Task

    expect(isOverdue(done, T0 + DAY)).toBe(false)
  })

  it('tarefa sem prazo nunca atrasa', () => {
    expect(isOverdue(task('t1'), T0 + 30 * DAY)).toBe(false)
  })
})

describe('tarefas — subtarefas', () => {
  it('progresso do pai conta subtarefas concluídas', () => {
    const parent = task('p')
    const doneChild = moveTask(task('c1', { parentId: 'p' }), 'done', T0 + HOUR).task as Task
    const openChild = task('c2', { parentId: 'p' })

    expect(subtaskProgress([parent, doneChild, openChild], 'p')).toEqual({ done: 1, total: 2 })
  })

  it('subtarefa não aparece como card solto no Kanban', () => {
    const parent = task('p')
    const child = task('c', { parentId: 'p' })
    const board = kanbanBoard([parent, child])

    const allIds = board.columns.flatMap(column => column.tasks.map(item => item.id))

    expect(allIds).toEqual(['p'])
  })
})

describe('tarefas — Kanban', () => {
  it('agrupa por coluna, ordenando por prazo e depois prioridade', () => {
    const soon = task('a', { dueAt: T0 + HOUR })
    const later = task('b', { dueAt: T0 + DAY })
    const urgentNoDue = setPriority(task('c'), 'urgent', T0) // mesmo id 'c', prioridade urgente

    const board = kanbanBoard([later, soon, urgentNoDue])
    const todo = board.columns.find(column => column.id === 'todo')

    expect(todo?.tasks.map(item => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('só tarefas raiz viram card; cada coluna tem seu título', () => {
    const board = kanbanBoard([task('a'), moveTask(task('b'), 'doing', T0 + HOUR).task as Task])

    expect(board.columns.map(column => column.title)).toEqual([
      'A fazer',
      'Em andamento',
      'Bloqueadas',
      'Concluídas'
    ])
  })

  it('sortTasks: prazo mais próximo primeiro; prioridade desempata prazo igual', () => {
    const ordered = sortTasks([
      setPriority(task('x', { dueAt: T0 + DAY }), 'urgent', T0),
      task('y', { dueAt: T0 + HOUR }),
      setPriority(task('z', { dueAt: T0 + HOUR }), 'urgent', T0)
    ])

    expect(ordered.map(item => item.id)).toEqual(['z', 'y', 'x'])
  })
})

describe('tarefas — pessoas e resumo', () => {
  it('atribuir e mudar prioridade entram no histórico', () => {
    const assigned = assignTask(task('t1'), 'Ana', T0 + HOUR, 'Leandro')
    const reprioritized = setPriority(assigned, 'high', T0 + 2 * HOUR, 'Leandro')

    expect(assigned.assignee).toBe('Ana')
    expect(reprioritized.history.map(entry => entry.note)).toContain('responsável: Ana')
    expect(reprioritized.history.map(entry => entry.note)).toContain('prioridade: high')
  })

  it('contagem de pendentes ignora concluídas', () => {
    const open = task('a')
    const done = moveTask(task('b'), 'done', T0 + HOUR).task as Task

    expect(pendingTaskCount([open, done])).toBe(1)
  })

  it('resumo do card traz atraso, responsável, subtarefas e rótulo acessível', () => {
    const parent = task('p', { dueAt: T0 - DAY, assignee: 'Ana' })
    const child = task('c', { parentId: 'p' })
    const summary = taskSummary(parent, [parent, child], T0)

    expect(summary.overdue).toBe(true)
    expect(summary.dueLabel).toBe('atrasada')
    expect(summary.assigneeLabel).toBe('Ana')
    expect(summary.subtasksLabel).toBe('0/1 subtarefas')
    expect(summary.accessibilityLabel).toBe('Tarefa p, A fazer, Ana, atrasada, 0/1 subtarefas')
  })

  it('tarefa sem subtarefa não inventa rótulo de progresso', () => {
    const summary = taskSummary(task('a'), [task('a')], T0)

    expect(summary.subtasksLabel).toBeNull()
    expect(summary.accessibilityLabel).not.toContain('subtarefas')
  })
})

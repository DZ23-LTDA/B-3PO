import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  CrmTaskStore,
  isPriority,
  normalizeTask,
  parseTasks,
  sortTasks,
  taskCounts,
  tasksStorePath,
  type CrmTask
} from './crm-tasks-store'

async function withStore<T>(run: (store: CrmTaskStore, file: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-tasks-'))

  try {
    const file = tasksStorePath(dir)

    return await run(new CrmTaskStore(file), file)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const task = (over: Record<string, unknown> = {}) => ({ title: 'Ligar para a Maria', ...over })

describe('tarefas do CRM no disco', () => {
  it('exige título e rejeita prioridade ou situação inventada', () => {
    expect(normalizeTask(task({ title: '  ' }), 1)).toEqual({ error: 'title_required' })
    expect(normalizeTask(task({ priority: 'urgente' }), 1)).toEqual({ error: 'priority_invalid' })
    expect(normalizeTask(task({ status: 'arquivada' }), 1)).toEqual({ error: 'status_invalid' })
  })

  it('assume prioridade média e situação aberta quando não vem nada', () => {
    const normalizada = normalizeTask(task(), 1_700_000_000_000)

    if ('error' in normalizada) {
      throw new Error(`esperava tarefa, veio ${normalizada.error}`)
    }

    expect(normalizada.task.priority).toBe('media')
    expect(normalizada.task.status).toBe('aberta')
    expect(normalizada.task.due_at).toBeNull()
  })

  it('guarda o prazo como timestamp, aceitando data ISO ou vazio', () => {
    const comPrazo = normalizeTask(task({ due_at: '2026-11-10' }), 1)
    const semPrazo = normalizeTask(task({ due_at: '' }), 1)

    if ('error' in comPrazo || 'error' in semPrazo) {
      throw new Error('esperava tarefa válida')
    }

    expect(typeof comPrazo.task.due_at).toBe('number')
    expect(semPrazo.task.due_at).toBeNull()
  })

  it('não deixa data inválida virar NaN no arquivo', () => {
    const normalizada = normalizeTask(task({ due_at: 'ontem à tarde' }), 1)

    if ('error' in normalizada) {
      throw new Error('esperava tarefa válida')
    }

    expect(normalizada.task.due_at).toBeNull()
  })

  it('ordena abertas antes das concluídas, prazo mais próximo primeiro e sem prazo no fim', () => {
    const agora = 1_700_000_000_000
    const base = { contact_phone: '', created_at: agora, notes: '', priority: 'media' as const, updated_at: agora }
    const lista: CrmTask[] = [
      { ...base, id: 'sem_prazo', status: 'aberta', title: 'sem prazo', due_at: null },
      { ...base, id: 'depois', status: 'aberta', title: 'depois', due_at: agora + 86_400_000 },
      { ...base, id: 'antes', status: 'aberta', title: 'antes', due_at: agora + 3_600_000 },
      { ...base, id: 'feita', status: 'concluida', title: 'feita', due_at: agora - 86_400_000 }
    ]

    expect(sortTasks(lista).map(entry => entry.id)).toEqual(['antes', 'depois', 'sem_prazo', 'feita'])
  })

  it('conta atrasadas pelo relógio de agora, não por marca gravada', () => {
    const agora = 1_700_000_000_000
    const base = { contact_phone: '', created_at: agora, notes: '', priority: 'media' as const, updated_at: agora }
    const lista: CrmTask[] = [
      { ...base, id: 'a', status: 'aberta', title: 'atrasada', due_at: agora - 1000 },
      { ...base, id: 'b', status: 'aberta', title: 'no prazo', due_at: agora + 1000 },
      { ...base, id: 'c', status: 'aberta', title: 'sem prazo', due_at: null },
      { ...base, id: 'd', status: 'concluida', title: 'feita e atrasada', due_at: agora - 1000 }
    ]

    expect(taskCounts(lista, agora)).toEqual({ done: 1, late: 1, open: 3 })
  })

  it('grava, relê e remove sem perder o arquivo', async () => {
    await withStore(async (store, file) => {
      const criada = await store.upsert(task({ due_at: '2026-11-10', priority: 'alta' }))

      if ('error' in criada) {
        throw new Error(criada.error)
      }

      expect(criada.tasks).toHaveLength(1)

      const id = criada.tasks[0]!.id
      const concluida = await store.upsert({ ...criada.tasks[0], status: 'concluida' })

      if ('error' in concluida) {
        throw new Error(concluida.error)
      }

      expect(concluida.tasks[0]!.status).toBe('concluida')
      // `created_at` é do nascimento da tarefa, não do último toque.
      expect(concluida.tasks[0]!.created_at).toBe(criada.tasks[0]!.created_at)

      const doDisco = JSON.parse(await readFile(file, 'utf8')) as { tasks: CrmTask[] }

      expect(doDisco.tasks).toHaveLength(1)
      expect(doDisco.tasks[0]!.id).toBe(id)

      expect((await store.remove(id)).tasks).toEqual([])
      expect(await store.list()).toEqual([])
    })
  })

  it('não explode com arquivo corrompido e descarta entrada sem forma de tarefa', () => {
    expect(parseTasks('{isso não é json')).toEqual({ schema_version: 1, tasks: [] })
    expect(parseTasks(JSON.stringify({ tasks: [{ id: 'x' }, { id: 'y', title: 'ok', priority: 'alta', status: 'aberta' }] }))).toMatchObject({
      tasks: [{ id: 'y' }]
    })
  })

  it('reconhece prioridade válida e recusa o resto', () => {
    expect(isPriority('alta')).toBe(true)
    expect(isPriority('urgente')).toBe(false)
    expect(isPriority(3)).toBe(false)
  })

  it('sobrevive a um arquivo ausente', async () => {
    await withStore(async store => {
      expect(await store.list()).toEqual([])
    })

    const dir = await mkdtemp(join(tmpdir(), 'b3po-tasks-'))

    try {
      const file = tasksStorePath(dir)

      await writeFile(file, '', { flag: 'w' }).catch(() => undefined)
      expect(await new CrmTaskStore(file).list()).toEqual([])
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })
  it('a contagem do renderer e a do store concordam na mesma lista', async () => {
    // Duas copias da regra so continuam iguais se alguem cobrar: este teste roda as duas sobre o mesmo quadro.
    const { taskCounts: noRenderer } = await import('../src/api/crm-tasks')
    const agora = 1_700_000_000_000
    const base = { contact_phone: '', created_at: agora, notes: '', priority: 'media' as const, updated_at: agora }
    const lista: CrmTask[] = [
      { ...base, id: 'a', status: 'aberta', title: 'atrasada', due_at: agora - 1 },
      { ...base, id: 'b', status: 'aberta', title: 'no prazo', due_at: agora + 1 },
      { ...base, id: 'c', status: 'aberta', title: 'sem prazo', due_at: null },
      { ...base, id: 'd', status: 'concluida', title: 'feita', due_at: agora - 1 }
    ]

    expect(noRenderer(lista as never, agora)).toEqual(taskCounts(lista, agora))
  })
})

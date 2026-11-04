// Tarefas do CRM com tenant (rodada 81).
//
// Primeiro dos tres stores do CRM restantes a receber `tenant_id` (contatos veio na r80). O padrao e o
// mesmo: chave composta e leitura tolerante, sem migracao destrutiva.

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CrmTaskStore, DEFAULT_TENANT, parseTasks, tasksStorePath } from './crm-tasks-store'

const A = 'empresa_a'
const B = 'empresa_b'

let dir = ''
let file = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-tasks-tenant-'))
  file = tasksStorePath(dir)
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

describe('isolamento', () => {
  it('tarefa de A nao aparece em B', async () => {
    const store = new CrmTaskStore(file)

    await store.upsert({ title: 'Ligar para Ana' }, A)

    expect((await store.list(A)).map(t => t.title)).toEqual(['Ligar para Ana'])
    expect(await store.list(B)).toEqual([])
  })

  it('remover de A nao apaga a de B', async () => {
    const store = new CrmTaskStore(file)

    const a = await store.upsert({ title: 'A' }, A)
    const b = await store.upsert({ title: 'B' }, B)

    if ('error' in a || 'error' in b) throw new Error('nao criou')

    await store.remove(a.tasks.find(t => t.title === 'A')!.id, A)

    expect((await store.list(A)).map(t => t.title)).toEqual([])
    expect((await store.list(B)).map(t => t.title)).toEqual(['B'])
  })

  it('id de outra empresa nao serve para editar', async () => {
    const store = new CrmTaskStore(file)

    const a = await store.upsert({ title: 'Da A' }, A)

    if ('error' in a) throw new Error(a.error)

    const idDaA = a.tasks[0]!.id

    // Mesmo id, tenant B: nao deve editar a tarefa de A.
    await store.upsert({ id: idDaA, title: 'sequestrada' }, B)

    expect((await store.list(A)).map(t => t.title)).toEqual(['Da A'])
  })
})

describe('leitura tolerante', () => {
  it('tarefa sem tenant no arquivo e lida como local', async () => {
    await writeFile(
      file,
      JSON.stringify({
        schema_version: 1,
        tasks: [{ contact_phone: '', created_at: 1, due_at: null, id: 'task_antiga', notes: '', priority: 'media', status: 'aberta', title: 'Antiga', updated_at: 1 }]
      }),
      'utf8'
    )

    const store = new CrmTaskStore(file)

    expect((await store.list(DEFAULT_TENANT)).map(t => t.title)).toEqual(['Antiga'])
  })

  it('parseTasks completa o campo sem alterar o resto', () => {
    const r = parseTasks(
      JSON.stringify({
        schema_version: 1,
        tasks: [{ id: 't1', title: 'X', status: 'aberta', priority: 'alta' }]
      })
    )

    expect(r.tasks[0]!.tenant_id).toBe(DEFAULT_TENANT)
    expect(r.tasks[0]!.title).toBe('X')
  })

  it('ler nao reescreve o arquivo', async () => {
    const original = JSON.stringify({
      schema_version: 1,
      tasks: [{ contact_phone: '', created_at: 1, due_at: null, id: 't', notes: '', priority: 'media', status: 'aberta', title: 'X', updated_at: 1 }]
    })

    await writeFile(file, original, 'utf8')

    await new CrmTaskStore(file).list()

    expect(await readFile(file, 'utf8')).toBe(original)
  })
})

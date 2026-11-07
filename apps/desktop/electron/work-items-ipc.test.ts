// Os canais do trabalho pontual (r85 do GOAL V2).

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Actor } from './rbac'
import { registerWorkItemIpc } from './work-items-ipc'
import { WorkItemStore, workItemStorePath } from './work-item-store'

let dir = ''
let store: WorkItemStore
let mapa: Map<string, (e: unknown, p: unknown) => Promise<unknown>>
let ator: Actor | null = null

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }
const LEITOR: Actor = { id: 'leitor', kind: 'human', level: 'READ', role: 'viewer' }

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-tp-ipc-'))
  store = new WorkItemStore(workItemStorePath(dir))
  mapa = new Map()
  ator = DONO

  registerWorkItemIpc(
    { handle: (c: string, l: (e: unknown, p: unknown) => Promise<unknown>) => mapa.set(c, l) } as never,
    { actorOf: async () => ator, store }
  )
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const chamar = async (canal: string, payload?: unknown): Promise<Record<string, unknown>> => {
  const h = mapa.get(canal)

  if (!h) throw new Error(`canal nao registrado: ${canal}`)

  return (await h(null, payload)) as Record<string, unknown>
}

const PEDIDO = { pedido: 'pesquisar concorrentes', tipo: 'pesquisa' }

describe('os canais existem', () => {
  it('6 canais, todos com o prefixo do dominio', () => {
    expect([...mapa.keys()].sort()).toEqual([
      'hermes:trabalhos:abertos',
      'hermes:trabalhos:criar',
      'hermes:trabalhos:descartarVencidos',
      'hermes:trabalhos:listar',
      'hermes:trabalhos:mudar',
      'hermes:trabalhos:vencidos'
    ])
  })
})

describe('a guarda', () => {
  it('sem ator, recusa', async () => {
    ator = null

    expect(await chamar('hermes:trabalhos:listar')).toMatchObject({ error: 'sem_permissao' })
  })

  it('LEITOR consulta, mas NÃO faz a faxina', async () => {
    ator = LEITOR

    expect(await chamar('hermes:trabalhos:abertos')).toMatchObject({ trabalhos: [] })
    // `descartarVencidos` é `execute`: quem só consulta não reorganiza a lista dos outros.
    expect(await chamar('hermes:trabalhos:descartarVencidos')).toMatchObject({ error: 'sem_permissao' })
  })
})

describe('as três leituras — e por que são três', () => {
  it('listar traz tudo; abertos e vencidos são perguntas diferentes', async () => {
    // Criado "há 2 meses" num prazo de 30 dias: está vencido.
    await store.criar(PEDIDO, 'local', Date.now() - 60 * 24 * 60 * 60 * 1000)

    expect((await chamar('hermes:trabalhos:listar'))['trabalhos']).toHaveLength(1)
    expect((await chamar('hermes:trabalhos:abertos'))['trabalhos']).toHaveLength(0)
    expect((await chamar('hermes:trabalhos:vencidos'))['trabalhos']).toHaveLength(1)
  })
})

describe('o caminho', () => {
  it('criar devolve a lista e nasce em pedido', async () => {
    const r = await chamar('hermes:trabalhos:criar', PEDIDO)

    expect((r['trabalho'] as { status: string }).status).toBe('pedido')
    expect(r['trabalhos']).toHaveLength(1)
  })

  it('criar sem pedido volta como erro, não como exceção', async () => {
    expect(await chamar('hermes:trabalhos:criar', { tipo: 'analise' })).toEqual({
      error: 'descricao_obrigatoria'
    })
  })

  it('entregar exige onde e resumo ATRAVÉS DO CANAL', async () => {
    const c = await chamar('hermes:trabalhos:criar', PEDIDO)
    const id = (c['trabalho'] as { id: string }).id

    expect(await chamar('hermes:trabalhos:mudar', { id, status: 'entregue' })).toEqual({
      error: 'entrega_incompleta'
    })
  })

  it('descartarVencidos é AÇÃO e devolve quantos', async () => {
    await store.criar(PEDIDO, 'local', Date.now() - 60 * 24 * 60 * 60 * 1000)

    const r = await chamar('hermes:trabalhos:descartarVencidos')

    expect(r['descartados']).toBe(1)
    // E o registro fica: descartado, não removido.
    expect((await chamar('hermes:trabalhos:listar'))['trabalhos']).toHaveLength(1)
  })

  it('ler NÃO limpa — a faxina é a ação, não o efeito colateral', async () => {
    await store.criar(PEDIDO, 'local', Date.now() - 60 * 24 * 60 * 60 * 1000)

    await chamar('hermes:trabalhos:abertos')

    expect((await chamar('hermes:trabalhos:vencidos'))['trabalhos']).toHaveLength(1)
  })
})

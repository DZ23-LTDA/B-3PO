// Os canais do projeto (r78 do GOAL V2).
//
// O projeto tem regra (r76) e disco (r77). Estes testes provam que a regra **atravessa o canal** — e que
// quem não tem permissão não passa.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ProjectStore, projectStorePath } from './project-store'
import { registerProjectIpc } from './projects-ipc'
import type { Actor } from './rbac'

let dir = ''
let store: ProjectStore
let mapa: Map<string, (e: unknown, p: unknown) => Promise<unknown>>
let ator: Actor | null = null

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }
const LEITOR: Actor = { id: 'leitor', kind: 'human', level: 'READ', role: 'viewer' }

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-proj-ipc-'))
  store = new ProjectStore(projectStorePath(dir))
  mapa = new Map()
  ator = DONO

  registerProjectIpc(
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

const PEDIDO = { nome: 'Loja', objetivo: 'vender online', criterios: ['o cliente compra'] }

describe('os canais existem', () => {
  it('5 canais, todos com o prefixo do dominio', () => {
    expect([...mapa.keys()].sort()).toEqual([
      'hermes:projetos:ativos',
      'hermes:projetos:criar',
      'hermes:projetos:listar',
      'hermes:projetos:mudar',
      'hermes:projetos:podeIniciar'
    ])
  })
})

describe('a guarda', () => {
  it('sem ator, o canal recusa — projeto não é público', async () => {
    ator = null

    expect(await chamar('hermes:projetos:listar')).toMatchObject({ error: 'sem_permissao' })
  })

  it('LEITOR consulta, mas não cria', async () => {
    ator = LEITOR

    // `read` passa: saber o que está em andamento não é agir.
    expect(await chamar('hermes:projetos:listar')).toMatchObject({ projetos: [] })
    // `execute` não: criar é agir.
    expect(await chamar('hermes:projetos:criar', PEDIDO)).toMatchObject({ error: 'sem_permissao' })
  })
})

describe('o caminho', () => {
  it('criar devolve a lista e o projeto nasce em rascunho', async () => {
    const r = await chamar('hermes:projetos:criar', PEDIDO)

    expect((r['projeto'] as { status: string }).status).toBe('rascunho')
    expect(r['projetos']).toHaveLength(1)
  })

  it('criar sem objetivo volta como erro, não como exceção', async () => {
    expect(await chamar('hermes:projetos:criar', { nome: 'X' })).toEqual({ error: 'objetivo_obrigatorio' })
  })

  it('ativos não inclui rascunho até alguém começar', async () => {
    const criado = await chamar('hermes:projetos:criar', PEDIDO)
    const id = (criado['projeto'] as { id: string }).id

    expect((await chamar('hermes:projetos:ativos'))['projetos']).toHaveLength(0)

    await chamar('hermes:projetos:mudar', { id, status: 'ativo' })

    expect((await chamar('hermes:projetos:ativos'))['projetos']).toHaveLength(1)
  })

  it('SEM CRITÉRIO a conclusão é recusada ATRAVÉS DO CANAL', async () => {
    const criado = await chamar('hermes:projetos:criar', { nome: 'X', objetivo: 'Fazer Y' })
    const id = (criado['projeto'] as { id: string }).id

    await chamar('hermes:projetos:mudar', { id, status: 'ativo' })

    expect(await chamar('hermes:projetos:mudar', { id, status: 'concluido' })).toEqual({ error: 'sem_criterios' })
  })

  it('podeIniciar responde pelo grafo que o chamador entregou', async () => {
    const criado = await chamar('hermes:projetos:criar', PEDIDO)
    const id = (criado['projeto'] as { id: string }).id

    expect(
      await chamar('hermes:projetos:podeIniciar', { id, tarefas: [{ depende_de: [], status: 'pendente', tarefa_id: 't1' }] })
    ).toEqual({ ok: true })
  })

  it('podeIniciar com ciclo recusa', async () => {
    const criado = await chamar('hermes:projetos:criar', PEDIDO)
    const id = (criado['projeto'] as { id: string }).id

    const r = await chamar('hermes:projetos:podeIniciar', {
      id,
      tarefas: [
        { depende_de: ['b'], status: 'pendente', tarefa_id: 'a' },
        { depende_de: ['a'], status: 'pendente', tarefa_id: 'b' }
      ]
    })

    expect(r).toMatchObject({ motivo: 'diagnostico', ok: false })
  })

  it('projeto inexistente', async () => {
    expect(await chamar('hermes:projetos:podeIniciar', { id: 'nao-existe', tarefas: [] })).toEqual({
      error: 'projeto_inexistente'
    })
  })
})

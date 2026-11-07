// O store de projetos (r77 do GOAL V2) — o plano que sobrevive ao reinício.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { parseProjectStore, ProjectStore, projectStorePath } from './project-store'
import { INSTALLATION_TENANT } from './server-tenant'

let dir = ''
let store: ProjectStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-proj-'))
  store = new ProjectStore(projectStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const PEDIDO = { nome: 'Loja', objetivo: 'vender online', criterios: ['o cliente consegue comprar'] }

describe('o caminho', () => {
  it('grava dentro de b3po/', () => {
    expect(projectStorePath('/x')).toBe(join('/x', 'b3po', 'projetos.json'))
  })

  it('arquivo corrompido vira store vazio', () => {
    expect(parseProjectStore('{nao e json')).toEqual({ projetos: [], schema_version: 1 })
  })

  it('PROJETO SEM OBJETIVO é descartado na leitura — quebraria a regra que dá sentido ao tipo', () => {
    const cru = JSON.stringify({
      projetos: [
        { criterios: [], id: 'a', nome: 'Sem objetivo', objetivo: '', status: 'rascunho' },
        { criterios: [], id: 'b', nome: 'Com objetivo', objetivo: 'Fazer X', status: 'rascunho' }
      ],
      schema_version: 1
    })

    expect(parseProjectStore(cru).projetos.map(p => p.id)).toEqual(['b'])
  })
})

describe('criar', () => {
  it('nasce em rascunho e com id', async () => {
    const r = await store.criar(PEDIDO)

    expect('projeto' in r && r.projeto.status).toBe('rascunho')
    expect('projeto' in r && r.projeto.id.length).toBeGreaterThan(0)
  })

  it('sem objetivo, recusa', async () => {
    expect(await store.criar({ nome: 'X' })).toEqual({ error: 'objetivo_obrigatorio' })
  })

  it('NOME REPETIDO É PERMITIDO — o id identifica, e "Site" pode ser dois projetos', async () => {
    await store.criar(PEDIDO)

    const segundo = await store.criar(PEDIDO)

    expect('projeto' in segundo).toBe(true)
    expect((await store.listar()).length).toBe(2)
  })

  it('o plano SOBREVIVE a instância nova — é o ponto do store', async () => {
    await store.criar(PEDIDO)

    const outra = new ProjectStore(projectStorePath(dir))
    const [p] = await outra.listar()

    expect(p?.objetivo).toBe('vender online')
    expect(p?.criterios).toEqual(['o cliente consegue comprar'])
  })
})

describe('listar e os ativos', () => {
  it('rascunho NÃO conta como ativo — ninguém começou', async () => {
    const a = await store.criar(PEDIDO)
    const id = 'projeto' in a ? a.projeto.id : ''

    expect(await store.ativos()).toHaveLength(0)

    await store.mudar({ id, status: 'ativo' })

    expect(await store.ativos()).toHaveLength(1)
  })

  it('o projeto de outro tenant não aparece', async () => {
    await store.criar(PEDIDO, 'empresa_b')

    expect(await store.listar(INSTALLATION_TENANT)).toHaveLength(0)
    expect(await store.listar('empresa_b')).toHaveLength(1)
  })
})

describe('mudar', () => {
  it('rascunho → ativo → concluído', async () => {
    const a = await store.criar(PEDIDO)
    const id = 'projeto' in a ? a.projeto.id : ''

    await store.mudar({ id, status: 'ativo' })

    const fim = await store.mudar({ id, status: 'concluido' })

    expect(fim && 'projeto' in fim && fim.projeto.status).toBe('concluido')
  })

  it('SEM CRITÉRIO a conclusão é recusada — a regra da r76 atravessa o disco', async () => {
    const a = await store.criar({ nome: 'X', objetivo: 'Fazer Y' })
    const id = 'projeto' in a ? a.projeto.id : ''

    await store.mudar({ id, status: 'ativo' })

    expect(await store.mudar({ id, status: 'concluido' })).toEqual({ error: 'sem_criterios' })
  })

  it('sem id ou status inválido, recusa antes de tocar no arquivo', async () => {
    expect(await store.mudar({ status: 'ativo' })).toEqual({ error: 'projeto_obrigatorio' })
    expect(await store.mudar({ id: 'x', status: 'inventado' })).toEqual({ error: 'status_invalido' })
  })

  it('id inexistente', async () => {
    expect(await store.mudar({ id: 'nao-existe', status: 'ativo' })).toEqual({ error: 'projeto_inexistente' })
  })

  it('concluído não volta', async () => {
    const a = await store.criar(PEDIDO)
    const id = 'projeto' in a ? a.projeto.id : ''

    await store.mudar({ id, status: 'ativo' })
    await store.mudar({ id, status: 'concluido' })

    expect(await store.mudar({ id, status: 'ativo' })).toEqual({ error: 'projeto_finalizado' })
  })
})

describe('podeIniciar — o store delega ao grafo, sem conhecer a sofia-store', () => {
  it('projeto inexistente', async () => {
    expect(await store.podeIniciar('nao-existe', [])).toEqual({ error: 'projeto_inexistente' })
  })

  it('com tarefa e sem ciclo, roda', async () => {
    const a = await store.criar(PEDIDO)
    const id = 'projeto' in a ? a.projeto.id : ''

    const r = await store.podeIniciar(id, [{ depende_de: [], status: 'pendente', tarefa_id: 't1' }])

    expect(r).toEqual({ ok: true })
  })

  it('a resposta do grafo chega inteira quando há ciclo', async () => {
    const a = await store.criar(PEDIDO)
    const id = 'projeto' in a ? a.projeto.id : ''

    const r = await store.podeIniciar(id, [
      { depende_de: ['b'], status: 'pendente', tarefa_id: 'a' },
      { depende_de: ['a'], status: 'pendente', tarefa_id: 'b' }
    ])

    expect(r).toMatchObject({ motivo: 'diagnostico', ok: false })
  })
})

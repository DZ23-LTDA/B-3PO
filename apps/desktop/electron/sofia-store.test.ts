// O store de planos (Sofia) — r17 do GOAL V2.
//
// O QUE ESTES TESTES PROTEGEM
//
// A spec (SOFIA-ORCHESTRATION-SPEC.md §4) fixa quatro invariantes que, se quebrarem, transformam a
// camada de coordenação num segundo runtime disfarçado:
//
//   1. `execucao_id` APONTA para o agent-execution-store — não copia o status da execução
//   2. `depende_de` é a ÚNICA representação de precedência — a ordem nunca é gravada
//   3. um plano não é "concluído" com tarefa pendente
//   4. não existe autoaprovação
//
// Os quatro têm teste. Sem eles, o store passaria a mentir com o tempo.

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { parseSofia, SofiaStore, sofiaStorePath } from './sofia-store'

let dir = ''
let store: SofiaStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-sofia-'))
  store = new SofiaStore(sofiaStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

function negado(r: unknown): boolean {
  return typeof r === 'object' && r !== null && typeof (r as { error?: string }).error === 'string'
}

const AGORA = 1_700_000_000_000

describe('caminho e parse', () => {
  it('grava dentro de b3po/, como os outros stores', () => {
    expect(sofiaStorePath('/x')).toBe(join('/x', 'b3po', 'sofia-planos.json'))
  })

  it('arquivo corrompido vira lista vazia, não exceção', () => {
    expect(parseSofia('{nao é json')).toEqual({ planos: [], schema_version: 1 })
    expect(parseSofia('{"planos":"x"}')).toEqual({ planos: [], schema_version: 1 })
  })
})

describe('criar plano', () => {
  it('recusa sem objetivo', async () => {
    expect(await store.criar({ escopo: 'projeto' }, AGORA)).toEqual({ error: 'objetivo_obrigatorio' })
  })

  it('recusa escopo fora dos três da spec', async () => {
    expect(await store.criar({ escopo: 'inventado', objetivo: 'x' }, AGORA)).toEqual({ error: 'escopo_invalido' })
  })

  it('recusa sem ator: plano sem responsável não tem a quem pedir aprovação', async () => {
    expect(await store.criar({ escopo: 'projeto', objetivo: 'x' }, AGORA)).toEqual({ error: 'ator_obrigatorio' })
  })

  it('recusa ids de tarefa duplicados: o grafo ficaria ambíguo', async () => {
    const r = await store.criar(
      {
        ator_id: 'a1',
        escopo: 'projeto',
        objetivo: 'x',
        tarefas: [
          { tarefa_id: 't1', titulo: 'a' },
          { tarefa_id: 't1', titulo: 'b' }
        ]
      },
      AGORA
    )

    expect(r).toEqual({ error: 'tarefa_duplicada' })
  })

  it('cria com escopo válido e persiste no arquivo', async () => {
    const r = await store.criar({ ator_id: 'a1', escopo: 'organizacao', objetivo: 'abrir loja' }, AGORA)

    expect(negado(r)).toBe(false)

    const lista = await store.listar()

    expect(lista).toHaveLength(1)
    expect(lista[0]?.objetivo).toBe('abrir loja')
    expect(lista[0]?.tenant_id).toBe('local')
    expect(lista[0]?.status).toBe('rascunho')
  })

  it('duas criações concorrentes não perdem plano', async () => {
    await Promise.all([
      store.criar({ ator_id: 'a1', escopo: 'projeto', objetivo: 'p1' }, AGORA),
      store.criar({ ator_id: 'a1', escopo: 'projeto', objetivo: 'p2' }, AGORA)
    ])

    expect(await store.listar()).toHaveLength(2)
  })
})

describe('invariante 2: depende_de é a única precedência', () => {
  it('guarda o grafo como veio, sem derivar ordem', async () => {
    const r = await store.criar(
      {
        ator_id: 'a1',
        escopo: 'projeto',
        objetivo: 'x',
        tarefas: [
          { depende_de: [], tarefa_id: 't1', titulo: 'primeira' },
          { depende_de: ['t1'], tarefa_id: 't2', titulo: 'segunda' }
        ]
      },
      AGORA
    )

    expect(negado(r)).toBe(false)

    const plano = (await store.listar())[0]

    expect(plano?.tarefas.map(t => t.tarefa_id)).toEqual(['t1', 't2'])
    expect(plano?.tarefas[1]?.depende_de).toEqual(['t1'])
  })

  it('atualizar a tarefa preserva as dependências existentes', async () => {
    await store.criar(
      {
        ator_id: 'a1',
        escopo: 'projeto',
        objetivo: 'x',
        tarefas: [{ depende_de: ['t0'], tarefa_id: 't1', titulo: 'a' }]
      },
      AGORA
    )

    const planoId = (await store.listar())[0]!.plano_id
    await store.atualizarTarefa(planoId, 't1', { status: 'pronta' }, AGORA)

    const plano = await store.obter(planoId)

    expect(plano?.tarefas[0]?.depende_de).toEqual(['t0'])
    expect(plano?.tarefas[0]?.status).toBe('pronta')
  })
})

describe('invariante 1: execucao_id aponta, não duplica', () => {
  it('grava o id da execução sem inventar status de execução', async () => {
    await store.criar(
      { ator_id: 'a1', escopo: 'projeto', objetivo: 'x', tarefas: [{ tarefa_id: 't1', titulo: 'a' }] },
      AGORA
    )

    const planoId = (await store.listar())[0]!.plano_id
    await store.atualizarTarefa(planoId, 't1', { execucao_id: 'exec-1', status: 'executando' }, AGORA)

    const plano = await store.obter(planoId)
    const tarefa = plano?.tarefas[0]

    expect(tarefa?.execucao_id).toBe('exec-1')
    // O store guarda o id e o status DO PLANO. Não há campo copiado do runtime.
    expect(Object.keys(tarefa ?? {})).not.toContain('transcript')
    expect(Object.keys(tarefa ?? {})).not.toContain('sessao_id')
  })

  it('resultado só entra se vier no patch — o store não inventa', async () => {
    await store.criar(
      { ator_id: 'a1', escopo: 'projeto', objetivo: 'x', tarefas: [{ tarefa_id: 't1', titulo: 'a' }] },
      AGORA
    )

    const planoId = (await store.listar())[0]!.plano_id

    await store.atualizarTarefa(planoId, 't1', { status: 'concluida' }, AGORA)

    const plano = await store.obter(planoId)

    expect(plano?.tarefas[0]?.resultado).toBeNull()
  })
})

describe('invariante 3: concluído exige tarefas concluídas', () => {
  it('recusa concluir plano com tarefa pendente', async () => {
    await store.criar(
      { ator_id: 'a1', escopo: 'projeto', objetivo: 'x', tarefas: [{ tarefa_id: 't1', titulo: 'a' }] },
      AGORA
    )

    const planoId = (await store.listar())[0]!.plano_id

    expect(await store.definirStatus(planoId, 'concluido', AGORA)).toEqual({ error: 'tarefas_pendentes' })
  })

  it('aceita concluir quando todas terminaram', async () => {
    await store.criar(
      { ator_id: 'a1', escopo: 'projeto', objetivo: 'x', tarefas: [{ tarefa_id: 't1', titulo: 'a' }] },
      AGORA
    )

    const planoId = (await store.listar())[0]!.plano_id

    await store.atualizarTarefa(planoId, 't1', { status: 'concluida' }, AGORA)

    const r = await store.definirStatus(planoId, 'concluido', AGORA)

    expect(negado(r)).toBe(false)
    expect((await store.obter(planoId))?.status).toBe('concluido')
  })
})

describe('invariante 4: não existe autoaprovação', () => {
  it('recusa quando quem aprova é quem pediu', async () => {
    await store.criar({ ator_id: 'a1', escopo: 'projeto', objetivo: 'x' }, AGORA)

    const planoId = (await store.listar())[0]!.plano_id

    expect(await store.aprovar(planoId, 'a1', AGORA)).toEqual({ error: 'autoaprovacao' })
  })

  it('exige um aprovador', async () => {
    await store.criar({ ator_id: 'a1', escopo: 'projeto', objetivo: 'x' }, AGORA)

    const planoId = (await store.listar())[0]!.plano_id

    expect(await store.aprovar(planoId, '', AGORA)).toEqual({ error: 'aprovador_obrigatorio' })
  })

  it('aprovação de outro ator move para executando', async () => {
    await store.criar({ ator_id: 'a1', escopo: 'projeto', objetivo: 'x', status: 'aguardando_aprovacao' }, AGORA)

    const planoId = (await store.listar())[0]!.plano_id
    const r = await store.aprovar(planoId, 'chefe', AGORA)

    expect(negado(r)).toBe(false)

    const plano = await store.obter(planoId)

    expect(plano?.aprovacao?.por).toBe('chefe')
    expect(plano?.status).toBe('executando')
  })
})

describe('leitura do arquivo', () => {
  it('o JSON gravado tem schema_version e planos', async () => {
    await store.criar({ ator_id: 'a1', escopo: 'projeto', objetivo: 'x' }, AGORA)

    const cru = JSON.parse(await readFile(sofiaStorePath(dir), 'utf8'))

    expect(cru.schema_version).toBe(1)
    expect(Array.isArray(cru.planos)).toBe(true)
  })

  it('plano inexistente e tarefa inexistente têm recusa própria', async () => {
    expect(await store.atualizarTarefa('nao-existe', 't1', {}, AGORA)).toEqual({ error: 'plano_inexistente' })
    expect(await store.definirStatus('nao-existe', 'concluido', AGORA)).toEqual({ error: 'plano_inexistente' })

    await store.criar({ ator_id: 'a1', escopo: 'projeto', objetivo: 'x' }, AGORA)

    const planoId = (await store.listar())[0]!.plano_id

    expect(await store.atualizarTarefa(planoId, 'nao-existe', {}, AGORA)).toEqual({ error: 'tarefa_inexistente' })
  })
})

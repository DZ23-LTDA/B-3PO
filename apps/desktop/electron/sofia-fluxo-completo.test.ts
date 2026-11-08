// O PRIMEIRO USO REAL DO ORQUESTRADOR (r101 do GOAL V2).
//
// A 7a ORDEM DO DONO: construir o orquestrador.
//
// Cada peca de Sofia tem teste proprio desde a sua rodada: r17 (store), r18 (grafo), r20 (ponte),
// r22 (orquestrador). NENHUM TESTE AS JUNTOU.
//
// E a forma da r45: um teste de unidade prova que a funcao faz o que ela diz; SO O FLUXO PROVA QUE ELAS
// FAZEM SENTIDO JUNTAS.
//
// O unico mock e o RUNTIME - porque o de verdade exige credencial (r54).

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { IniciarInput } from './agent-execution-store'
import { AGENTES, agentePorId } from './agent-roster'
import { diagnosticarGrafo, ordemTopologica, tarefasProntas } from './sofia-grafo'
import { filaDeDelegacao, resumoDoPlano } from './sofia-orquestrador'
import { delegarTarefa, motivoDeRecusa } from './sofia-ponte'
import { SofiaStore, sofiaStorePath } from './sofia-store'

let dir = ''
let store: SofiaStore

interface ExecucaoFalsa {
  execution_id: string
  status: 'concluida' | 'falhando' | 'rodando'
  task_id: string
}

function runtimeFalso() {
  const execucoes = new Map<string, ExecucaoFalsa>()
  const chamadas: IniciarInput[] = []
  const gravadas = new Map<string, string>()

  const iniciar = async (input: IniciarInput) => {
    chamadas.push(input)
    execucoes.set(input.execution_id, {
      execution_id: input.execution_id,
      status: 'rodando',
      task_id: input.task_id ?? ''
    })

    return { execution: execucoes.get(input.execution_id) }
  }

  return {
    chamadas,
    execucoes,
    gravadas,
    ponte: {
      execucoes: { iniciar } as never,
      gravarExecucao: async (tarefaId: string, execucaoId: string) => {
        gravadas.set(tarefaId, execucaoId)
      }
    }
  }
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-sofia-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
  store = new SofiaStore(sofiaStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const PLANO = {
  ator_id: 'dono',
  escopo: 'projeto',
  objetivo: 'publicar a loja de botijoes',
  plano_id: 'plano-1',
  tarefas: [
    { agente_id: 'business_manager', depende_de: [], status: 'pendente', tarefa_id: 't1', titulo: 'definir o catalogo' },
    { agente_id: 'sales', depende_de: ['t1'], status: 'pendente', tarefa_id: 't2', titulo: 'cadastrar os produtos' },
    { agente_id: 'operations', depende_de: ['t2'], status: 'pendente', tarefa_id: 't3', titulo: 'conferir a entrega' }
  ],
  tenant_id: 'local'
}

describe('o plano entra em disco e o grafo o entende', () => {
  it('criar grava e obter le', async () => {
    const criado = await store.criar(PLANO, 1_000)

    expect('plano' in criado).toBe(true)

    const lido = await store.obter('plano-1')

    expect(lido?.objetivo).toBe('publicar a loja de botijoes')
    expect(lido?.tarefas).toHaveLength(3)
  })

  it('o grafo NAO acha ciclo num plano bem formado', () => {
    const diagnostico = diagnosticarGrafo(PLANO.tarefas as never)

    expect(diagnostico.ciclos).toEqual([])
    expect(diagnostico.dependencias_orfas).toEqual([])
  })

  it('a ORDEM TOPOLOGICA respeita as dependencias', () => {
    expect(ordemTopologica(PLANO.tarefas as never)).toEqual(['t1', 't2', 't3'])
  })

  it('so a primeira esta pronta - as outras esperam', () => {
    expect(tarefasProntas(PLANO.tarefas as never)).toEqual(['t1'])
  })
})

describe('a delegacao ao runtime', () => {
  it('delegar a primeira chama o runtime com o agente do plano', async () => {
    const runtime = runtimeFalso()
    const r = await delegarTarefa(runtime.ponte, PLANO as never, 't1', { credencial: true })

    expect('execucao_id' in r).toBe(true)
    expect(runtime.chamadas).toHaveLength(1)
    expect(runtime.chamadas[0]).toMatchObject({ owner: 'business_manager', task_id: 't1' })
  })

  it('DELEGAR A SEGUNDA ANTES DA PRIMEIRA E RECUSADO - a dependencia nao e decorativa', async () => {
    const runtime = runtimeFalso()
    const r = await delegarTarefa(runtime.ponte, PLANO as never, 't2', { credencial: true })

    expect('error' in r).toBe(true)
    expect(runtime.chamadas).toHaveLength(0)
  })

  it('tarefa inexistente', async () => {
    const runtime = runtimeFalso()

    expect(await delegarTarefa(runtime.ponte, PLANO as never, 'nao-existe', { credencial: true })).toEqual({
      error: 'tarefa_inexistente'
    })
  })



  it('a ponte GRAVA o execucao_id na tarefa - a ligacao em disco', async () => {
    const runtime = runtimeFalso()

    await delegarTarefa(runtime.ponte, PLANO as never, 't1', { credencial: true })

    expect(runtime.gravadas.get('t1')).toContain('t1')
  })
})

describe('o orquestrador ordena e resume', () => {
  it('a fila de delegacao respeita o grafo', () => {
    expect(filaDeDelegacao(PLANO.tarefas as never)[0]).toBe('t1')
  })

  it('o resumo e um OBJETO - a tela conta, ela nao parseia texto', () => {
    const resumo = resumoDoPlano(PLANO.tarefas as never, 1_000)

    expect(resumo.total).toBe(3)
    expect(resumo.pendentes).toBe(3)
    expect(resumo.concluidas).toBe(0)
  })
})

describe('os agentes do plano EXISTEM no roster', () => {
  it('toda tarefa aponta para um agente real', () => {
    const inexistentes = PLANO.tarefas.filter(t => !agentePorId(t.agente_id)).map(t => t.agente_id)

    expect(inexistentes).toEqual([])
  })

  it('o roster tem os 11 agentes do GOAL', () => {
    expect(AGENTES.length).toBeGreaterThanOrEqual(11)
  })
})

describe('o fluxo inteiro, numa sequencia so', () => {
  it('plano, grafo, fila, delegacao e disco', async () => {
    const criado = await store.criar(PLANO, 1_000)

    expect('plano' in criado).toBe(true)

    const plano = await store.obter('plano-1')

    expect(plano).not.toBeNull()

    expect(ordemTopologica(plano!.tarefas as never)).toEqual(['t1', 't2', 't3'])
    expect(filaDeDelegacao(plano!.tarefas as never)[0]).toBe('t1')

    const runtime = runtimeFalso()
    const delegada = await delegarTarefa(runtime.ponte, plano as never, 't1', { credencial: true })

    expect('execucao_id' in delegada).toBe(true)
    expect(runtime.chamadas).toHaveLength(1)
    expect((await store.obter('plano-1'))?.tarefas).toHaveLength(3)
  })

  it('motivoDeRecusa e honesto sobre o porque', () => {
    const motivo = motivoDeRecusa(PLANO.tarefas[1] as never, PLANO as never)

    expect(motivo).not.toBeNull()
    expect(typeof motivo).toBe('string')
  })
})

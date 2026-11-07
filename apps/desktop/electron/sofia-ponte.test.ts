// A ponte plano → execução (r20 do GOAL V2).
//
// ESTE TESTE PROVA A INVARIANTE CENTRAL DA SPEC
//
// `execucao_id` **aponta**, não copia. A tarefa não carrega o status da execução — `statusDerivadoDaExecucao`
// consulta o store a cada chamada.
//
// O teste que decide isso é `o status acompanha o store, nao uma copia`: muda o status no store de
// execuções **sem tocar no plano**, e verifica que a leitura muda. Se a ponte copiasse, a leitura ficaria
// igual — e a prestação de contas mentiria.
//
// O SEGUNDO TESTE QUE DECIDE
//
// `parent_execution_id` é preenchido. O campo existia desde o início e nada o usava; este é o primeiro
// lugar do repositório que o preenche.

import { describe, expect, it } from 'vitest'

import type { ExecucaoGravada, ExecucaoStore, IniciarInput } from './agent-execution-store'
import {
  delegarTarefa,
  lerExecucao,
  motivoDeRecusa,
  paiDaTarefa,
  statusDerivadoDaExecucao,
  type PlanoParaDelegar,
  type SofiaPonteDeps
} from './sofia-ponte'

/** Store de execuções falso: registra o que foi iniciado e deixa o status ser mudado de fora. */
function execucoesFalsas(): { iniciadas: IniciarInput[]; store: ExecucaoStore; mudarStatus: (id: string, s: string) => void } {
  const iniciadas: IniciarInput[] = []
  const registradas = new Map<string, ExecucaoGravada>()

  const store: ExecucaoStore = {
    cancelar: () => ({ ok: true }),
    vincularSessao: () => ({ ok: true }),
        expirarPendentes: () => [],
        retomar: () => ({ error: 'nao_retomavel' }),
    finalizar: () => ({}),
    iniciar: (input, _opcoes) => {
      iniciadas.push(input)

      const execucao = {
        created_at: 0,
        execution_id: input.execution_id,
        owner: input.owner,
        parent_execution_id: input.parent_execution_id ?? null,
        resultado: null,
        status: 'rodando',
        task_id: input.task_id
      } as unknown as ExecucaoGravada

      registradas.set(input.execution_id, execucao)

      return { execucao }
    },
    listar: () => [...registradas.values()]
  }

  return {
    iniciadas,
    mudarStatus: (id, s) => {
      const e = registradas.get(id)

      if (e) (e as { status: string }).status = s
    },
    store
  }
}

function deps(store: ExecucaoStore): { deps: SofiaPonteDeps; gravadas: { execucaoId: string; tarefaId: string }[] } {
  const gravadas: { execucaoId: string; tarefaId: string }[] = []

  return {
    deps: {
      execucoes: store,
      gravarExecucao: async (tarefaId, execucaoId) => {
        gravadas.push({ execucaoId, tarefaId })
      }
    },
    gravadas
  }
}

function plano(tarefas: PlanoParaDelegar['tarefas']): PlanoParaDelegar {
  return { plano_id: 'p1', tarefas }
}

describe('parent_execution_id — o campo que nada preenchia', () => {
  it('tarefa raiz tem parent null', () => {
    expect(paiDaTarefa(plano([{ agente_id: 'a', depende_de: [], execucao_id: null, status: 'pendente', tarefa_id: 't1' }]).tarefas[0]!, plano([]))).toBeNull()
  })

  it('dependência já delegada vira o pai', () => {
    const p = plano([
      { agente_id: 'a', depende_de: [], execucao_id: 'exec-1', status: 'concluida', tarefa_id: 't1' },
      { agente_id: 'b', depende_de: ['t1'], execucao_id: null, status: 'pendente', tarefa_id: 't2' }
    ])

    expect(paiDaTarefa(p.tarefas[1]!, p)).toBe('exec-1')
  })

  it('dependência que nunca rodou não é pai', () => {
    const p = plano([
      { agente_id: 'a', depende_de: [], execucao_id: null, status: 'pendente', tarefa_id: 't1' },
      { agente_id: 'b', depende_de: ['t1'], execucao_id: null, status: 'pendente', tarefa_id: 't2' }
    ])

    expect(paiDaTarefa(p.tarefas[1]!, p)).toBeNull()
  })

  it('com duas dependências, o pai é o primeiro na ordem do depende_de', () => {
    // É uma ÁRVORE, não um grafo: um nó não pode ter dois pais. A segunda aresta já está no plano.
    const p = plano([
      { agente_id: 'a', depende_de: [], execucao_id: 'exec-1', status: 'concluida', tarefa_id: 't1' },
      { agente_id: 'b', depende_de: [], execucao_id: 'exec-2', status: 'concluida', tarefa_id: 't2' },
      { agente_id: 'c', depende_de: ['t2', 't1'], execucao_id: null, status: 'pendente', tarefa_id: 't3' }
    ])

    expect(paiDaTarefa(p.tarefas[2]!, p)).toBe('exec-2')
  })
})

describe('delegar', () => {
  it('grava execucao_id e preenche parent_execution_id', async () => {
    const fake = execucoesFalsas()
    const d = deps(fake.store)
    const p = plano([{ agente_id: 'a', depende_de: [], execucao_id: null, status: 'pendente', tarefa_id: 't1' }])

    const r = await delegarTarefa(d.deps, p, 't1', { credencial: true })

    expect(r).toMatchObject({ execucao_id: expect.any(String), parent_execution_id: null, tarefa_id: 't1' })
    expect(d.gravadas).toHaveLength(1)
    expect(fake.iniciadas).toHaveLength(1)
    expect(fake.iniciadas[0]?.parent_execution_id).toBeNull()
  })

  it('a execução da dependente herda o pai', async () => {
    const fake = execucoesFalsas()
    const d = deps(fake.store)
    const p = plano([
      { agente_id: 'a', depende_de: [], execucao_id: 'exec-pai', status: 'concluida', tarefa_id: 't1' },
      { agente_id: 'b', depende_de: ['t1'], execucao_id: null, status: 'pendente', tarefa_id: 't2' }
    ])

    const r = await delegarTarefa(d.deps, p, 't2', { credencial: true })

    expect(r).toMatchObject({ parent_execution_id: 'exec-pai' })
    expect(fake.iniciadas[0]?.parent_execution_id).toBe('exec-pai')
  })

  it('recusa delegar duas vezes a mesma tarefa', async () => {
    const fake = execucoesFalsas()
    const d = deps(fake.store)
    const p = plano([
      { agente_id: 'a', depende_de: [], execucao_id: 'exec-1', status: 'executando', tarefa_id: 't1' }
    ])

    expect(await delegarTarefa(d.deps, p, 't1', { credencial: true })).toEqual({ error: 'ja_delegada' })
    expect(fake.iniciadas).toHaveLength(0)
  })

  it('recusa delegar com dependência pendente', async () => {
    const fake = execucoesFalsas()
    const d = deps(fake.store)
    const p = plano([
      { agente_id: 'a', depende_de: [], execucao_id: null, status: 'pendente', tarefa_id: 't1' },
      { agente_id: 'b', depende_de: ['t1'], execucao_id: null, status: 'pendente', tarefa_id: 't2' }
    ])

    expect(await delegarTarefa(d.deps, p, 't2', { credencial: true })).toEqual({ error: 'dependencias_pendentes' })
    expect(fake.iniciadas).toHaveLength(0)
  })

  it('recusa delegar tarefa sem agente', async () => {
    const p = plano([{ agente_id: null, depende_de: [], execucao_id: null, status: 'pendente', tarefa_id: 't1' }])

    expect(motivoDeRecusa(p.tarefas[0]!, p)).toBe('sem_agente')
  })

  it('o erro do runtime sobe como está: sem credencial não é "plano falhou"', async () => {
    const store: ExecucaoStore = {
      cancelar: () => ({}),
      vincularSessao: () => ({ ok: true }),
        expirarPendentes: () => [],
        retomar: () => ({ error: 'nao_retomavel' }),
      finalizar: () => ({}),
      iniciar: () => ({ error: 'sem_credencial' }),
      listar: () => []
    }
    const d = deps(store)
    const p = plano([{ agente_id: 'a', depende_de: [], execucao_id: null, status: 'pendente', tarefa_id: 't1' }])

    const r = await delegarTarefa(d.deps, p, 't1', { credencial: false })

    expect(r).toEqual({ error: 'sem_credencial' })
    // E nada foi gravado: a tarefa continua sem execução, pronta para tentar de novo.
    expect(d.gravadas).toHaveLength(0)
  })

  it('tarefa inexistente tem recusa própria', async () => {
    const d = deps(execucoesFalsas().store)

    expect(await delegarTarefa(d.deps, plano([]), 'nao-existe', { credencial: true })).toEqual({
      error: 'tarefa_inexistente'
    })
  })
})

describe('invariante: o status é LIDO, não copiado', () => {
  it('mudar o status no store muda a leitura, sem tocar no plano', () => {
    const fake = execucoesFalsas()
    const d = deps(fake.store)

    fake.store.iniciar({ execution_id: 'exec-1', owner: 'a', parent_execution_id: null, task_id: 't1' }, { credencial: true })

    expect(statusDerivadoDaExecucao(d.deps, 'exec-1')).toBe('executando')

    // Ninguém tocou no plano. Só o runtime mudou.
    fake.mudarStatus('exec-1', 'concluida')

    expect(statusDerivadoDaExecucao(d.deps, 'exec-1')).toBe('concluida')
  })

  it('mapeia os status do runtime para os do plano', () => {
    const fake = execucoesFalsas()
    const d = deps(fake.store)

    fake.store.iniciar({ execution_id: 'e', owner: 'a', parent_execution_id: null, task_id: 't' }, { credencial: true })

    fake.mudarStatus('e', 'falhou')
    expect(statusDerivadoDaExecucao(d.deps, 'e')).toBe('falhou')

    fake.mudarStatus('e', 'cancelada')
    expect(statusDerivadoDaExecucao(d.deps, 'e')).toBe('bloqueada')

    fake.mudarStatus('e', 'rodando')
    expect(statusDerivadoDaExecucao(d.deps, 'e')).toBe('executando')
  })

  it('sem execução, a leitura é null (a tarefa não foi delegada)', () => {
    const d = deps(execucoesFalsas().store)

    expect(statusDerivadoDaExecucao(d.deps, null)).toBeNull()
    expect(statusDerivadoDaExecucao(d.deps, 'nao-existe')).toBeNull()
  })

  it('lerExecucao devolve resultado e status do store', () => {
    const fake = execucoesFalsas()
    const d = deps(fake.store)

    fake.store.iniciar({ execution_id: 'e', owner: 'a', parent_execution_id: null, task_id: 't' }, { credencial: true })
    fake.mudarStatus('e', 'concluida')

    const lida = lerExecucao(d.deps, 'e')

    expect(lida?.status).toBe('concluida')
    expect(typeof lida?.resultado).toBe('string')
  })
})

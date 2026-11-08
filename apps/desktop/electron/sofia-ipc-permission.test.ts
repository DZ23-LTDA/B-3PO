// Canais de Sofia — guarda desde o primeiro commit (r19 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// A r2 mediu **219 canais `ipcMain.handle` e 1 com guarda**. Levaram seis rodadas (r3–r8) para fechar os
// 30 de domínio, e cada uma precisou provar o vermelho com o canal aberto.
//
// Estes seis nascem protegidos. Este teste é a prova de que nasceram: ele falha se alguém remover uma
// guarda, e falharia hoje se eu tivesse esquecido uma.
//
// OS DOIS CASOS QUE MAIS IMPORTAM
//
//   1. `ator_id` e `aprovador` vêm do RESOLVEDOR, nunca do payload do renderer.
//      Se viessem do payload, bastaria escrever o nome de outra pessoa para criar trabalho em nome dela
//      (escalada) ou para se autoaprovar (a recusa do store viraria decorativa).
//
//   2. Sem ator, NADA é escrito — nem plano, nem status, nem aprovação.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { registerSofiaIpc } from './sofia-ipc'
import { SofiaStore, sofiaStorePath } from './sofia-store'
import type { Actor } from './rbac'

type Handler = (event: unknown, arg: unknown) => Promise<unknown>

const DONO: Actor = { id: 'ator-dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }
const CHEFE: Actor = { id: 'ator-chefe', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'manager' }

function negado(r: unknown): boolean {
  return typeof r === 'object' && r !== null && (r as { error?: string }).error === 'sem_permissao'
}

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-sofia-ipc-'))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

function montar(ator: Actor | null): { handlers: Map<string, Handler>; store: SofiaStore } {
  const handlers = new Map<string, Handler>()
  const store = new SofiaStore(sofiaStorePath(dir))

  registerSofiaIpc(
    { handle: (canal: string, h: Handler) => void handlers.set(canal, h) } as never,
    {
      actorOf: async () => ator,
      // r11 do V5: a ponte plano -> execucao precisa do store de execucoes.
      execucoes: { iniciar: () => ({ error: 'nao_usado_neste_teste' }), listar: () => [] } as never,
      store
    }
  )

  return { handlers, store }
}

describe('os seis canais existem', () => {
  it('registra exatamente os previstos na spec', () => {
    const { handlers } = montar(DONO)

    expect([...handlers.keys()].sort()).toEqual([
      'hermes:sofia:aprovar',
      'hermes:sofia:criar',
    // r11 do V5: a ponte plano -> execucao deixou de ser codigo morto.
    'hermes:sofia:delegar',
    // r24 do V5: o caminho de volta — o renderer informa a sessao que nasceu.
    'hermes:sofia:execucao:vinculada',
      'hermes:sofia:plano',
      'hermes:sofia:planos',
      'hermes:sofia:status',
      'hermes:sofia:tarefa'
    ])
  })
})

describe('sem ator, nada acontece', () => {
  it('os seis recusam com sem_permissao', async () => {
    const { handlers } = montar(null)

    for (const canal of [...handlers.keys()]) {
      const resposta = await handlers.get(canal)!(null, { plano_id: 'p1', tarefa_id: 't1' })

      expect(negado(resposta), `${canal} deveria recusar sem ator`).toBe(true)
    }
  })

  it('sem ator, NENHUM plano é criado', async () => {
    const { handlers, store } = montar(null)

    await handlers.get('hermes:sofia:criar')!(null, { escopo: 'projeto', objetivo: 'x' })

    expect(await store.listar()).toHaveLength(0)
  })
})

describe('ator_id vem do resolvedor, nunca do payload', () => {
  it('o renderer nao pode escolher o dono do plano', async () => {
    const { handlers, store } = montar(DONO)

    // O payload tenta se passar por outra pessoa. O canal ignora.
    const r = await handlers.get('hermes:sofia:criar')!(null, {
      ator_id: 'outra-pessoa',
      escopo: 'projeto',
      objetivo: 'x'
    })

    expect(negado(r)).toBe(false)

    const plano = (await store.listar())[0]

    expect(plano?.ator_id).toBe('ator-dono')
    expect(plano?.ator_id).not.toBe('outra-pessoa')
  })

  it('o aprovador tambem vem do resolvedor', async () => {
    const { handlers, store } = montar(DONO)

    await handlers.get('hermes:sofia:criar')!(null, { escopo: 'projeto', objetivo: 'x' })

    const planoId = (await store.listar())[0]!.plano_id

    // Dono tentando se autoaprovar. O store recusa porque compara com o ator_id do plano.
    expect(await handlers.get('hermes:sofia:aprovar')!(null, { plano_id: planoId, por: 'outra-pessoa' })).toEqual({
      error: 'autoaprovacao'
    })
  })

  it('outro ator aprova, e o registro tem o id de quem aprovou de verdade', async () => {
    const criado = montar(DONO)

    await criado.handlers.get('hermes:sofia:criar')!(null, { escopo: 'projeto', objetivo: 'x' })

    const planoId = (await criado.store.listar())[0]!.plano_id

    // O chefe monta a mesma store e aprova.
    const chefe = montar(CHEFE)
    const r = await chefe.handlers.get('hermes:sofia:aprovar')!(null, { plano_id: planoId, por: 'mentira' })

    expect(negado(r)).toBe(false)

    const plano = await chefe.store.obter(planoId)

    expect(plano?.aprovacao?.por).toBe('ator-chefe')
    expect(plano?.aprovacao?.por).not.toBe('mentira')
  })
})

describe('leitura devolve o grafo pronto', () => {
  it('planos vem com grafo, prontas e profundidade', async () => {
    const { handlers } = montar(DONO)

    await handlers.get('hermes:sofia:criar')!(null, {
      escopo: 'projeto',
      objetivo: 'x',
      tarefas: [
        { depende_de: [], tarefa_id: 't1', titulo: 'a' },
        { depende_de: ['t1'], tarefa_id: 't2', titulo: 'b' }
      ]
    })

    const r = (await handlers.get('hermes:sofia:planos')!(null, undefined)) as {
      planos: { grafo: { valido: boolean }; prontas: string[]; profundidade: number }[]
    }

    expect(r.planos).toHaveLength(1)
    expect(r.planos[0]?.grafo.valido).toBe(true)
    expect(r.planos[0]?.prontas).toEqual(['t1'])
    expect(r.planos[0]?.profundidade).toBe(1)
  })

  it('plano inexistente devolve null, nao erro', async () => {
    const { handlers } = montar(DONO)

    expect(await handlers.get('hermes:sofia:plano')!(null, 'nao-existe')).toEqual({ plano: null })
  })

  it('plano expoe ciclo em vez de esconder', async () => {
    const { handlers } = montar(DONO)

    await handlers.get('hermes:sofia:criar')!(null, {
      escopo: 'projeto',
      objetivo: 'x',
      tarefas: [
        { depende_de: ['t2'], tarefa_id: 't1', titulo: 'a' },
        { depende_de: ['t1'], tarefa_id: 't2', titulo: 'b' }
      ]
    })

    const r = (await handlers.get('hermes:sofia:planos')!(null, undefined)) as {
      planos: { grafo: { ciclos: string[][]; valido: boolean }; profundidade: null | number }[]
    }

    // O plano grava; o diagnostico diz que nao roda. Esconder o ciclo faria a tela mostrar um plano
    // que parece normal e nunca termina.
    expect(r.planos[0]?.grafo.valido).toBe(false)
    expect(r.planos[0]?.grafo.ciclos).toHaveLength(1)
    expect(r.planos[0]?.profundidade).toBeNull()
  })
})

describe('validacao de payload volta a valer com ator', () => {
  it('tarefa exige plano_id e tarefa_id', async () => {
    const { handlers } = montar(DONO)

    expect(await handlers.get('hermes:sofia:tarefa')!(null, {})).toEqual({ error: 'plano_obrigatorio' })
    expect(await handlers.get('hermes:sofia:tarefa')!(null, { plano_id: 'p1' })).toEqual({
      error: 'tarefa_obrigatoria'
    })
  })

  it('status exige plano_id', async () => {
    const { handlers } = montar(DONO)

    expect(await handlers.get('hermes:sofia:status')!(null, {})).toEqual({ error: 'plano_obrigatorio' })
  })

  it('criar sem objetivo recusa pelo store', async () => {
    const { handlers } = montar(DONO)

    expect(await handlers.get('hermes:sofia:criar')!(null, { escopo: 'projeto' })).toEqual({
      error: 'objetivo_obrigatorio'
    })
  })
})

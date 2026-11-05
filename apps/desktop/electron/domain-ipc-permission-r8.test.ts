// Guarda de permissão nos canais de agenda, atendimento e painel (r8 do GOAL V2).
//
// POR QUE UM ARQUIVO SÓ
//
// Os três últimos canais de domínio sem guarda fecham juntos: `scheduling-block` (3 canais),
// `service-desk` (2 no inventário, 5 no arquivo) e `analytics` (1). Um teste por domínio, no mesmo
// arquivo, porque a invariante é a mesma: **sem ator, nada é escrito e nada é lido**.
//
// O QUE CADA UM PROVA
//
//   agenda      — criar bloqueio tira horário de venda; remover vende horário que não existe
//   atendimento — abrir ticket é compromisso de atendimento com SLA correndo
//   painel      — o agregado revela o negócio inteiro, mesmo que cada parte pareça inofensiva

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { registerAnalyticsIpc } from './analytics-ipc'
import { registerSchedulingBlockIpc } from './scheduling-block-ipc'
import { registerServiceDeskIpc, type ServiceDeskLike } from './service-desk-ipc'
import type { Actor } from './rbac'

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>

const DONO: Actor = { id: 'ator-dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }

function negado(resposta: unknown): boolean {
  return typeof resposta === 'object' && resposta !== null && (resposta as { error?: string }).error === 'sem_permissao'
}

function ipcFake(): { handlers: Map<string, Handler>; handle: (canal: string, handler: Handler) => void } {
  const handlers = new Map<string, Handler>()

  return { handle: (canal, handler) => void handlers.set(canal, handler), handlers }
}

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-r8-'))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

describe('agenda — bloqueio exige ator', () => {
  it('os três canais recusam sem ator', async () => {
    const ipc = ipcFake()

    registerSchedulingBlockIpc(ipc as never, { actorOf: async () => null, userData: dir })

    for (const canal of [
      'hermes:scheduling:block:list',
      'hermes:scheduling:block:create',
      'hermes:scheduling:block:remove'
    ]) {
      expect(negado(await ipc.handlers.get(canal)!(null, { id: 'b1' })), `${canal} deveria recusar`).toBe(true)
    }
  })

  it('sem ator, NENHUM bloqueio é criado no disco', async () => {
    const ipc = ipcFake()

    registerSchedulingBlockIpc(ipc as never, { actorOf: async () => null, userData: dir })

    await ipc.handlers.get('hermes:scheduling:block:create')!(null, {
      end: '2026-11-05T18:00:00.000Z',
      reason: 'teste',
      start: '2026-11-05T17:00:00.000Z'
    })

    // O canal com ator devolveria a lista; aqui a lista tem de continuar vazia.
    const ipcComAtor = ipcFake()
    registerSchedulingBlockIpc(ipcComAtor as never, { actorOf: async () => DONO, userData: dir })

    const lista = await ipcComAtor.handlers.get('hermes:scheduling:block:list')!(null)
    const blocos = (lista as { blocks?: unknown[]; blocos?: unknown[] }).blocks ?? (lista as { blocos?: unknown[] }).blocos ?? []

    expect(blocos).toHaveLength(0)
  })
})

describe('atendimento — os cinco canais exigem ator', () => {
  function montar(actor: Actor | null): { handlers: Map<string, Handler>; abertos: () => number } {
    const ipc = ipcFake()
    let abertos = 0

    const store: ServiceDeskLike = {
      list: async () => [],
      open: async () => {
        abertos++
        return { ticket: { id: 't1' } as never, tickets: [] }
      },
      rate: async () => ({ review: false, tickets: [] }),
      setStatus: async () => ({ tickets: [] })
    }

    registerServiceDeskIpc(ipc as never, store, { actorOf: async () => actor })

    return { abertos: () => abertos, handlers: ipc.handlers }
  }

  it('os cinco canais recusam sem ator', async () => {
    const { handlers } = montar(null)

    for (const canal of [
      'hermes:desk:tickets',
      'hermes:desk:indicators',
      'hermes:desk:open',
      'hermes:desk:setStatus',
      'hermes:desk:rate'
    ]) {
      expect(negado(await handlers.get(canal)!(null, 't1', 5)), `${canal} deveria recusar`).toBe(true)
    }
  })

  it('sem ator, NENHUM ticket é aberto', async () => {
    const { abertos, handlers } = montar(null)

    await handlers.get('hermes:desk:open')!(null, { subject: 'teste' })

    expect(abertos()).toBe(0)
  })
})

describe('painel — o agregado exige ator', () => {
  it('sem ator, o dashboard recusa', async () => {
    const ipc = ipcFake()

    // As deps de domínio nem são exercitadas: a guarda recusa antes de gatherSnapshot.
    const depsVazias = {
      afterSales: { listAll: async () => [] },
      desk: { list: async () => [] },
      finance: { totals: async () => ({ openPayableCents: 0, openReceivableCents: 0 }) },
      inventory: { balances: async () => [] },
      marketing: { listCampaigns: async () => [], listPosts: async () => [] },
      sales: { list: async () => [] }
    }

    registerAnalyticsIpc(ipc as never, { ...depsVazias, actorOf: async () => null } as never)

    expect(negado(await ipc.handlers.get('hermes:analytics:dashboard')!(null))).toBe(true)
  })

  it('com ator, o dashboard responde', async () => {
    const ipc = ipcFake()

    const depsVazias = {
      afterSales: { listAll: async () => [] },
      desk: { list: async () => [] },
      finance: { totals: async () => ({ openPayableCents: 0, openReceivableCents: 0 }) },
      inventory: { balances: async () => [] },
      marketing: { listCampaigns: async () => [], listPosts: async () => [] },
      sales: { list: async () => [] }
    }

    registerAnalyticsIpc(ipc as never, { ...depsVazias, actorOf: async () => DONO } as never)

    const resposta = (await ipc.handlers.get('hermes:analytics:dashboard')!(null)) as { snapshot?: unknown }

    expect(resposta.snapshot).toBeDefined()
  })
})

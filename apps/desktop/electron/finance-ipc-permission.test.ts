// O financeiro exige ator (rodada 215).
//
// A r214 mediu que 2 de 40 canais consultavam permissao. A r215 ligou a guarda no primeiro canal de dominio.
//
// O QUE ESTES TESTES PROVAM
//
// 1. **sem ator, nada acontece** — nem leitura. Era o buraco: qualquer codigo no renderer lia o financeiro.
// 2. **o dono passa** e a acao e registrada.
// 3. **um nivel baixo e recusado** com o motivo, e o dado NAO vaza junto com o erro.
//
// O terceiro e o que separa "guardei" de "guardei e escondi": uma recusa que devolve os dados nao recusou nada.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { FinanceStore, financeStorePath } from './finance-store'
import { registerFinanceIpc } from './finance-ipc'
import type { Actor } from './rbac'

type Handler = (event: unknown, ...args: unknown[]) => unknown

function fakeIpc() {
  const handlers = new Map<string, Handler>()

  return {
    channels: () => [...handlers.keys()],
    handle: (channel: string, handler: Handler) => handlers.set(channel, handler),
    invoke: async (channel: string, ...args: unknown[]) => {
      const handler = handlers.get(channel)

      if (!handler) throw new Error(`canal ausente: ${channel}`)

      return handler({}, ...args)
    }
  }
}

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }
const VISITANTE: Actor = { id: 'vis', kind: 'human', level: 'READ', role: 'viewer' }

async function comFinanceiro(ator: Actor | null, run: (ipc: ReturnType<typeof fakeIpc>, store: FinanceStore) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-fin-perm-'))

  try {
    const store = new FinanceStore(financeStorePath(dir))
    const ipc = fakeIpc()

    registerFinanceIpc(ipc, store, { actorOf: async () => ator })

    await run(ipc, store)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('sem ator, o financeiro nao responde', () => {
  it('list recusa sem devolver lancamento', async () => {
    await comFinanceiro(null, async (ipc, store) => {
      await store.append({ amount_cents: 5000, due_at: Date.now() + 86_400_000, kind: 'receber' })

      const r = (await ipc.invoke('hermes:finance:list')) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect(r.reason).toBe('sem_ator')
      // O ponto: a recusa nao carrega dado.
      expect(r.entries).toBeUndefined()
    })
  })

  it('append recusa sem gravar', async () => {
    await comFinanceiro(null, async (ipc, store) => {
      const r = (await ipc.invoke('hermes:finance:append', {
        amount_cents: 5000,
        due_at: Date.now() + 86_400_000,
        kind: 'receber'
      })) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect(await store.list()).toHaveLength(0)
    })
  })

  it('totals e costCenters tambem recusam', async () => {
    await comFinanceiro(null, async ipc => {
      expect(((await ipc.invoke('hermes:finance:totals')) as Record<string, unknown>).error).toBe('sem_permissao')
      expect(((await ipc.invoke('hermes:finance:costCenters')) as Record<string, unknown>).error).toBe('sem_permissao')
    })
  })

  it('settle recusa sem liquidar', async () => {
    await comFinanceiro(null, async (ipc, store) => {
      const criado = await store.append({ amount_cents: 5000, due_at: Date.now() + 86_400_000, kind: 'receber' })
      const id = 'entry' in criado ? criado.entry.id : ''

      const r = (await ipc.invoke('hermes:finance:settle', id)) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect((await store.list())[0]?.status).toBe('aberto')
    })
  })
})

describe('o dono passa', () => {
  it('list devolve os lancamentos', async () => {
    await comFinanceiro(DONO, async (ipc, store) => {
      await store.append({ amount_cents: 5000, due_at: Date.now() + 86_400_000, kind: 'receber' })

      const r = (await ipc.invoke('hermes:finance:list')) as { entries: unknown[] }

      expect(r.entries).toHaveLength(1)
    })
  })

  it('append grava', async () => {
    await comFinanceiro(DONO, async (ipc, store) => {
      await ipc.invoke('hermes:finance:append', {
        amount_cents: 5000,
        due_at: Date.now() + 86_400_000,
        kind: 'receber'
      })

      expect(await store.list()).toHaveLength(1)
    })
  })
})

describe('nivel insuficiente', () => {
  it('quem so le nao lanca, e o motivo diz qual acao faltou', async () => {
    await comFinanceiro(VISITANTE, async (ipc, store) => {
      const r = (await ipc.invoke('hermes:finance:append', {
        amount_cents: 5000,
        due_at: Date.now() + 86_400_000,
        kind: 'receber'
      })) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect(r.reason).toBeTruthy()
      expect(await store.list()).toHaveLength(0)
    })
  })

  it('quem so le ainda consegue ler', async () => {
    // A guarda nao pode transformar "sem poder de escrita" em "sem poder de leitura".
    await comFinanceiro(VISITANTE, async (ipc, store) => {
      await store.append({ amount_cents: 5000, due_at: Date.now() + 86_400_000, kind: 'receber' })

      const r = (await ipc.invoke('hermes:finance:list')) as { entries: unknown[] }

      expect(r.entries).toHaveLength(1)
    })
  })
})

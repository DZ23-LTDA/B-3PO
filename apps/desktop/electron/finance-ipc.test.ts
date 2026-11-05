import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { FinanceStore, financeStorePath, type FinanceEntry } from './finance-store'
import { registerFinanceIpc } from './finance-ipc'

type Handler = (event: unknown, ...args: unknown[]) => unknown

function fakeIpc() {
  const handlers = new Map<string, Handler>()

  return {
    channels: () => [...handlers.keys()].sort(),
    handle: (channel: string, handler: Handler) => {
      handlers.set(channel, handler)
    },
    invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
      const handler = handlers.get(channel)

      if (!handler) throw new Error(`canal nao registrado: ${channel}`)

      return handler(null, ...args)
    }
  }
}

async function withIpc<T>(run: (ipc: ReturnType<typeof fakeIpc>, store: FinanceStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-finance-ipc-'))

  try {
    const store = new FinanceStore(financeStorePath(dir))
    const ipc = fakeIpc()

    registerFinanceIpc(ipc, store)

    return await run(ipc, store)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const amanha = () => Date.now() + 86_400_000

describe('IPC do financeiro', () => {
  // r209: eram quatro canais; costCenters entrou para o 18 (centros de custo).
  // A lista continua FECHADA: protege contra canal acidental, nao um numero.
  it('registra exatamente os canais do financeiro', async () => {
    await withIpc(async ipc => {
      expect(ipc.channels()).toEqual([
        'hermes:finance:append',
        'hermes:finance:costCenters',
        'hermes:finance:list',
        'hermes:finance:settle',
        'hermes:finance:totals'
      ])
    })
  })

  it('lanca e devolve totais derivados', async () => {
    await withIpc(async ipc => {
      expect(await ipc.invoke('hermes:finance:totals')).toEqual({
        totals: {
          openPayableCents: 0,
          openReceivableCents: 0,
          overdueCents: 0,
          paidPayableCents: 0,
          paidReceivableCents: 0
        }
      })

      const r = (await ipc.invoke('hermes:finance:append', {
        amount: 7470,
        due_at: amanha(),
        kind: 'receber'
      })) as { entry: FinanceEntry }

      expect(r.entry.amount_cents).toBe(7470)
      expect(await ipc.invoke('hermes:finance:totals')).toMatchObject({ totals: { openReceivableCents: 7470 } })
    })
  })

  it('liquida e move o valor para pago', async () => {
    await withIpc(async ipc => {
      const r = (await ipc.invoke('hermes:finance:append', {
        amount: 1000,
        due_at: amanha(),
        kind: 'pagar'
      })) as { entry: FinanceEntry }

      const liquidado = (await ipc.invoke('hermes:finance:settle', r.entry.id)) as { entries: FinanceEntry[] }

      expect(liquidado.entries[0]!.status).toBe('pago')
      expect(await ipc.invoke('hermes:finance:totals')).toMatchObject({
        totals: { openPayableCents: 0, paidPayableCents: 1000 }
      })
    })
  })

  it('propaga erro de validacao como valor', async () => {
    await withIpc(async ipc => {
      await expect(ipc.invoke('hermes:finance:append', { kind: 'receber' })).resolves.toEqual({ error: 'amount_required' })
      await expect(ipc.invoke('hermes:finance:settle', 'inexistente')).resolves.toEqual({
        error: 'lancamento_nao_encontrado'
      })
    })
  })

  it('tolera id nao-string sem derrubar o processo', async () => {
    await withIpc(async ipc => {
      await expect(ipc.invoke('hermes:finance:settle', { id: 1 })).resolves.toEqual({ error: 'lancamento_nao_encontrado' })
    })
  })
})

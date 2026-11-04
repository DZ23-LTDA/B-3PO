import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { InventoryStore, inventoryStorePath, type InventoryMovement } from './inventory-store'
import { registerInventoryIpc, type MovementResult } from './inventory-ipc'
import { mountErpIpc } from './erp-ipc'

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

async function withStore<T>(run: (store: InventoryStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-inventory-ipc-'))

  try {
    return await run(new InventoryStore(inventoryStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('IPC do estoque', () => {
  it('registra os tres canais e nada alem deles', () => {
    const ipc = fakeIpc()

    registerInventoryIpc(ipc, { append: async () => ({ error: 'x' }), balances: async () => ({}), list: async () => [] })

    expect(ipc.channels()).toEqual(['hermes:inventory:append', 'hermes:inventory:balances', 'hermes:inventory:list'])
  })

  it('saldo comeca vazio e sobe depois da entrada', async () => {
    await withStore(async store => {
      const ipc = fakeIpc()

      registerInventoryIpc(ipc, store)

      expect(await ipc.invoke('hermes:inventory:balances')).toEqual({ balances: {} })

      const r = (await ipc.invoke('hermes:inventory:append', {
        kind: 'entrada',
        product_sku: 'CAF-500',
        quantity: 10
      })) as MovementResult

      expect('balance' in r && r.balance).toBe(10000)
      expect(await ipc.invoke('hermes:inventory:balances')).toEqual({ balances: { 'CAF-500': 10000 } })
    })
  })

  it('propaga erro de validacao como valor', async () => {
    await withStore(async store => {
      const ipc = fakeIpc()

      registerInventoryIpc(ipc, store)

      await expect(ipc.invoke('hermes:inventory:append', { kind: 'entrada', quantity: 1 })).resolves.toEqual({
        error: 'sku_required'
      })
      await expect(ipc.invoke('hermes:inventory:append', { kind: 'saida', product_sku: 'X', quantity: 1 })).resolves.toEqual({
        error: 'saldo_insuficiente'
      })
    })
  })

  it('lista as movimentacoes gravadas', async () => {
    await withStore(async store => {
      const ipc = fakeIpc()

      registerInventoryIpc(ipc, store)
      await ipc.invoke('hermes:inventory:append', { kind: 'entrada', product_sku: 'A', quantity: 2 })

      const r = (await ipc.invoke('hermes:inventory:list')) as { movements: InventoryMovement[] }

      expect(r.movements).toHaveLength(1)
      expect(r.movements[0]!.product_sku).toBe('A')
    })
  })

  it('mountErpIpc liga catalogo E estoque sobre o mesmo userData', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'b3po-erp-mount-'))

    try {
      const ipc = fakeIpc()

      mountErpIpc(ipc, dir)

      expect(ipc.channels()).toContain('hermes:catalog:list')
      expect(ipc.channels()).toContain('hermes:inventory:append')
      expect(ipc.channels()).toHaveLength(6)
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })
})

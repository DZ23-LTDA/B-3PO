// Inventario pelo canal IPC (rodada 186).
//
// Prova que o modulo puro esta CONECTADO: o canal le o saldo real, grava os movimentos e o saldo passa a
// refletir a contagem fisica.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { registerInventoryIpc } from './inventory-ipc'
import { InventoryStore, inventoryStorePath } from './inventory-store'

let dir = ''
let invocar: (canal: string, ...args: unknown[]) => Promise<unknown>
let inventory: InventoryStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-inventario-'))
  inventory = new InventoryStore(inventoryStorePath(dir))

  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>()

  registerInventoryIpc(
    {
      handle: (canal: string, fn: (event: unknown, ...args: unknown[]) => Promise<unknown>) => {
        handlers.set(canal, fn)
      }
    } as never,
    inventory,
    { actorOf: async () => ({ id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }) }
  )

  invocar = async (canal: string, ...args: unknown[]) => {
    const handler = handlers.get(canal)

    if (!handler) throw new Error('canal nao registrado: ' + canal)

    return handler(null, ...args)
  }
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

async function comSaldo(sku: string, quantidade: number) {
  await inventory.append({ kind: 'entrada', product_sku: sku, quantity: quantidade, reason: 'compra' })
}

describe('inventario pelo canal', () => {
  it('a contagem fisica corrige o saldo do ledger', async () => {
    await comSaldo('SKU-1', 10)
    expect((await inventory.balances())['SKU-1']).toBe(10_000)

    const r = (await invocar('hermes:inventory:inventario', {
      contagens: [{ contado_milli: 7_000, product_sku: 'SKU-1' }],
      id: 'inv-1'
    })) as { ajustes: number }

    expect(r.ajustes).toBe(1)
    expect((await inventory.balances())['SKU-1']).toBe(7_000)
  })

  it('sobra tambem e corrigida', async () => {
    await comSaldo('SKU-1', 10)

    await invocar('hermes:inventory:inventario', {
      contagens: [{ contado_milli: 13_000, product_sku: 'SKU-1' }],
      id: 'inv-1'
    })

    expect((await inventory.balances())['SKU-1']).toBe(13_000)
  })

  it('contagem que ja bate nao cria movimento', async () => {
    await comSaldo('SKU-1', 10)
    const antes = (await inventory.list('local')).length

    const r = (await invocar('hermes:inventory:inventario', {
      contagens: [{ contado_milli: 10_000, product_sku: 'SKU-1' }],
      id: 'inv-1'
    })) as { ajustes: number; sem_diferenca: string[] }

    expect(r.ajustes).toBe(0)
    expect(r.sem_diferenca).toEqual(['SKU-1'])
    expect((await inventory.list('local')).length).toBe(antes)
  })

  it('repetir o mesmo inventario nao duplica o ajuste', async () => {
    // O `ref` deterministico e o que protege contra um retry apos queda.
    await comSaldo('SKU-1', 10)

    await invocar('hermes:inventory:inventario', {
      contagens: [{ contado_milli: 7_000, product_sku: 'SKU-1' }],
      id: 'inv-1'
    })

    const depoisPrimeiro = (await inventory.balances())['SKU-1']

    await invocar('hermes:inventory:inventario', {
      contagens: [{ contado_milli: 7_000, product_sku: 'SKU-1' }],
      id: 'inv-1'
    })

    expect((await inventory.balances())['SKU-1']).toBe(depoisPrimeiro)
  })

  it('recusa inventario sem id e sem contagens', async () => {
    expect(await invocar('hermes:inventory:inventario', { contagens: [] })).toEqual({
      error: 'inventario_id_required'
    })
    expect(await invocar('hermes:inventory:inventario', { id: 'x', contagens: [] })).toEqual({
      error: 'contagens_required'
    })
  })

  it('SKU desconhecido nao cria estoque do nada', async () => {
    const r = (await invocar('hermes:inventory:inventario', {
      contagens: [{ contado_milli: 5, product_sku: 'FANTASMA' }],
      id: 'inv-1'
    })) as { ajustes: number; ignoradas: string[] }

    expect(r.ajustes).toBe(0)
    expect(r.ignoradas).toContain('FANTASMA')
    expect((await inventory.balances())['FANTASMA']).toBeUndefined()
  })
})

// O estoque exige ator (rodada 217).
//
// Segundo canal de dominio com guarda, primeiro a usar `exigirAtor`.
//
// ESTOQUE NAO E LEITURA INOFENSIVA
//
// `balances` devolve o saldo de cada SKU: isso ja conta o que a empresa tem. E `append` da baixa —
// move patrimonio. Separar `read` de `execute` aqui nao e cerimonia: quem so consulta o saldo continua
// consultando; quem nao tem nivel de execucao nao movimenta.
//
// O TESTE PROVA A RECUSA ANTES DO EFEITO
//
// Uma guarda que roda depois da escrita nao protege nada. Por isso cada caso verifica o ESTADO, nao so a
// resposta: o saldo continua onde estava, o ledger continua com o mesmo tamanho.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { registerInventoryIpc } from './inventory-ipc'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import type { Actor } from './rbac'

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>

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
const SO_LE: Actor = { id: 'leitor', kind: 'human', level: 'READ', role: 'viewer' }

async function comEstoque(
  ator: Actor | null,
  run: (ipc: ReturnType<typeof fakeIpc>, store: InventoryStore) => Promise<void>
) {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-inv-perm-'))

  try {
    const store = new InventoryStore(inventoryStorePath(dir))
    const ipc = fakeIpc()

    registerInventoryIpc(ipc, store, { actorOf: async () => ator })

    await run(ipc, store)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('sem ator', () => {
  it('balances recusa sem devolver saldo', async () => {
    await comEstoque(null, async ipc => {
      const r = (await ipc.invoke('hermes:inventory:balances')) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect(r.reason).toBe('sem_ator')
      expect(r.balances).toBeUndefined()
    })
  })

  it('append recusa e o ledger NAO cresce', async () => {
    await comEstoque(null, async (ipc, store) => {
      const r = (await ipc.invoke('hermes:inventory:append', {
        kind: 'entrada',
        product_sku: 'CAFE',
        quantity: 10
      })) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect(await store.list()).toHaveLength(0)
    })
  })

  it('inventario recusa e o saldo NAO muda', async () => {
    await comEstoque(null, async (ipc, store) => {
      const r = (await ipc.invoke('hermes:inventory:inventario', {
        contagens: [{ contado_milli: 3, product_sku: 'CAFE' }],
        id: 'inv-1'
      })) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect(await store.list()).toHaveLength(0)
    })
  })

  it('list recusa', async () => {
    await comEstoque(null, async ipc => {
      expect(((await ipc.invoke('hermes:inventory:list')) as Record<string, unknown>).error).toBe('sem_permissao')
    })
  })
})

describe('o dono movimenta', () => {
  it('append entra no ledger e aparece no saldo', async () => {
    await comEstoque(DONO, async (ipc, store) => {
      await ipc.invoke('hermes:inventory:append', { kind: 'entrada', product_sku: 'CAFE', quantity: 10 })

      expect(await store.list()).toHaveLength(1)
      expect((await ipc.invoke('hermes:inventory:balances')) as { balances: Record<string, number> }).toMatchObject({
        balances: { CAFE: 10_000 }
      })
    })
  })

  it('inventario gera o ajuste', async () => {
    await comEstoque(DONO, async (ipc, store) => {
      await ipc.invoke('hermes:inventory:append', { kind: 'entrada', product_sku: 'CAFE', quantity: 10 })

      const r = (await ipc.invoke('hermes:inventory:inventario', {
        contagens: [{ contado_milli: 7_000, product_sku: 'CAFE' }],
        id: 'inv-1'
      })) as { ajustes: number }

      expect(r.ajustes).toBe(1)
      // O ledger e imutavel: a entrada continua la, mais o ajuste. Numeros em MILI-unidades (10 = 10.000).
      expect(await store.list()).toHaveLength(2)
    })
  })
})

describe('nivel insuficiente', () => {
  it('quem so le consulta o saldo', async () => {
    await comEstoque(SO_LE, async (ipc, store) => {
      await store.append({ kind: 'entrada', product_sku: 'CAFE', quantity: 5 })

      const r = (await ipc.invoke('hermes:inventory:balances')) as { balances: Record<string, number> }

      expect(r.balances).toEqual({ CAFE: 5_000 })
    })
  })

  it('quem so le NAO movimenta', async () => {
    await comEstoque(SO_LE, async (ipc, store) => {
      const r = (await ipc.invoke('hermes:inventory:append', {
        kind: 'entrada',
        product_sku: 'CAFE',
        quantity: 5
      })) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect(await store.list()).toHaveLength(0)
    })
  })
})

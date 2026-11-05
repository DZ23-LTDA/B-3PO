import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { InventoryStore, inventoryStorePath } from './inventory-store'
import { PurchasesStore, purchasesStorePath, type PurchaseOrder, type Supplier } from './purchases-store'
import type { FinanceEntry } from './finance-store'
import { registerPurchasesIpc, type ReceiveResult } from './purchases-ipc'

type Handler = (event: unknown, ...args: unknown[]) => unknown

/** Financeiro falso: registra o que foi lancado, sem gravar arquivo. */
interface FakeFinance {
  append: (input: unknown) => Promise<{ entry: FinanceEntry } | { error: string }>
  lancados: () => unknown[]
}

function fakeFinance(): FakeFinance {
  const lancados: unknown[] = []

  return {
    append: async (input: unknown) => {
      lancados.push(input)

      const ref = (input as { ref?: string }).ref
      const jaTem = lancados.some((l, i) => i < lancados.length - 1 && (l as { ref?: string }).ref === ref)

      // Mesma semantica do store real: ref repetida e idempotencia, nao erro.
      return jaTem ? { error: 'ref_duplicado' } : { entry: { ref } as unknown as FinanceEntry }
    },
    lancados: () => lancados
  }
}

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

async function withDepot<T>(
  run: (ctx: { finance: FakeFinance; inventory: InventoryStore; ipc: ReturnType<typeof fakeIpc>; store: PurchasesStore }) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-purchases-ipc-'))

  try {
    const inventory = new InventoryStore(inventoryStorePath(dir))
    const store = new PurchasesStore(purchasesStorePath(dir))
    const finance = fakeFinance()
    const ipc = fakeIpc()

    registerPurchasesIpc(ipc, { actorOf: async () => ({ id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }), finance, inventory, store })

    return await run({ finance, inventory, ipc, store })
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const item = (over: Record<string, unknown> = {}) => ({ product_sku: 'CAF-500', quantity: 10, unit_cost_cents: 1000, ...over })
const pedido = (over: Record<string, unknown> = {}) => ({ items: [item()], supplier_id: 'sup_1', ...over })

describe('IPC de compras', () => {
  // r190: eram cinco canais; cotacao entrou para comparar fornecedores antes de comprar (GOAL 15).
  // r199: os tres canais de cotacao gravada entraram para a proposta sobreviver ao fechar a tela.
  // O teste continua sendo a lista FECHADA de canais: protege contra canal acidental, nao um numero.
  // Atualizado com a razao escrita, nao afrouxado para toContain.
  // nao um numero especifico. Atualizado com a razao, nao afrouxado para 	oContain.
  it('registra exatamente os canais de compras', async () => {
    await withDepot(async ({ ipc }) => {
      // r26: provar fecha o beco sem saida da r25 — a recusa provacao_necessaria nao tinha
      // como ser resolvida. O canal nasceu COM guarda (exigirAtor) e o ratchet o confirmou.
      expect(ipc.channels()).toEqual([
        'hermes:purchases:aprovar',
        'hermes:purchases:cotacao',
        'hermes:purchases:definirLimite',
        'hermes:purchases:limite',
        'hermes:purchases:orders',
        'hermes:purchases:quotations',
        'hermes:purchases:receive',
        'hermes:purchases:removeQuotation',
        'hermes:purchases:saveOrder',
        'hermes:purchases:saveQuotation',
        'hermes:purchases:saveSupplier',
        'hermes:purchases:suppliers'
      ])
    })
  })

  it('cadastra fornecedor e devolve a lista', async () => {
    await withDepot(async ({ ipc }) => {
      const r = (await ipc.invoke('hermes:purchases:saveSupplier', { name: 'Distribuidora Café' })) as {
        supplier: Supplier
        suppliers: Supplier[]
      }

      expect(r.supplier.name).toBe('Distribuidora Café')
      expect(r.suppliers).toHaveLength(1)
    })
  })

  it('RECEBER entra mercadoria no estoque', async () => {
    await withDepot(async ({ inventory, ipc }) => {
      expect(await inventory.balances()).toEqual({})

      const r = (await ipc.invoke('hermes:purchases:receive', pedido())) as ReceiveResult

      expect('order' in r).toBe(true)
      if (!('order' in r)) return

      expect(r.order.status).toBe('recebido')
      expect(r.stock).toHaveLength(1)
      expect(await inventory.balances()).toEqual({ 'CAF-500': 10000 })
    })
  })

  it('receber duas vezes nao entra mercadoria duas vezes', async () => {
    await withDepot(async ({ inventory, ipc }) => {
      const primeira = (await ipc.invoke('hermes:purchases:receive', pedido())) as { order: PurchaseOrder }

      expect(await inventory.balances()).toEqual({ 'CAF-500': 10000 })

      // Mesmo pedido (mesmo id): o segundo recebimento é recusado porque o pedido já está recebido.
      const segunda = (await ipc.invoke('hermes:purchases:receive', { ...pedido(), id: primeira.order.id })) as ReceiveResult

      expect(segunda).toEqual({ error: 'pedido_recebido_imutavel' })
      expect(await inventory.balances()).toEqual({ 'CAF-500': 10000 })
    })
  })

  it('pedido salvo sem receber NAO move o estoque', async () => {
    await withDepot(async ({ inventory, ipc }) => {
      await ipc.invoke('hermes:purchases:saveOrder', pedido())

      expect(await inventory.balances()).toEqual({})
    })
  })

  it('propaga erro de validacao como valor', async () => {
    await withDepot(async ({ ipc }) => {
      await expect(ipc.invoke('hermes:purchases:saveOrder', { items: [] })).resolves.toEqual({ error: 'supplier_required' })
      await expect(ipc.invoke('hermes:purchases:receive', { supplier_id: 'x', items: [] })).resolves.toEqual({
        error: 'items_required'
      })
      await expect(ipc.invoke('hermes:purchases:saveSupplier', { name: '' })).resolves.toEqual({ error: 'name_required' })
    })
  })
})

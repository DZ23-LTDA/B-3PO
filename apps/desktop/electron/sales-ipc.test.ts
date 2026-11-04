import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CatalogStore, catalogStorePath } from './catalog-store'
import { FinanceStore, financeStorePath } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { SalesStore, salesStorePath, type Sale } from './sales-store'
import { registerSalesIpc, stockShortage, type FaturarResult } from './sales-ipc'

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

async function withErp<T>(
  run: (erp: { catalog: CatalogStore; finance: FinanceStore; inventory: InventoryStore; sales: SalesStore; ipc: ReturnType<typeof fakeIpc> }) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-sales-ipc-'))

  try {
    const catalog = new CatalogStore(catalogStorePath(dir))
    const finance = new FinanceStore(financeStorePath(dir))
    const inventory = new InventoryStore(inventoryStorePath(dir))
    const sales = new SalesStore(salesStorePath(dir))
    const ipc = fakeIpc()

    registerSalesIpc(ipc, { finance, inventory, sales })

    return await run({ catalog, finance, inventory, ipc, sales })
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const item = (over: Record<string, unknown> = {}) => ({
  product_sku: 'CAF-500',
  quantity: 3,
  unit_price_cents: 2490,
  ...over
})

const venda = (over: Record<string, unknown> = {}) => ({ items: [item()], ...over })

describe('faturamento: validacao antes de gravar', () => {
  it('detecta o SKU sem saldo', async () => {
    await withErp(async ({ inventory }) => {
      await inventory.append({ kind: 'entrada', product_sku: 'CAF-500', quantity: 2 })

      const erp = await inventory.balances()
      const vendaSimulada: Sale = {
        contact_phone: '', created_at: 1, currency: 'BRL', id: 's1', items: [
          { description: '', discount_cents: 0, product_sku: 'CAF-500', quantity_milli: 5000, total_cents: 0, unit_price_cents: 1000 }
        ], notes: '', number: 1, status: 'faturado', tenant_id: 'local', total_cents: 0, updated_at: 1
      }

      expect(stockShortage(vendaSimulada, erp)).toBe('CAF-500')
    })
  })

  it('soma linhas do mesmo SKU antes de comparar com o saldo', () => {
    const vendaSimulada: Sale = {
      contact_phone: '', created_at: 1, currency: 'BRL', id: 's1', items: [
        { description: '', discount_cents: 0, product_sku: 'X', quantity_milli: 6000, total_cents: 0, unit_price_cents: 100 },
        { description: '', discount_cents: 0, product_sku: 'X', quantity_milli: 6000, total_cents: 0, unit_price_cents: 100 }
      ], notes: '', number: 1, status: 'faturado', tenant_id: 'local', total_cents: 0, updated_at: 1
    }

    // 6 + 6 = 12 > 10 disponiveis, mesmo que cada linha isolada caiba.
    expect(stockShortage(vendaSimulada, { X: 10000 })).toBe('X')
    expect(stockShortage(vendaSimulada, { X: 12000 })).toBeNull()
  })
})

describe('faturamento: os tres dominios juntos', () => {
  it('fatura, baixa o estoque e lanca a receita', async () => {
    await withErp(async ({ finance, inventory, ipc }) => {
      await inventory.append({ kind: 'entrada', product_sku: 'CAF-500', quantity: 10 })

      const r = (await ipc.invoke('hermes:sales:faturar', venda())) as FaturarResult

      expect('sale' in r).toBe(true)
      if (!('sale' in r)) return

      expect(r.sale.status).toBe('faturado')
      expect(r.sale.total_cents).toBe(7470)
      expect(r.stock).toHaveLength(1)
      expect(r.finance?.amount_cents).toBe(7470)

      expect(await inventory.balances()).toEqual({ 'CAF-500': 7000 })
      expect((await finance.totals()).openReceivableCents).toBe(7470)
    })
  })

  it('recusa ANTES de gravar quando falta estoque: a venda nao existe depois', async () => {
    await withErp(async ({ finance, inventory, ipc, sales }) => {
      await inventory.append({ kind: 'entrada', product_sku: 'CAF-500', quantity: 1 })

      const r = (await ipc.invoke('hermes:sales:faturar', venda({ items: [item({ quantity: 5 })] }))) as FaturarResult

      expect(r).toEqual({ error: 'saldo_insuficiente', message: 'CAF-500' })
      // Nada foi criado: nem venda, nem receita, e o saldo continua intacto.
      expect(await sales.list()).toHaveLength(0)
      expect(await finance.list()).toHaveLength(0)
      expect(await inventory.balances()).toEqual({ 'CAF-500': 1000 })
      expect(await inventory.list()).toHaveLength(1)
    })
  })

  it('repetir o faturamento nao duplica estoque nem receita', async () => {
    await withErp(async ({ finance, inventory, ipc }) => {
      await inventory.append({ kind: 'entrada', product_sku: 'CAF-500', quantity: 10 })

      const primeira = (await ipc.invoke('hermes:sales:faturar', venda())) as FaturarResult

      expect('sale' in primeira).toBe(true)
      if (!('sale' in primeira)) return

      // Mesma venda (mesmo id) faturada de novo: as refs deterministicas barram a duplicacao.
      const segunda = (await ipc.invoke('hermes:sales:faturar', { ...venda(), id: primeira.sale.id })) as FaturarResult

      expect(await inventory.balances()).toEqual({ 'CAF-500': 7000 })
      expect((await finance.totals()).openReceivableCents).toBe(7470)
      expect('error' in segunda || segunda.sale.id === primeira.sale.id).toBe(true)
    })
  })

  it('orcamento nao move estoque nem financeiro', async () => {
    await withErp(async ({ finance, inventory, ipc }) => {
      await inventory.append({ kind: 'entrada', product_sku: 'CAF-500', quantity: 10 })

      const r = (await ipc.invoke('hermes:sales:create', venda())) as { sale: Sale }

      expect(r.sale.status).toBe('orcamento')
      expect(await inventory.balances()).toEqual({ 'CAF-500': 10000 })
      expect(await finance.list()).toHaveLength(0)
    })
  })

  it('faturar sem produto no estoque e recusado com o SKU faltante', async () => {
    await withErp(async ({ ipc }) => {
      const r = (await ipc.invoke('hermes:sales:faturar', venda())) as FaturarResult

      expect(r).toEqual({ error: 'saldo_insuficiente', message: 'CAF-500' })
    })
  })
})

describe('vendas: canais e ciclo', () => {
  it('registra os quatro canais', async () => {
    await withErp(async ({ ipc }) => {
      expect(ipc.channels()).toEqual([
        'hermes:sales:cancel',
        'hermes:sales:create',
        'hermes:sales:faturar',
        'hermes:sales:list'
      ])
    })
  })

  it('cancela um orcamento e mantem no historico', async () => {
    await withErp(async ({ ipc }) => {
      const criada = (await ipc.invoke('hermes:sales:create', venda())) as { sale: Sale }
      const r = (await ipc.invoke('hermes:sales:cancel', criada.sale.id, undefined, 'cliente desistiu')) as {
        sales: Sale[]
      }

      expect(r.sales[0]!.status).toBe('cancelado')
    })
  })

  it('propaga erro de validacao como valor', async () => {
    await withErp(async ({ ipc }) => {
      await expect(ipc.invoke('hermes:sales:faturar', { items: [] })).resolves.toEqual({ error: 'items_required' })
      await expect(ipc.invoke('hermes:sales:create', { items: [{ quantity: 1 }] })).resolves.toEqual({
        error: 'item_sem_identidade'
      })
    })
  })
})

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_TENANT } from './catalog-store'
import {
  PurchasesStore,
  isPurchaseStatus,
  itemTotal,
  normalizePurchase,
  normalizeSupplier,
  parsePurchases,
  purchasesStorePath,
  stockMovementsFor,
  type PurchaseOrder
} from './purchases-store'

async function withStore<T>(run: (store: PurchasesStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-purchases-'))

  try {
    return await run(new PurchasesStore(purchasesStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const fornecedor = (over: Record<string, unknown> = {}) => ({ name: 'Distribuidora Café', ...over })
const item = (over: Record<string, unknown> = {}) => ({ product_sku: 'CAF-500', quantity: 10, unit_cost_cents: 1000, ...over })
const pedido = (over: Record<string, unknown> = {}) => ({ items: [item()], supplier_id: 'sup_1', ...over })

describe('fornecedores', () => {
  it('exige nome e normaliza CNPJ para digitos', () => {
    expect(normalizeSupplier({ name: ' ' }, 1)).toEqual({ error: 'name_required' })

    const criado = normalizeSupplier(fornecedor({ cnpj: '12.345.678/0001-90' }), 1)

    expect('supplier' in criado && criado.supplier.cnpj).toBe('12345678000190')
  })

  it('recusa fornecedor com o mesmo nome na empresa', async () => {
    await withStore(async store => {
      expect('suppliers' in (await store.upsertSupplier(fornecedor()))).toBe(true)
      expect(await store.upsertSupplier(fornecedor({ email: 'x@y.com' }))).toEqual({ error: 'fornecedor_duplicado' })
    })
  })

  it('lista fornecedores por nome, so da empresa', async () => {
    await withStore(async store => {
      await store.upsertSupplier(fornecedor({ name: 'Zeta' }))
      await store.upsertSupplier(fornecedor({ name: 'Alfa' }))
      await store.upsertSupplier(fornecedor({ name: 'Outra empresa', tenant_id: 'empresa-b' }))

      expect((await store.suppliers()).map(s => s.name)).toEqual(['Alfa', 'Zeta'])
      expect(await store.suppliers('empresa-b')).toHaveLength(1)
    })
  })
})

describe('pedido de compra', () => {
  it('exige fornecedor e ao menos um item', () => {
    expect(normalizePurchase({ items: [item()] }, 1)).toEqual({ error: 'supplier_required' })
    expect(normalizePurchase({ supplier_id: 'sup_1', items: [] }, 1)).toEqual({ error: 'items_required' })
    expect(normalizePurchase({ supplier_id: 'sup_1', items: [{ quantity: 1 }] }, 1)).toEqual({ error: 'item_sem_sku' })
    expect(normalizePurchase({ supplier_id: 'sup_1', items: [item({ quantity: 0 })] }, 1)).toEqual({
      error: 'item_quantity_required'
    })
  })

  it('calcula o total dos itens e IGNORA o total do chamador', () => {
    const criado = normalizePurchase({ supplier_id: 'sup_1', items: [item()], total_cents: 1 }, 1)

    expect('order' in criado && criado.order.total_cents).toBe(10000)
    expect(itemTotal(10000, 1000)).toBe(10000)
  })

  it('quantity_milli nao e reconvertido', () => {
    const criado = normalizePurchase({ supplier_id: 'sup_1', items: [{ product_sku: 'X', quantity_milli: 3000, unit_cost_cents: 1000 }] }, 1)

    expect('order' in criado && criado.order.items[0]!.quantity_milli).toBe(3000)
    expect('order' in criado && criado.order.total_cents).toBe(3000)
  })

  it('numera sequencialmente e preserva created_at ao editar', async () => {
    await withStore(async store => {
      const a = await store.saveOrder(pedido({ created_at: 1000 }))
      const b = await store.saveOrder(pedido({ notes: 'segundo' }))

      expect('order' in a && a.order.number).toBe(1)
      expect('order' in b && b.order.number).toBe(2)

      if (!('order' in a)) return

      await store.saveOrder({ ...pedido({ notes: 'editado' }), id: a.order.id })

      const lista = await store.orders()

      expect(lista.find(o => o.id === a.order.id)?.created_at).toBe(1000)
      expect(lista.find(o => o.id === a.order.id)?.number).toBe(1)
    })
  })

  it('pedido recebido e imutavel', async () => {
    await withStore(async store => {
      const criado = await store.saveOrder(pedido({ status: 'recebido' }))

      expect('order' in criado).toBe(true)
      if (!('order' in criado)) return

      expect(await store.saveOrder({ ...pedido({ notes: 'x' }), id: criado.order.id })).toEqual({
        error: 'pedido_recebido_imutavel'
      })
    })
  })

  it('trata arquivo corrompido como vazio', () => {
    expect(parsePurchases('nao e json')).toEqual({ limite: { aprovadores: [], cents: null }, orders: [], schema_version: 1, solicitacoes: [], suppliers: [] })
    expect(isPurchaseStatus('recebido')).toBe(true)
    expect(isPurchaseStatus('pago')).toBe(false)
  })
})

describe('integracao com o estoque', () => {
  it('so pedido recebido gera entrada', () => {
    const rascunho = normalizePurchase(pedido(), 1)

    expect('order' in rascunho && stockMovementsFor({ ...rascunho.order, number: 1 })).toEqual([])

    const recebido = normalizePurchase(pedido({ status: 'recebido' }), 1)

    expect('order' in recebido).toBe(true)
    if (!('order' in recebido)) return

    const pedidoCompleto = { ...recebido.order, number: 5 }
    const movimentos = stockMovementsFor(pedidoCompleto)

    expect(movimentos).toHaveLength(1)
    expect(movimentos[0]).toMatchObject({
      kind: 'entrada',
      product_sku: 'CAF-500',
      quantity_milli: 10000,
      ref: `compra:${pedidoCompleto.id}:CAF-500`
    })
    // Ref determinística: receber de novo não entra duas vezes.
    expect(stockMovementsFor(pedidoCompleto).map(m => m.ref)).toEqual(movimentos.map(m => m.ref))
  })

  it('cancelado nao movimenta estoque', () => {
    const cancelado = normalizePurchase(pedido({ status: 'cancelado' }), 1)

    expect('order' in cancelado && stockMovementsFor({ ...(cancelado as { order: PurchaseOrder }).order, number: 1 })).toEqual([])
  })
})

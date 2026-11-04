import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_TENANT } from './catalog-store'
import {
  SalesStore,
  isSaleStatus,
  itemTotal,
  normalizeSale,
  parseSales,
  saleTotal,
  salesStorePath,
  stockMovementsFor
} from './sales-store'

async function withStore<T>(run: (store: SalesStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-sales-'))

  try {
    return await run(new SalesStore(salesStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const item = (over: Record<string, unknown> = {}) => ({
  product_sku: 'CAF-500',
  quantity: 2,
  unit_price_cents: 1000,
  ...over
})

const venda = (over: Record<string, unknown> = {}) => ({ items: [item()], ...over })

describe('vendas: total derivado dos itens', () => {
  it('exige ao menos um item', () => {
    expect(normalizeSale({ items: [] }, 1)).toEqual({ error: 'items_required' })
    expect(normalizeSale({}, 1)).toEqual({ error: 'items_required' })
  })

  it('exige identidade e quantidade em cada item', () => {
    expect(normalizeSale({ items: [{ quantity: 1 }] }, 1)).toEqual({ error: 'item_sem_identidade' })
    expect(normalizeSale({ items: [{ product_sku: 'X', quantity: 0 }] }, 1)).toEqual({ error: 'item_quantity_required' })
    expect(normalizeSale({ items: [{ product_sku: 'X', quantity: -1 }] }, 1)).toEqual({ error: 'item_quantity_required' })
  })

  it('multiplica quantidade por preço e aplica desconto', () => {
    expect(itemTotal(2000, 1000, 0)).toBe(2000)
    expect(itemTotal(2000, 1000, 100)).toBe(1900)
    expect(itemTotal(1500, 1000, 0)).toBe(1500)
  })

  it('recusa desconto maior que o item', () => {
    expect(normalizeSale({ items: [item({ discount_cents: 5000 })] }, 1)).toEqual({ error: 'desconto_maior_que_item' })
  })

  it('IGNORA o total enviado pelo chamador — a tela não define quanto o cliente paga', () => {
    const adulterada = normalizeSale({ items: [item()], total_cents: 1 }, 1)
    const normal = normalizeSale(venda(), 1)

    expect('sale' in adulterada && adulterada.sale.total_cents).toBe(2000)
    expect('sale' in normal && normal.sale.total_cents).toBe(2000)
  })

  it('soma o total de vários itens', () => {
    const criada = normalizeSale(
      { items: [item({ quantity: 2, unit_price_cents: 1000 }), item({ product_sku: 'CHA', quantity: 1, unit_price_cents: 500 })] },
      1
    )

    expect('sale' in criada && criada.sale.total_cents).toBe(2500)
    expect('sale' in criada && saleTotal(criada.sale.items)).toBe(2500)
  })
})

describe('vendas: persistência e ciclo de vida', () => {
  it('numera sequencialmente por empresa, a partir de 1', async () => {
    await withStore(async store => {
      const primeira = await store.create(venda())
      const segunda = await store.create(venda())

      expect('sale' in primeira && primeira.sale.number).toBe(1)
      expect('sale' in segunda && segunda.sale.number).toBe(2)
    })
  })

  it('separa numeração e listagem por empresa', async () => {
    await withStore(async store => {
      await store.create(venda({ tenant_id: 'empresa-a' }))
      await store.create(venda({ tenant_id: 'empresa-b' }))

      const daB = await store.list('empresa-b')

      expect(daB).toHaveLength(1)
      expect(daB[0]!.number).toBe(1)
      expect(await store.list()).toHaveLength(0)
    })
  })

  it('cancelar muda o estado e mantém a venda no histórico', async () => {
    await withStore(async store => {
      const criada = await store.create(venda())
      const id = 'sale' in criada ? criada.sale.id : ''

      const cancelada = await store.cancel(id, DEFAULT_TENANT, 'cliente desistiu')

      expect('sales' in cancelada && cancelada.sales[0]!.status).toBe('cancelado')
      expect('sales' in cancelada && cancelada.sales[0]!.notes).toContain('cliente desistiu')
      expect(await store.list()).toHaveLength(1)
    })
  })

  it('cancelar venda de outra empresa não a alcança', async () => {
    await withStore(async store => {
      const criada = await store.create(venda({ tenant_id: 'empresa-a' }))
      const id = 'sale' in criada ? criada.sale.id : ''

      expect(await store.cancel(id, 'empresa-b')).toEqual({ error: 'venda_nao_encontrada' })
    })
  })

  it('venda faturada é imutável: nem editar, nem cancelar', async () => {
    await withStore(async store => {
      const criada = await store.create(venda({ status: 'faturado' }))
      const id = 'sale' in criada ? criada.sale.id : ''

      expect(await store.create({ ...venda(), id })).toEqual({ error: 'venda_faturada_imutavel' })
      expect(await store.cancel(id)).toEqual({ error: 'venda_faturada_imutavel' })
    })
  })

  it('trata arquivo corrompido como vazio', () => {
    expect(parseSales('nao e json')).toEqual({ sales: [], schema_version: 1 })
  })

  it('descarta venda sem id, sem número ou com status inválido', () => {
    const valida = {
      contact_phone: '',
      created_at: 1,
      currency: 'BRL',
      id: 'sale_1',
      items: [],
      notes: '',
      number: 1,
      status: 'orcamento' as const,
      tenant_id: DEFAULT_TENANT,
      total_cents: 0,
      updated_at: 1
    }
    const conteudo = JSON.stringify({
      sales: [valida, { ...valida, id: 2 }, { ...valida, id: 's2', number: 'um' }, { ...valida, id: 's3', status: 'pago' }],
      schema_version: 1
    })

    expect(parseSales(conteudo).sales).toHaveLength(1)
    expect(isSaleStatus('faturado')).toBe(true)
    expect(isSaleStatus('pago')).toBe(false)
  })
})

describe('vendas: integração com o estoque', () => {
  it('orçamento e pedido ainda não baixam estoque', () => {
    const orcamento = normalizeSale(venda({ status: 'orcamento' }), 1)

    expect('sale' in orcamento && stockMovementsFor({ ...orcamento.sale, number: 1 })).toEqual([])
  })

  it('venda faturada gera saída por item de produto, com ref idempotente', () => {
    const faturada = normalizeSale(
      { items: [item({ product_sku: 'CAF-500', quantity: 3 }), item({ product_sku: 'CHA', quantity: 1 })], status: 'faturado' },
      1
    )

    expect('sale' in faturada).toBe(true)
    if (!('sale' in faturada)) return

    const sale = { ...faturada.sale, number: 7 }
    const movimentos = stockMovementsFor(sale)

    expect(movimentos).toHaveLength(2)
    expect(movimentos[0]).toMatchObject({
      kind: 'saida',
      product_sku: 'CAF-500',
      quantity_milli: 3000,
      ref: `venda:${sale.id}:CAF-500`
    })
    // A ref é determinística: faturar de novo o mesmo pedido não baixa de novo.
    expect(stockMovementsFor(sale).map(m => m.ref)).toEqual(movimentos.map(m => m.ref))
  })

  it('item sem SKU (serviço) não movimenta estoque', () => {
    const faturada = normalizeSale({ items: [{ description: 'Consultoria', quantity: 1, unit_price_cents: 50000 }], status: 'faturado' }, 1)

    expect('sale' in faturada && stockMovementsFor({ ...faturada.sale, number: 1 })).toEqual([])
  })
})

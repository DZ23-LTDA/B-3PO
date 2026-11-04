import { describe, expect, it } from 'vitest'

import {
  draftPrice,
  draftQuantity,
  draftTotal,
  itemEstimate,
  listSales,
  salePayload,
  salesAvailable,
  saveSale
} from './sales'

describe('vendas no renderer', () => {
  it('sem bridge, nao inventa nada', async () => {
    expect(salesAvailable()).toBe(false)
    expect(await listSales()).toEqual([])
    expect(await saveSale({}, false)).toEqual({ error: 'vendas_indisponivel' })
  })

  it('estima a linha e o total sem depender do main', () => {
    expect(itemEstimate(3000, 2490)).toBe(7470)
    expect(itemEstimate(1500, 1000)).toBe(1500)
    expect(itemEstimate(0, 100)).toBe(0)
    expect(itemEstimate(Number.NaN, 100)).toBe(0)
    expect(draftTotal([{ quantityMilli: 3000, unitPriceCents: 2490 }, { quantityMilli: 1000, unitPriceCents: 500 }])).toBe(
      7470 + 500
    )
  })

  it('converte as quantidades e precos que a loja digita', () => {
    expect(draftQuantity('2')).toBe(2000)
    expect(draftQuantity('1,5')).toBe(1500)
    expect(draftQuantity('')).toBe(0)
    expect(draftPrice('24,90')).toBe(2490)
    expect(draftPrice('1.234,56')).toBe(123456)
    expect(draftPrice('abc')).toBe(0)
  })

  it('o payload NUNCA leva total: o main recalcula', () => {
    const payload = salePayload([{ productSku: 'CAF-500', quantityMilli: 3000, unitPriceCents: 2490 }], '  +5511  ')

    expect(payload).toEqual({
      contact_phone: '+5511',
      items: [{ product_sku: 'CAF-500', quantity_milli: 3000, unit_price_cents: 2490 }]
    })
    expect(payload).not.toHaveProperty('total_cents')
    expect(payload).not.toHaveProperty('status')
  })
})

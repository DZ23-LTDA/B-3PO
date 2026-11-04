// Fechamento de caixa (rodada 116).
//
// O que estes testes travam: o recorte usa `created_at` (venda de ontem corrigida hoje continua de ontem),
// só faturada entra no faturamento, e ticket médio sem venda é `null`, não zero.

import { describe, expect, it } from 'vitest'

import { fechamentoDoDia } from './pdv-caixa'
import type { Sale } from './sales-store'

const DIA = 86_400_000
const BASE = 1_700_000_000_000
const PERIODO = { ate: BASE + DIA, de: BASE }

function venda(over: Partial<Sale> = {}): Sale {
  return {
    contact_phone: '',
    created_at: BASE + 1000,
    currency: 'BRL',
    id: 'v1',
    items: [{ description: 'X', discount_cents: 0, product_sku: 'SKU-1', quantity_milli: 1000, total_cents: 5000, unit_price_cents: 5000 }],
    notes: '',
    number: 1,
    status: 'faturado',
    tenant_id: 'local',
    total_cents: 5000,
    updated_at: BASE + 1000,
    ...over
  } as Sale
}

describe('fechamentoDoDia', () => {
  it('soma so as vendas FATURADAS', () => {
    const f = fechamentoDoDia(
      [
        venda({ id: 'a', total_cents: 5000 }),
        venda({ id: 'b', status: 'orcamento', total_cents: 99000 }),
        venda({ id: 'c', status: 'cancelado', total_cents: 77000 })
      ],
      PERIODO
    )

    expect(f.total_cents).toBe(5000)
    expect(f.quantidade).toBe(1)
    // As outras aparecem na contagem por situacao, nao no faturamento.
    expect(f.por_situacao).toEqual({ cancelado: 1, faturado: 1, orcamento: 1 })
    expect(f.vendas_no_periodo).toBe(3)
  })

  it('ticket medio e NULL sem venda, nao zero', () => {
    // Zero dividido por zero nao e zero: e indefinido. R$ 0,00 sugeriria "vendeu barato".
    expect(fechamentoDoDia([], PERIODO).ticket_medio_cents).toBeNull()
    expect(fechamentoDoDia([venda({ status: 'orcamento' })], PERIODO).ticket_medio_cents).toBeNull()
  })

  it('calcula o ticket medio', () => {
    const f = fechamentoDoDia(
      [venda({ id: 'a', total_cents: 10000 }), venda({ id: 'b', total_cents: 20000 })],
      PERIODO
    )

    expect(f.ticket_medio_cents).toBe(15000)
  })

  it('arredonda o ticket medio para o centavo', () => {
    const f = fechamentoDoDia(
      [venda({ id: 'a', total_cents: 10000 }), venda({ id: 'b', total_cents: 10001 }), venda({ id: 'c', total_cents: 10001 })],
      PERIODO
    )

    // 30002 / 3 = 10000.666... -> 10001
    expect(f.ticket_medio_cents).toBe(10001)
    expect(Number.isInteger(f.ticket_medio_cents)).toBe(true)
  })

  it('recorta por created_at, nao por updated_at', () => {
    // Venda de ontem corrigida hoje continua sendo venda de ontem: o caixa de ontem nao pode
    // mudar depois de fechado.
    const f = fechamentoDoDia(
      [venda({ created_at: BASE - 10 * DIA, updated_at: BASE + 1000, total_cents: 5000 })],
      PERIODO
    )

    expect(f.total_cents).toBe(0)
    expect(f.vendas_no_periodo).toBe(0)
  })

  it('inclui as bordas do periodo', () => {
    const f = fechamentoDoDia([venda({ created_at: BASE }), venda({ created_at: PERIODO.ate, id: 'b' })], PERIODO)

    expect(f.vendas_no_periodo).toBe(2)
  })

  it('agrega por SKU e ordena por faturamento', () => {
    const f = fechamentoDoDia(
      [
        venda({
          items: [
            { description: 'A', discount_cents: 0, product_sku: 'A', quantity_milli: 1000, total_cents: 1000, unit_price_cents: 1000 },
            { description: 'B', discount_cents: 0, product_sku: 'B', quantity_milli: 3000, total_cents: 9000, unit_price_cents: 3000 }
          ],
          total_cents: 10000
        })
      ],
      PERIODO
    )

    expect(f.produtos.map(p => p.product_sku)).toEqual(['B', 'A'])
    expect(f.produtos[0]!.quantity_milli).toBe(3000)
  })

  it('o mesmo SKU em vendas diferentes soma', () => {
    const f = fechamentoDoDia(
      [venda({ id: 'a', items: [{ description: 'X', discount_cents: 0, product_sku: 'X', quantity_milli: 1000, total_cents: 500, unit_price_cents: 500 }], total_cents: 500 }),
       venda({ id: 'b', items: [{ description: 'X', discount_cents: 0, product_sku: 'X', quantity_milli: 2000, total_cents: 1000, unit_price_cents: 500 }], total_cents: 1000 })],
      PERIODO
    )

    expect(f.produtos).toHaveLength(1)
    expect(f.produtos[0]!.quantity_milli).toBe(3000)
    expect(f.produtos[0]!.total_cents).toBe(1500)
  })

  it('quebra por forma de pagamento', () => {
    const f = fechamentoDoDia(
      [
        venda({ id: 'a', payment_method: 'dinheiro', total_cents: 3000 }),
        venda({ id: 'b', payment_method: 'pix', total_cents: 7000 }),
        venda({ id: 'c', payment_method: 'dinheiro', total_cents: 2000 })
      ],
      PERIODO
    )

    expect(f.por_forma_pagamento).toEqual([
      { forma: 'pix', quantidade: 1, total_cents: 7000 },
      { forma: 'dinheiro', quantidade: 2, total_cents: 5000 }
    ])
  })

  it('venda sem forma informada aparece como nao_informado, nao some', () => {
    // Esconder faria a soma das formas nao fechar com o total, e o operador procuraria a diferenca
    // na gaveta.
    const f = fechamentoDoDia([venda({ id: 'a', payment_method: 'pix', total_cents: 1000 }), venda({ id: 'b', total_cents: 5000 })], PERIODO)

    expect(f.por_forma_pagamento).toEqual([
      { forma: 'nao_informado', quantidade: 1, total_cents: 5000 },
      { forma: 'pix', quantidade: 1, total_cents: 1000 }
    ])
    // A soma das formas bate com o faturamento: nada ficou de fora.
    expect(f.por_forma_pagamento.reduce((s, x) => s + x.total_cents, 0)).toBe(f.total_cents)
  })

  it('nao inventa situacao que nao ocorreu', () => {
    expect(fechamentoDoDia([venda()], PERIODO).por_situacao).toEqual({ faturado: 1 })
  })

  it('periodo vazio devolve zeros honestos', () => {
    const f = fechamentoDoDia([], PERIODO)

    expect(f).toMatchObject({ quantidade: 0, ticket_medio_cents: null, total_cents: 0, vendas_no_periodo: 0 })
    expect(f.produtos).toEqual([])
  })
})

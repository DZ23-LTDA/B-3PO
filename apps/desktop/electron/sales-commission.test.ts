// Comissão sobre venda (rodada 114).
//
// O que estes testes travam: só venda faturada gera comissão, ausência de percentual é `null` e não zero, e
// a conta é inteira — sem centavo perdido por ponto flutuante.

import { describe, expect, it } from 'vitest'

import { BPS_TOTAL, comissaoDaVenda, comissaoTotal, percentualValido } from './sales-commission'
import type { Sale } from './sales-store'

function venda(over: Partial<Sale> = {}): Sale {
  return {
    contact_phone: '5511999998888',
    created_at: 1,
    currency: 'BRL',
    id: 'v1',
    items: [{ description: 'X', discount_cents: 0, product_sku: 'X', quantity_milli: 1000, total_cents: 10000, unit_price_cents: 10000 }],
    notes: '',
    number: 7,
    status: 'faturado',
    tenant_id: 'local',
    total_cents: 10000,
    updated_at: 1,
    ...over
  } as Sale
}

describe('percentualValido', () => {
  it('aceita de 0 a 100%', () => {
    expect(percentualValido(0)).toBe(true)
    expect(percentualValido(500)).toBe(true)
    expect(percentualValido(BPS_TOTAL)).toBe(true)
  })

  it('recusa acima de 100%, negativo, NaN e nao-numero', () => {
    expect(percentualValido(BPS_TOTAL + 1)).toBe(false)
    expect(percentualValido(-1)).toBe(false)
    expect(percentualValido(Number.NaN)).toBe(false)
    expect(percentualValido('500')).toBe(false)
    expect(percentualValido(null)).toBe(false)
  })
})

describe('comissaoDaVenda', () => {
  it('5% de 100 reais sao 5 reais', () => {
    const c = comissaoDaVenda(venda({ total_cents: 10000 }), 500)

    expect(c?.amount_cents).toBe(500)
    expect(c?.base_cents).toBe(10000)
    expect(c?.ref).toBe('venda:v1:comissao')
  })

  it('so venda FATURADA gera comissao', () => {
    // Mesmo criterio da conta a receber e da baixa de estoque: um unico "venda que valeu".
    expect(comissaoDaVenda(venda({ status: 'orcamento' }), 500)).toBeNull()
    expect(comissaoDaVenda(venda({ status: 'pedido' }), 500)).toBeNull()
    expect(comissaoDaVenda(venda({ status: 'cancelado' }), 500)).toBeNull()
    expect(comissaoDaVenda(venda({ status: 'faturado' }), 500)).not.toBeNull()
  })

  it('sem percentual configurado devolve NULL, nao zero', () => {
    // Zero seria "comissao de zero por cento" — uma decisao. Null e "nao ha comissao definida".
    expect(comissaoDaVenda(venda(), null)).toBeNull()
  })

  it('arredonda para o centavo, sem sobra de ponto flutuante', () => {
    // 3% de 3333 = 99,99 -> 100 centavos.
    const c = comissaoDaVenda(venda({ total_cents: 3333 }), 300)

    expect(c?.amount_cents).toBe(100)
    expect(Number.isInteger(c?.amount_cents)).toBe(true)
  })

  it('venda de valor zero nao gera comissao', () => {
    expect(comissaoDaVenda(venda({ total_cents: 0 }), 500)).toBeNull()
  })

  it('100% devolve o total', () => {
    expect(comissaoDaVenda(venda({ total_cents: 12345 }), BPS_TOTAL)?.amount_cents).toBe(12345)
  })

  it('percentual invalido nao gera comissao', () => {
    expect(comissaoDaVenda(venda(), 20_000)).toBeNull()
    expect(comissaoDaVenda(venda(), -100)).toBeNull()
  })
})

describe('comissaoTotal', () => {
  it('soma so as vendas que geram comissao e conta as que ficaram de fora', () => {
    const total = comissaoTotal(
      [
        venda({ id: 'a', total_cents: 10000 }),
        venda({ id: 'b', total_cents: 20000 }),
        venda({ id: 'c', status: 'orcamento', total_cents: 50000 })
      ],
      500
    )

    expect(total.vendas).toBe(2)
    expect(total.total_cents).toBe(1500) // 5% de 100 + 5% de 200
    // A contagem e o que impede o total esconder metade do periodo sem percentual.
    expect(total.sem_comissao).toBe(1)
  })

  it('sem percentual, nada e somado e tudo aparece como sem comissao', () => {
    const total = comissaoTotal([venda({ id: 'a' }), venda({ id: 'b' })], null)

    expect(total.total_cents).toBe(0)
    expect(total.vendas).toBe(0)
    expect(total.sem_comissao).toBe(2)
    expect(total.bps_por_venda).toBe(0)
  })

  it('lista vazia nao quebra', () => {
    expect(comissaoTotal([], 500)).toEqual({ bps_por_venda: 500, sem_comissao: 0, total_cents: 0, vendas: 0 })
  })
})

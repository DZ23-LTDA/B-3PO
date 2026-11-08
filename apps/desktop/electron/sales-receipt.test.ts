// Recibo de venda (rodada 113).
//
// O que estes testes travam: o recibo mostra o valor que o cliente pagou, não um valor recalculado
// diferente; e o desconto é derivado, não aceito do chamador.

import { describe, expect, it } from 'vitest'

import { reciboDaVenda, reciboEmTexto } from './sales-receipt'
import type { Sale } from './sales-store'

function venda(over: Partial<Sale> = {}): Sale {
  return {
    contact_phone: '5511999998888',
    created_at: 1,
    currency: 'BRL',
    id: 'v1',
    items: [
      { description: 'Cafe', discount_cents: 0, product_sku: 'SKU-1', quantity_milli: 2000, total_cents: 10000, unit_price_cents: 5000 },
      { description: 'Leite', discount_cents: 500, product_sku: 'SKU-2', quantity_milli: 1000, total_cents: 4500, unit_price_cents: 5000 }
    ],
    notes: '',
    number: 7,
    status: 'faturado',
    tenant_id: 'local',
    total_cents: 14500,
    updated_at: 1,
    ...over
  } as Sale
}

const formatar = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`

describe('reciboDaVenda', () => {
  it('usa o total que o cliente pagou, nao um recalculo', () => {
    // O total da venda e a fonte; se o recibo recalculasse, poderia divergir do que foi cobrado.
    const r = reciboDaVenda(venda({ total_cents: 12345 }))

    expect(r.total_cents).toBe(12345)
  })

  it('o total de cada linha ja inclui o desconto do item', () => {
    const r = reciboDaVenda(venda())

    expect(r.itens[0]!.total_cents).toBe(10000)
    expect(r.itens[1]!.total_cents).toBe(4500)
  })

  it('o desconto total e derivado, nao pedido ao chamador', () => {
    const r = reciboDaVenda(venda())

    expect(r.desconto_total_cents).toBe(500)
  })

  it('sem desconto, o desconto total e zero', () => {
    const r = reciboDaVenda(
      venda({
        items: [{ description: 'X', discount_cents: 0, product_sku: 'X', quantity_milli: 1000, total_cents: 1000, unit_price_cents: 1000 }]
      })
    )

    expect(r.desconto_total_cents).toBe(0)
  })

  it('usa o nome do produto quando o catalogo resolve, senao o SKU', () => {
    // Recibo com linha em branco e pior que recibo com codigo.
    const r = reciboDaVenda(venda(), { nomes: [{ nome: 'Cafe 500g', sku: 'SKU-1' }] })

    expect(r.itens[0]!.descricao).toBe('Cafe 500g')
    expect(r.itens[1]!.descricao).toBe('SKU-2')
  })

  it('distingue venda faturada de proposta', () => {
    expect(reciboDaVenda(venda()).faturada).toBe(true)
    expect(reciboDaVenda(venda({ status: 'orcamento' })).faturada).toBe(false)
  })

  it('consumidor sem telefone nao aparece como vazio', () => {
    expect(reciboDaVenda(venda({ contact_phone: '' })).cliente).toBe('Consumidor')
  })

  it('normaliza o CNPJ para digitos', () => {
    const r = reciboDaVenda(venda(), { cnpj: '11.222.333/0001-44' })

    expect(r.cnpj).toBe('11222333000144')
  })

  it('a data e injetavel para o teste ser estavel', () => {
    expect(reciboDaVenda(venda(), { now: 1_700_000_000_000 }).emitido_em).toBe(1_700_000_000_000)
  })
})

describe('reciboEmTexto', () => {
  it('monta o texto com itens, desconto e total', () => {
    const texto = reciboEmTexto(reciboDaVenda(venda(), { cnpj: '11222333000144', empresa: 'Loja X', now: 1 }), formatar)

    expect(texto).toContain('Loja X')
    expect(texto).toContain('CNPJ 11222333000144')
    expect(texto).toContain('2× SKU-1')
    expect(texto).toContain('Desconto: R$ 5,00')
    expect(texto).toContain('Total: R$ 145,00')
  })

  it('sem desconto, a linha de desconto nao aparece', () => {
    const r = reciboDaVenda(
      venda({ items: [{ description: 'X', discount_cents: 0, product_sku: 'X', quantity_milli: 1000, total_cents: 1000, unit_price_cents: 1000 }], total_cents: 1000 })
    )

    expect(reciboEmTexto(r, formatar)).not.toContain('Desconto')
  })

  it('diz "proposta" quando nao foi faturada', () => {
    expect(reciboEmTexto(reciboDaVenda(venda({ status: 'orcamento' })), formatar)).toContain('proposta')
  })
})

// Histórico e comparação de fornecedores (rodada 103).
//
// O que estes testes protegem: ausência de dado não virar zero, e a comparação só usar pedido recebido —
// recomendar compra com base em preço de orçamento seria recomendar sobre um número que ninguém honrou.

import { describe, expect, it } from 'vitest'

import { compararPorSku, melhorPrecoPara, resumoPorFornecedor } from './purchases-analytics'
import type { PurchaseOrder, Supplier } from './purchases-store'

const fornecedor = (id: string, name: string): Supplier => ({
  active: true,
  cnpj: '11222333000144',
  created_at: 1,
  email: '',
  id,
  name,
  notes: '',
  phone: '',
  tenant_id: 'local',
  updated_at: 1
})

const pedido = (over: Partial<PurchaseOrder>): PurchaseOrder =>
  ({
    created_at: 1,
    id: 'o1',
    items: [],
    notes: '',
    number: 1,
    status: 'recebido',
    supplier_id: 's1',
    tenant_id: 'local',
    total_cents: 0,
    updated_at: 1,
    ...over
  }) as PurchaseOrder

describe('resumo por fornecedor', () => {
  const fornecedores = [fornecedor('s1', 'Alfa'), fornecedor('s2', 'Beta')]

  it('soma so os pedidos do proprio fornecedor', () => {
    const resumo = resumoPorFornecedor(fornecedores, [
      pedido({ id: 'o1', supplier_id: 's1', total_cents: 1000 }),
      pedido({ id: 'o2', supplier_id: 's1', total_cents: 3000 }),
      pedido({ id: 'o3', supplier_id: 's2', total_cents: 500 })
    ])

    expect(resumo.find(r => r.id === 's1')?.total_cents).toBe(4000)
    expect(resumo.find(r => r.id === 's2')?.total_cents).toBe(500)
  })

  it('separa o que foi negociado do que foi recebido', () => {
    const r = resumoPorFornecedor([fornecedor('s1', 'Alfa')], [
      pedido({ id: 'o1', status: 'pedido', total_cents: 2000 }),
      pedido({ id: 'o2', status: 'recebido', total_cents: 1000 }),
      pedido({ id: 'o3', status: 'cancelado', total_cents: 900 })
    ])[0]!

    expect(r.total_cents).toBe(3900)
    expect(r.received_total_cents).toBe(1000)
    expect(r.order_count).toBe(3)
    expect(r.received_count).toBe(1)
  })

  it('fornecedor sem pedido tem ticket NULL, nao zero', () => {
    // Zero seria "compra de zero reais"; null e "nunca comprei dele". A tela mostra —.
    const r = resumoPorFornecedor([fornecedor('s1', 'Alfa')], [])[0]!

    expect(r.average_cents).toBeNull()
    expect(r.last_order_at).toBeNull()
    expect(r.total_cents).toBe(0)
    expect(r.order_count).toBe(0)
  })

  it('ordena do maior gasto para o menor', () => {
    const resumo = resumoPorFornecedor(fornecedores, [
      pedido({ id: 'o1', supplier_id: 's1', total_cents: 100 }),
      pedido({ id: 'o2', supplier_id: 's2', total_cents: 900 })
    ])

    expect(resumo.map(r => r.name)).toEqual(['Beta', 'Alfa'])
  })
})

describe('comparar por SKU', () => {
  const fornecedores = [fornecedor('s1', 'Alfa'), fornecedor('s2', 'Beta')]

  it('calcula o custo medio unitario por fornecedor, do mais barato ao mais caro', () => {
    const comparacao = compararPorSku('SKU-1', fornecedores, [
      pedido({ id: 'o1', supplier_id: 's1', items: [{ product_sku: 'SKU-1', quantity_milli: 1000, unit_cost_cents: 2000 }] }),
      pedido({ id: 'o2', supplier_id: 's2', items: [{ product_sku: 'SKU-1', quantity_milli: 1000, unit_cost_cents: 1500 }] })
    ])

    expect(comparacao.map(c => c.supplier_name)).toEqual(['Beta', 'Alfa'])
    expect(comparacao[0]!.average_unit_cost_cents).toBe(1500)
  })

  it('so pedido RECEBIDO conta: preco de orcamento nao e preco praticado', () => {
    const comparacao = compararPorSku('SKU-1', fornecedores, [
      pedido({ id: 'o1', supplier_id: 's1', status: 'orcamento', items: [{ product_sku: 'SKU-1', quantity_milli: 1000, unit_cost_cents: 100 }] })
    ])

    expect(comparacao).toEqual([])
  })

  it('ignora outro SKU', () => {
    const comparacao = compararPorSku('SKU-1', fornecedores, [
      pedido({ id: 'o1', supplier_id: 's1', items: [{ product_sku: 'SKU-9', quantity_milli: 1000, unit_cost_cents: 100 }] })
    ])

    expect(comparacao).toEqual([])
  })

  it('melhor preco devolve null quando ninguem entregou o SKU', () => {
    // null e nao "lista vazia com primeiro undefined": a tela precisa distinguir nao-ha-dado.
    expect(melhorPrecoPara('SKU-X', fornecedores, [])).toBeNull()
  })

  it('melhor preco devolve o mais barato quando ha dado', () => {
    const melhor = melhorPrecoPara('SKU-1', fornecedores, [
      pedido({ id: 'o1', supplier_id: 's1', items: [{ product_sku: 'SKU-1', quantity_milli: 1000, unit_cost_cents: 2000 }] }),
      pedido({ id: 'o2', supplier_id: 's2', items: [{ product_sku: 'SKU-1', quantity_milli: 1000, unit_cost_cents: 1200 }] })
    ])

    expect(melhor?.supplier_name).toBe('Beta')
    expect(melhor?.average_unit_cost_cents).toBe(1200)
  })
})

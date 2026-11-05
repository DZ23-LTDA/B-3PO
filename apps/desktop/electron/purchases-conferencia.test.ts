// A conferência no recebimento (r39 do GOAL V2).
//
// O ERRO QUE ESTES TESTES FECHAM
//
// Antes: `stockMovementsFor(order)` usava `order.items[i].quantity_milli`. Um pedido de 100 que chegava
// com 80 entrava com **100** no estoque — sem onde escrever que faltaram 20.
//
// Depois: `aplicarConferencia` ajusta as quantidades antes da entrada, e a divergência é **devolvida**.

import { describe, expect, it } from 'vitest'

import { aplicarConferencia, resumoDaConferencia, totalDivergente } from './purchases-conferencia'
import type { PurchaseOrder } from './purchases-store'

function pedido(itens: { quantity_milli: number; sku: string }[]): PurchaseOrder {
  return {
    created_at: 0,
    id: 'p1',
    items: itens.map(i => ({
      product_sku: i.sku,
      quantity_milli: i.quantity_milli,
      total_cents: 10_000,
      unit_cost_cents: 5_000
    })),
    notes: '',
    number: 7,
    status: 'recebido',
    supplier_id: 's1',
    tenant_id: 'local',
    total_cents: 10_000,
    updated_at: 0
  } as PurchaseOrder
}

describe('sem conferência', () => {
  it('o comportamento é o de antes: o estoque assume o pedido', () => {
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]))

    expect(r.semConferencia).toBe(true)
    expect(r.pedido.items[0]?.quantity_milli).toBe(100_000)
    expect(r.divergencias).toEqual([])
  })

  it('lista vazia também é "sem conferência" — ninguém contou nada, não "nada chegou"', () => {
    // `[]` significa "não houve contagem"; `[{ quantity_milli: 0 }]` significa "não chegou".
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [])

    expect(r.semConferencia).toBe(true)
    expect(r.pedido.items[0]?.quantity_milli).toBe(100_000)
  })
})

describe('o caso que o código antigo errava', () => {
  it('pedido de 100 que chega com 80 entra com 80', () => {
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [
      { quantity_milli: 80_000, sku: 'A' }
    ])

    expect(r.pedido.items[0]?.quantity_milli).toBe(80_000)
    expect(r.semConferencia).toBe(false)
  })

  it('a divergência é REGISTRADA, não só aplicada', () => {
    // Entrar com 80 sem dizer nada é melhor que 100 — mas continua sendo um fato escondido.
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [
      { quantity_milli: 80_000, sku: 'A' }
    ])

    expect(r.divergencias).toEqual([
      { diferenca_milli: -20_000, pedido_milli: 100_000, recebido_milli: 80_000, sku: 'A' }
    ])
  })

  it('chegou MAIS também é divergência', () => {
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [
      { quantity_milli: 120_000, sku: 'A' }
    ])

    expect(r.divergencias[0]?.diferenca_milli).toBe(20_000)
  })

  it('chegou igual: nenhuma divergência', () => {
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [
      { quantity_milli: 100_000, sku: 'A' }
    ])

    expect(r.divergencias).toEqual([])
    expect(r.semConferencia).toBe(false)
  })

  it('zero conferido é "não chegou nada", não "sem conferência"', () => {
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [
      { quantity_milli: 0, sku: 'A' }
    ])

    expect(r.pedido.items[0]?.quantity_milli).toBe(0)
    expect(r.divergencias[0]?.diferenca_milli).toBe(-100_000)
  })
})

describe('as bordas', () => {
  it('item do pedido sem conferência fica com a quantidade PEDIDA', () => {
    // Quem conferiu 1 de 2 itens não quis dizer que o outro não chegou.
    const r = aplicarConferencia(
      pedido([
        { quantity_milli: 100_000, sku: 'A' },
        { quantity_milli: 50_000, sku: 'B' }
      ]),
      [{ quantity_milli: 80_000, sku: 'A' }]
    )

    expect(r.pedido.items[0]?.quantity_milli).toBe(80_000)
    expect(r.pedido.items[1]?.quantity_milli).toBe(50_000)
    expect(r.divergencias).toHaveLength(1)
  })

  it('SKU conferida que não está no pedido é IGNORADA', () => {
    // Criar item a partir da conferência deixaria alguém aumentar o estoque digitando um SKU que ninguém
    // comprou.
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [
      { quantity_milli: 999_000, sku: 'INVENTADO' }
    ])

    expect(r.pedido.items).toHaveLength(1)
    expect(r.pedido.items[0]?.product_sku).toBe('A')
  })

  it('quantidade negativa vira zero — estoque negativo por digitação é pior que a menos', () => {
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [
      { quantity_milli: -5_000, sku: 'A' }
    ])

    expect(r.pedido.items[0]?.quantity_milli).toBe(0)
  })

  it('a mesma SKU duas vezes: a última vence, não a soma', () => {
    // Somar duas leituras do mesmo item dobraria o estoque por um erro de tela.
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [
      { quantity_milli: 60_000, sku: 'A' },
      { quantity_milli: 80_000, sku: 'A' }
    ])

    expect(r.pedido.items[0]?.quantity_milli).toBe(80_000)
  })

  it('o total do pedido NÃO muda com a conferência', () => {
    // O financeiro paga o que foi COMPRADO. Mudar o total aqui esconderia a diferença justamente de quem
    // precisa cobrá-la do fornecedor.
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [
      { quantity_milli: 80_000, sku: 'A' }
    ])

    expect(r.pedido.total_cents).toBe(10_000)
  })

  it('o status continua recebido', () => {
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [
      { quantity_milli: 80_000, sku: 'A' }
    ])

    expect(r.pedido.status).toBe('recebido')
  })
})

describe('o resumo', () => {
  it('sem conferência, diz isso', () => {
    const r = aplicarConferencia(pedido([{ quantity_milli: 1_000, sku: 'A' }]))

    expect(resumoDaConferencia(r)).toContain('sem conferência')
  })

  it('conferido e igual, diz isso', () => {
    const r = aplicarConferencia(pedido([{ quantity_milli: 1_000, sku: 'A' }]), [
      { quantity_milli: 1_000, sku: 'A' }
    ])

    expect(resumoDaConferencia(r)).toContain('exatamente o que foi pedido')
  })

  it('divergência negativa avisa que falta mercadoria', () => {
    const r = aplicarConferencia(pedido([{ quantity_milli: 100_000, sku: 'A' }]), [
      { quantity_milli: 80_000, sku: 'A' }
    ])

    expect(resumoDaConferencia(r)).toContain('Falta mercadoria')
    expect(resumoDaConferencia(r)).toContain('A: -20.000')
  })

  it('totalDivergente soma o que sobrou ou faltou', () => {
    const r = aplicarConferencia(
      pedido([
        { quantity_milli: 100_000, sku: 'A' },
        { quantity_milli: 50_000, sku: 'B' }
      ]),
      [
        { quantity_milli: 80_000, sku: 'A' },
        { quantity_milli: 50_000, sku: 'B' }
      ]
    )

    expect(totalDivergente(r.divergencias)).toBe(-20_000)
  })
})

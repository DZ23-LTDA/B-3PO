// Resumo de cliente para segmentação (rodada 137).
//
// O que estes testes travam: só venda faturada conta, `ultima_compra` é o máximo (não a última do arquivo), e
// contato sem compra entra no resumo — é o público de conversão.

import { describe, expect, it } from 'vitest'

import { resumoDeClientes } from './marketing-summary'
import type { Sale } from './sales-store'

const DIA = 86_400_000
const BASE = 1_700_000_000_000

function venda(over: Partial<Sale> = {}): Sale {
  return {
    contact_phone: '5511999998888',
    created_at: BASE,
    currency: 'BRL',
    id: 'v1',
    items: [{ description: 'X', discount_cents: 0, product_sku: 'X', quantity_milli: 1000, total_cents: 5000, unit_price_cents: 5000 }],
    notes: '',
    number: 1,
    payment_method: 'dinheiro',
    status: 'faturado',
    tenant_id: 'local',
    total_cents: 5000,
    updated_at: BASE,
    ...over
  } as Sale
}

describe('resumoDeClientes', () => {
  it('agrupa por telefone: duas compras viram uma linha', () => {
    const r = resumoDeClientes([venda({ id: 'a', total_cents: 1000 }), venda({ id: 'b', total_cents: 2500 })])

    expect(r).toHaveLength(1)
    expect(r[0]!.compras).toBe(2)
    expect(r[0]!.total_cents).toBe(3500)
  })

  it('so venda FATURADA conta', () => {
    const r = resumoDeClientes([
      venda({ id: 'a' }),
      venda({ id: 'b', status: 'orcamento', total_cents: 99000 }),
      venda({ id: 'c', status: 'cancelado', total_cents: 77000 })
    ])

    expect(r[0]!.compras).toBe(1)
    expect(r[0]!.total_cents).toBe(5000)
  })

  it('ultima_compra e o MAXIMO, nao a ultima do arquivo', () => {
    // A ordem do arquivo nao e garantia de ordem cronologica.
    const r = resumoDeClientes([
      venda({ created_at: BASE + 10 * DIA, id: 'recente' }),
      venda({ created_at: BASE, id: 'antiga' })
    ])

    expect(r[0]!.ultima_compra).toBe(BASE + 10 * DIA)
  })

  it('cliente sem venda aparece com compras 0 e ultima NULL', () => {
    // Zero seria 1970 e faria o cliente parecer "inativo ha 20 mil dias".
    const r = resumoDeClientes([], [{ telefone: '5511888887777' }])

    expect(r).toHaveLength(1)
    expect(r[0]!.compras).toBe(0)
    expect(r[0]!.ultima_compra).toBeNull()
    expect(r[0]!.total_cents).toBe(0)
  })

  it('venda sem telefone nao vira cliente', () => {
    // Balcao anonimo: nao ha a quem atribuir.
    expect(resumoDeClientes([venda({ contact_phone: '' })])).toEqual([])
    expect(resumoDeClientes([venda({ contact_phone: '   ' })])).toEqual([])
  })

  it('contato que ja comprou nao e duplicado', () => {
    const r = resumoDeClientes([venda()], [{ telefone: '5511999998888' }])

    expect(r).toHaveLength(1)
    expect(r[0]!.compras).toBe(1)
  })

  it('tags vem do CRM', () => {
    const r = resumoDeClientes([venda()], [{ tags: ['vip'], telefone: '5511999998888' }])

    expect(r[0]!.tags).toEqual(['vip'])
  })

  it('cliente sem tag fica com lista vazia, nao undefined', () => {
    expect(resumoDeClientes([venda()])[0]!.tags).toEqual([])
  })

  it('telefone com espacos e normalizado', () => {
    const r = resumoDeClientes([venda({ contact_phone: ' 5511999998888 ' })])

    expect(r[0]!.telefone).toBe('5511999998888')
  })

  it('varios clientes ficam separados', () => {
    const r = resumoDeClientes([
      venda({ contact_phone: 'a', id: '1' }),
      venda({ contact_phone: 'b', id: '2' }),
      venda({ contact_phone: 'a', id: '3' })
    ])

    expect(r).toHaveLength(2)
    expect(r.find(c => c.telefone === 'a')!.compras).toBe(2)
    expect(r.find(c => c.telefone === 'b')!.compras).toBe(1)
  })

  it('lista vazia devolve vazio', () => {
    expect(resumoDeClientes([])).toEqual([])
  })
})

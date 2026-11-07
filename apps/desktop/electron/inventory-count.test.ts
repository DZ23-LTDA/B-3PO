// Inventario: contratos (rodada 186).
//
// O GOAL §14 pede "inventarios". A r183 mediu que nao existia. Estes testes fixam a reconciliacao entre a
// contagem fisica e o ledger.

import { describe, expect, it } from 'vitest'

import { movimentosDoInventario, planejarInventario } from './inventory-count'

const saldos = { 'A-1': 10_000, 'B-2': 5_000 }

describe('reconciliacao', () => {
  it('falta gera ajuste de saida', () => {
    const r = planejarInventario([{ contado_milli: 7_000, product_sku: 'A-1' }], saldos)

    expect(r.ajustes).toEqual([
      { diferenca_milli: -3_000, esperado_milli: 10_000, product_sku: 'A-1', tipo: 'saida' }
    ])
  })

  it('sobra gera ajuste de entrada', () => {
    const r = planejarInventario([{ contado_milli: 12_000, product_sku: 'A-1' }], saldos)

    expect(r.ajustes[0]).toMatchObject({ diferenca_milli: 2_000, tipo: 'entrada' })
  })

  it('contagem igual ao saldo NAO gera movimento', () => {
    // Lancamento de quantidade zero poluiria o ledger sem mudar nada.
    const r = planejarInventario([{ contado_milli: 10_000, product_sku: 'A-1' }], saldos)

    expect(r.ajustes).toEqual([])
    expect(r.sem_diferenca).toEqual(['A-1'])
  })

  it('contagem zerada gera saida do saldo inteiro', () => {
    // Zerar o estoque e um inventario legitimo: acabou o produto.
    const r = planejarInventario([{ contado_milli: 0, product_sku: 'A-1' }], saldos)

    expect(r.ajustes[0]).toMatchObject({ diferenca_milli: -10_000, tipo: 'saida' })
  })
})

describe('o que NAO vira ajuste', () => {
  it('SKU sem saldo conhecido vai para invalidas', () => {
    // Pode ser SKU digitado errado: criar entrada criaria estoque de um produto que talvez nao exista.
    const r = planejarInventario([{ contado_milli: 5, product_sku: 'NAO-EXISTE' }], saldos)

    expect(r.ajustes).toEqual([])
    expect(r.invalidas).toContain('NAO-EXISTE')
  })

  it('contagem negativa e invalida', () => {
    // Nao existe -3 unidades fisicas; virar ajuste esconderia o erro de digitacao.
    const r = planejarInventario([{ contado_milli: -3, product_sku: 'A-1' }], saldos)

    expect(r.ajustes).toEqual([])
    expect(r.invalidas).toContain('A-1')
  })

  it('contagem nao numerica e invalida', () => {
    const r = planejarInventario([{ contado_milli: Number.NaN, product_sku: 'A-1' }], saldos)

    expect(r.invalidas).toContain('A-1')
  })

  it('SKU vazio e invalido', () => {
    const r = planejarInventario([{ contado_milli: 10, product_sku: '  ' }], saldos)

    expect(r.invalidas).toContain('(sem sku)')
  })
})

describe('recontagem e ordem', () => {
  it('a ULTIMA contagem do SKU vence', () => {
    // Se o contador recontou, ele quis corrigir o primeiro numero.
    const r = planejarInventario(
      [
        { contado_milli: 1_000, product_sku: 'A-1' },
        { contado_milli: 9_000, product_sku: 'A-1' }
      ],
      saldos
    )

    expect(r.ajustes).toEqual([
      { diferenca_milli: -1_000, esperado_milli: 10_000, product_sku: 'A-1', tipo: 'saida' }
    ])
  })

  it('a lista sai ordenada por SKU, independente da ordem da contagem', () => {
    const r = planejarInventario(
      [
        { contado_milli: 1, product_sku: 'B-2' },
        { contado_milli: 1, product_sku: 'A-1' }
      ],
      saldos
    )

    expect(r.ajustes.map(a => a.product_sku)).toEqual(['A-1', 'B-2'])
  })
})

describe('movimentos prontos para o ledger', () => {
  it('gera movimento com ref deterministico e quantidade absoluta', () => {
    const r = planejarInventario([{ contado_milli: 7_000, product_sku: 'A-1' }], saldos)
    const mov = movimentosDoInventario(r, 'inv-1')

    expect(mov).toEqual([
      {
        kind: 'saida',
        product_sku: 'A-1',
        quantity_milli: 3_000,
        reason: 'inventario',
        ref: 'inventario:inv-1:A-1'
      }
    ])
  })

  it('o mesmo inventario gera a mesma ref duas vezes', () => {
    // E o que faz um retry completar o que faltou em vez de duplicar o ajuste.
    const r = planejarInventario([{ contado_milli: 7_000, product_sku: 'A-1' }], saldos)

    expect(movimentosDoInventario(r, 'inv-1')).toEqual(movimentosDoInventario(r, 'inv-1'))
  })

  it('inventarios diferentes geram refs diferentes', () => {
    const r = planejarInventario([{ contado_milli: 7_000, product_sku: 'A-1' }], saldos)

    expect(movimentosDoInventario(r, 'inv-1')[0]!.ref).not.toBe(movimentosDoInventario(r, 'inv-2')[0]!.ref)
  })

  it('sem diferenca, nenhum movimento', () => {
    const r = planejarInventario([{ contado_milli: 10_000, product_sku: 'A-1' }], saldos)

    expect(movimentosDoInventario(r, 'inv-1')).toEqual([])
  })
})

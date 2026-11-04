import { describe, expect, it } from 'vitest'

import {
  catalogAvailable,
  listProducts,
  marginPercent,
  priceLabel,
  removeProduct,
  saveProduct
} from './catalog'

describe('catalogo no renderer', () => {
  it('sem bridge, nao esta disponivel e nao inventa produto', async () => {
    expect(catalogAvailable()).toBe(false)
    expect(await listProducts()).toEqual([])
    expect(await removeProduct('x')).toEqual([])
    expect(await saveProduct({ name: 'X' })).toEqual({ error: 'catalogo_indisponivel' })
  })

  it('formata preco em pt-BR', () => {
    // O separador de moeda em pt-BR é espaço não-quebrável; normaliza para comparar.
    const semNbsp = (texto: string) => texto.replace(/\s/g, ' ')

    expect(semNbsp(priceLabel(2490))).toBe('R$ 24,90')
    expect(semNbsp(priceLabel(0))).toBe('R$ 0,00')
    // Entrada inválida não vira NaN na tela.
    expect(semNbsp(priceLabel(Number.NaN))).toBe('R$ 0,00')
  })

  it('margem so existe quando ha preco e custo reais', () => {
    expect(marginPercent(1000, 400)).toBe(60)
    expect(marginPercent(2490, 1000)).toBe(60)
    // Sem custo informado não há margem — e não se assume 100%.
    expect(marginPercent(1000, 0)).toBeNull()
    // Preço zero não tem base para percentual.
    expect(marginPercent(0, 100)).toBeNull()
  })
})

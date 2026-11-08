import { describe, expect, it } from 'vitest'

import type { ProductRow } from '@/api/catalog'

import {
  centavosParaTexto,
  draftFrom,
  draftToPayload,
  emptyDraft,
  filterProducts,
  numeroValido,
  textoParaCentavos,
  validateDraft
} from './product-form'

const produto = (over: Partial<ProductRow> = {}): ProductRow => ({
  active: true,
  barcode: '7891000000001',
  category: 'Bebidas',
  cost_cents: 1000,
  created_at: 1,
  id: 'prod_1',
  name: 'Café 500g',
  price_cents: 2490,
  sku: 'CAF-500',
  tenant_id: 'local',
  unit: 'un',
  updated_at: 1,
  ...over
})

describe('formulario de produto', () => {
  it('comeca vazio e com unidade `un`', () => {
    expect(emptyDraft()).toMatchObject({ name: '', sku: '', unit: 'un' })
  })

  it('exige nome e SKU, e aceita preco vazio mas nao preco invalido', () => {
    expect(validateDraft({ ...emptyDraft(), sku: 'X' })).toBe('name_required')
    expect(validateDraft({ ...emptyDraft(), name: 'X' })).toBe('sku_required')
    expect(validateDraft({ ...emptyDraft(), name: 'X', sku: 'X-1' })).toBeNull()
    expect(validateDraft({ ...emptyDraft(), name: 'X', price: 'abc', sku: 'X-1' })).toBe('price_invalid')
    expect(validateDraft({ ...emptyDraft(), cost: 'abc', name: 'X', sku: 'X-1' })).toBe('cost_invalid')
  })

  it('converte texto em centavos nos dois formatos', () => {
    expect(textoParaCentavos('24,90')).toBe(2490)
    expect(textoParaCentavos('24.90')).toBe(2490)
    expect(textoParaCentavos('1.234,56')).toBe(123456)
    expect(textoParaCentavos('')).toBe(0)
    expect(textoParaCentavos('abc')).toBe(0)
  })

  it('converte centavos de volta para texto sem perder centavo', () => {
    expect(centavosParaTexto(2490)).toBe('24,90')
    expect(centavosParaTexto(0)).toBe('')
    expect(centavosParaTexto(Number.NaN)).toBe('')
  })

  it('ida e volta preserva o valor', () => {
    expect(textoParaCentavos(centavosParaTexto(123456))).toBe(123456)
  })

  it('numeroValido reconhece os formatos aceitos pela loja', () => {
    expect(numeroValido('24,90')).toBe(true)
    expect(numeroValido('24.90')).toBe(true)
    expect(numeroValido('  ')).toBe(false)
    expect(numeroValido('abc')).toBe(false)
  })

  it('monta o payload em centavos, sem enviar total e preservando o id ao editar', () => {
    const payload = draftToPayload({ ...emptyDraft(), name: ' Café ', price: '24,90', sku: ' CAF-500 ' })

    expect(payload).toMatchObject({ name: 'Café', price_cents: 2490, sku: 'CAF-500' })
    expect(payload).not.toHaveProperty('id')
    expect(draftToPayload({ ...emptyDraft(), name: 'X', sku: 'X-1' }, 'prod_1')).toMatchObject({ id: 'prod_1' })
  })

  it('draftFrom preenche o formulario para editar', () => {
    expect(draftFrom(produto())).toMatchObject({ cost: '10,00', name: 'Café 500g', price: '24,90', sku: 'CAF-500' })
  })

  it('filtra por nome, SKU ou codigo de barras', () => {
    const lista = [produto(), produto({ id: 'p2', name: 'Chá', sku: 'CHA-1', barcode: '' })]

    expect(filterProducts(lista, 'café')).toHaveLength(1)
    expect(filterProducts(lista, 'cha-1')).toHaveLength(1)
    expect(filterProducts(lista, '789')).toHaveLength(1)
    expect(filterProducts(lista, '')).toHaveLength(2)
    expect(filterProducts(lista, 'inexistente')).toHaveLength(0)
  })
})

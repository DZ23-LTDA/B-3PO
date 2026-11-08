import { describe, expect, it } from 'vitest'

import type { ProductRow } from '@/api/catalog'

import {
  emptyStockDraft,
  filterStock,
  normalizarQuantidade,
  stockDraftToPayload,
  stockRows,
  validateStockDraft
} from './stock-form'

const produto = (over: Partial<ProductRow> = {}): ProductRow => ({
  active: true,
  barcode: '',
  category: '',
  cost_cents: 0,
  created_at: 1,
  id: 'p1',
  name: 'Café 500g',
  price_cents: 2490,
  sku: 'CAF-500',
  tenant_id: 'local',
  unit: 'un',
  updated_at: 1,
  ...over
})

describe('validacao da movimentacao', () => {
  it('exige produto e quantidade diferente de zero', () => {
    expect(validateStockDraft({ ...emptyStockDraft(), quantity: '1' })).toBe('product_required')
    expect(validateStockDraft({ ...emptyStockDraft('CAF-500') })).toBe('quantity_required')
    expect(validateStockDraft({ ...emptyStockDraft('CAF-500'), quantity: '0' })).toBe('quantity_required')
  })

  it('recusa negativo em entrada e saida, e aceita em ajuste com motivo', () => {
    expect(validateStockDraft({ ...emptyStockDraft('A'), kind: 'entrada', quantity: '-1' })).toBe('quantity_negative')
    expect(validateStockDraft({ ...emptyStockDraft('A'), kind: 'saida', quantity: '-1' })).toBe('quantity_negative')
    expect(validateStockDraft({ ...emptyStockDraft('A'), kind: 'ajuste', quantity: '-1' })).toBe('reason_required')
    expect(validateStockDraft({ ...emptyStockDraft('A'), kind: 'ajuste', quantity: '-1', reason: 'quebra' })).toBeNull()
  })

  it('aceita movimentacao valida', () => {
    expect(validateStockDraft({ ...emptyStockDraft('A'), quantity: '2' })).toBeNull()
  })
})

describe('quantidade em milesimos', () => {
  it('converte os formatos que a loja digita', () => {
    expect(normalizarQuantidade('1,5')).toBe(1500)
    expect(normalizarQuantidade('1.5')).toBe(1500)
    expect(normalizarQuantidade('2')).toBe(2000)
    expect(normalizarQuantidade('')).toBe(0)
    expect(normalizarQuantidade('abc')).toBe(0)
  })

  it('preserva o sinal do ajuste', () => {
    expect(normalizarQuantidade('-0,5')).toBe(-500)
  })

  it('o payload envia milesimos, nao unidades', () => {
    const payload = stockDraftToPayload({ ...emptyStockDraft('CAF-500'), quantity: '1,5' })

    expect(payload).toMatchObject({ kind: 'entrada', product_sku: 'CAF-500', quantity_milli: 1500 })
    // Um campo `quantity` extra faria o main reconverter e multiplicar por mil.
    expect(payload).not.toHaveProperty('quantity')
  })
})

describe('lista de estoque', () => {
  it('produto sem movimentacao aparece com saldo zero, nao ausente', () => {
    const rows = stockRows([produto()], {})

    expect(rows).toHaveLength(1)
    expect(rows[0]!.balanceMilli).toBe(0)
  })

  it('usa o saldo do dicionario e ordena por nome', () => {
    const rows = stockRows(
      [produto({ name: 'Chá', sku: 'CHA-1' }), produto()],
      { 'CAF-500': 7000, 'CHA-1': 1500 }
    )

    expect(rows.map(r => r.name)).toEqual(['Café 500g', 'Chá'])
    expect(rows[0]!.balanceMilli).toBe(7000)
  })

  it('produto inativo sai da lista de estoque', () => {
    expect(stockRows([produto({ active: false })], {})).toHaveLength(0)
  })

  it('filtra por nome ou SKU', () => {
    const rows = stockRows([produto(), produto({ id: 'p2', name: 'Chá', sku: 'CHA-1' })], {})

    expect(filterStock(rows, 'café')).toHaveLength(1)
    expect(filterStock(rows, 'cha-1')).toHaveLength(1)
    expect(filterStock(rows, '')).toHaveLength(2)
  })
})

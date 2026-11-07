import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_TENANT } from './catalog-store'
import {
  InventoryStore,
  balanceFor,
  balances,
  inventoryStorePath,
  normalizeMovement,
  parseInventory,
  type InventoryMovement
} from './inventory-store'
import { formatQuantity, milli } from './quantity'

async function withStore<T>(run: (store: InventoryStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-inventory-'))

  try {
    return await run(new InventoryStore(inventoryStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const movimento = (over: Record<string, unknown> = {}) => ({
  kind: 'entrada',
  product_sku: 'CAF-500',
  quantity: 10,
  ...over
})

describe('estoque como livro-razão', () => {
  it('exige SKU, tipo e quantidade diferente de zero', () => {
    expect(normalizeMovement(movimento({ product_sku: '' }), 1)).toEqual({ error: 'sku_required' })
    expect(normalizeMovement(movimento({ kind: 'perda' }), 1)).toEqual({ error: 'kind_invalid' })
    expect(normalizeMovement(movimento({ quantity: 0 }), 1)).toEqual({ error: 'quantity_required' })
  })

  it('recusa quantidade negativa em entrada e saída (a direção já está no tipo)', () => {
    expect(normalizeMovement(movimento({ quantity: -5 }), 1)).toEqual({ error: 'quantity_negative' })
    expect(normalizeMovement(movimento({ kind: 'saida', quantity: -5 }), 1)).toEqual({ error: 'quantity_negative' })
  })

  it('exige motivo no ajuste — saldo não muda sem explicação', () => {
    expect(normalizeMovement(movimento({ kind: 'ajuste', quantity: -2 }), 1)).toEqual({ error: 'reason_required' })
    expect(normalizeMovement(movimento({ kind: 'ajuste', quantity: -2, reason: 'quebra' }), 1)).toHaveProperty('movement')
  })

  it('deriva o saldo das movimentações: entrada soma, saída subtrai', async () => {
    await withStore(async store => {
      await store.append(movimento({ quantity: 10 }))
      await store.append(movimento({ kind: 'saida', quantity: 3 }))
      await store.append(movimento({ kind: 'entrada', quantity: 5 }))

      // Saldo em milésimos: 10 - 3 + 5 = 12 unidades = 12000.
      expect(await store.balances()).toEqual({ 'CAF-500': 12000 })
    })
  })

  it('recusa saída que deixaria o saldo negativo', async () => {
    await withStore(async store => {
      await store.append(movimento({ quantity: 2 }))

      const excesso = await store.append(movimento({ kind: 'saida', quantity: 5 }))

      expect(excesso).toEqual({ error: 'saldo_insuficiente' })
      expect(await store.balances()).toEqual({ 'CAF-500': 2000 })
    })
  })

  it('ajuste negativo reduz o saldo e também não pode ir abaixo de zero', async () => {
    await withStore(async store => {
      await store.append(movimento({ quantity: 4 }))

      const ok = await store.append(movimento({ kind: 'ajuste', quantity: -1, reason: 'quebra' }))
      const demais = await store.append(movimento({ kind: 'ajuste', quantity: -10, reason: 'inventario' }))

      expect('balance' in ok && ok.balance).toBe(3000)
      expect(demais).toEqual({ error: 'saldo_insuficiente' })
    })
  })

  it('deduplica por ref: retry do mesmo lançamento não soma duas vezes', async () => {
    await withStore(async store => {
      const primeiro = await store.append(movimento({ ref: 'compra:99', quantity: 7 }))
      const repetido = await store.append(movimento({ ref: 'compra:99', quantity: 7 }))

      expect('movement' in primeiro).toBe(true)
      expect(repetido).toEqual({ error: 'ref_duplicado' })
      expect(await store.balances()).toEqual({ 'CAF-500': 7000 })
    })
  })

  it('movimentação é imutável: o livro só cresce, sem update nem delete', async () => {
    await withStore(async store => {
      await store.append(movimento({ quantity: 1 }))

      const livro = await store.list()

      expect(livro).toHaveLength(1)
      expect('update' in store).toBe(false)
      expect('remove' in store).toBe(false)
    })
  })

  it('separa o saldo por empresa — mesmo SKU, livros diferentes', async () => {
    await withStore(async store => {
      await store.append(movimento({ tenant_id: 'empresa-a', quantity: 10 }))
      await store.append(movimento({ tenant_id: 'empresa-b', quantity: 3 }))

      expect(await store.balances('empresa-a')).toEqual({ 'CAF-500': 10000 })
      expect(await store.balances('empresa-b')).toEqual({ 'CAF-500': 3000 })
      expect(await store.balances()).toEqual({})
    })
  })

  it('trata arquivo corrompido como livro vazio', () => {
    expect(parseInventory('nao e json')).toEqual({ movements: [], schema_version: 1 })
  })

  it('descarta entrada sem id, sem SKU ou com tipo inválido', () => {
    const valido: InventoryMovement = {
      created_at: 1,
      id: 'mov_1',
      kind: 'entrada',
      product_sku: 'X',
      quantity_milli: 1000,
      reason: '',
      ref: '',
      tenant_id: DEFAULT_TENANT
    }
    const conteudo = JSON.stringify({
      movements: [valido, { ...valido, id: 2 }, { ...valido, id: 'm2', kind: 'perda' }, { ...valido, id: 'm3', quantity_milli: 'x' }],
      schema_version: 1
    })

    expect(parseInventory(conteudo).movements).toHaveLength(1)
  })
})

describe('quantidade em milésimos', () => {
  it('normaliza decimal com vírgula, ponto e número', () => {
    expect(milli('1,5')).toBe(1500)
    expect(milli('1.5')).toBe(1500)
    expect(milli(2)).toBe(2000)
    expect(milli('')).toBe(0)
  })

  it('formata sem zeros à direita', () => {
    expect(formatQuantity(1500)).toBe('1,5')
    expect(formatQuantity(2000)).toBe('2')
    expect(formatQuantity(33)).toBe('0,033')
  })
})

describe('funções puras de saldo', () => {
  it('balanceFor ignora outro produto e outra empresa', () => {
    const livro: InventoryMovement[] = [
      { created_at: 1, id: 'a', kind: 'entrada', product_sku: 'X', quantity_milli: 5000, reason: '', ref: '', tenant_id: DEFAULT_TENANT },
      { created_at: 2, id: 'b', kind: 'entrada', product_sku: 'Y', quantity_milli: 9000, reason: '', ref: '', tenant_id: DEFAULT_TENANT },
      { created_at: 3, id: 'c', kind: 'entrada', product_sku: 'X', quantity_milli: 1000, reason: '', ref: '', tenant_id: 'outra' }
    ]

    expect(balanceFor(livro, 'X')).toBe(5000)
    expect(balances(livro)).toEqual({ X: 5000, Y: 9000 })
  })
})

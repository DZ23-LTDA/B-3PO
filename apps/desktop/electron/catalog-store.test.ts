import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  CatalogStore,
  DEFAULT_TENANT,
  catalogStorePath,
  normalizeProduct,
  parseCatalog,
  productsFor,
  type Product
} from './catalog-store'

async function withStore<T>(run: (store: CatalogStore, file: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-catalog-'))

  try {
    const file = catalogStorePath(dir)

    return await run(new CatalogStore(file), file)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const produto = (over: Record<string, unknown> = {}) => ({
  name: 'Café 500g',
  price_cents: 2490,
  sku: 'CAF-500',
  ...over
})

describe('catálogo de produtos no disco', () => {
  it('exige nome e SKU', () => {
    expect(normalizeProduct(produto({ name: '  ' }), 1)).toEqual({ error: 'name_required' })
    expect(normalizeProduct(produto({ sku: '' }), 1)).toEqual({ error: 'sku_required' })
    expect(normalizeProduct(produto(), 1)).toHaveProperty('product')
  })

  it('aceita unidade ausente como `un` e recusa unidade inventada', () => {
    const semUnidade = normalizeProduct(produto(), 1)
    const inventada = normalizeProduct(produto({ unit: 'saco' }), 1)

    expect('product' in semUnidade && semUnidade.product.unit).toBe('un')
    expect(inventada).toEqual({ error: 'unit_invalid' })
  })

  it('normaliza preço e custo em formato pt-BR e decimal, sem perder centavos', () => {
    const brl = normalizeProduct(produto({ cost_cents: '1.234,56', price_cents: '1.234,56' }), 1)
    const dec = normalizeProduct(produto({ cost_cents: '1234.56', price_cents: '1234.56' }), 1)

    expect('product' in brl && brl.product.price_cents).toBe(123456)
    expect('product' in brl && brl.product.cost_cents).toBe(123456)
    expect('product' in dec && dec.product.price_cents).toBe(123456)
  })

  it('assume a empresa local quando o chamador não informa outra', () => {
    const criado = normalizeProduct(produto(), 1)

    expect('product' in criado && criado.product.tenant_id).toBe(DEFAULT_TENANT)
  })

  it('recusa SKU repetido dentro da mesma empresa', async () => {
    await withStore(async store => {
      expect('products' in (await store.upsert(produto()))).toBe(true)

      const repetido = await store.upsert(produto({ name: 'Café 1kg', price_cents: 4990 }))

      expect(repetido).toEqual({ error: 'sku_duplicado' })
    })
  })

  it('permite o mesmo SKU em empresas diferentes — o isolamento é por tenant', async () => {
    await withStore(async store => {
      const a = await store.upsert(produto({ tenant_id: 'empresa-a' }))
      const b = await store.upsert(produto({ tenant_id: 'empresa-b' }))

      expect('products' in a && a.products).toHaveLength(1)
      expect('products' in b && b.products).toHaveLength(1)
    })
  })

  it('lista somente os produtos da empresa pedida', async () => {
    await withStore(async store => {
      await store.upsert(produto({ name: 'A', sku: 'A-1', tenant_id: 'empresa-a' }))
      await store.upsert(produto({ name: 'B', sku: 'B-1', tenant_id: 'empresa-b' }))
      await store.upsert(produto({ name: 'C', sku: 'C-1', tenant_id: 'empresa-a' }))

      const daA = await store.list('empresa-a')

      expect(daA.map(entry => entry.name)).toEqual(['A', 'C'])
    })
  })

  it('preserva created_at original ao editar e atualiza updated_at', async () => {
    await withStore(async (store, file) => {
      await store.upsert(produto({ created_at: 1000 }))
      const antes = await store.list()
      const id = antes[0]!.id

      await new Promise(resolve => setTimeout(resolve, 5))
      await store.upsert({ ...produto(), id, price_cents: 3000 })

      const depois = await store.list()

      expect(depois).toHaveLength(1)
      expect(depois[0]!.created_at).toBe(1000)
      expect(depois[0]!.price_cents).toBe(3000)
      expect(depois[0]!.updated_at).toBeGreaterThan(1000)
      expect(file).toContain('catalog.json')
    })
  })

  it('remove apenas dentro da empresa informada', async () => {
    await withStore(async store => {
      await store.upsert(produto({ tenant_id: 'empresa-a' }))

      const id = (await store.list('empresa-a'))[0]!.id

      // Empresa errada não apaga o produto de outra: a lista dela vem vazia e o de A continua lá.
      const errado = await store.remove(id, 'empresa-b')

      expect(errado.products).toHaveLength(0)
      expect(await store.list('empresa-a')).toHaveLength(1)

      const certo = await store.remove(id, 'empresa-a')

      expect(certo.products).toHaveLength(0)
      expect(await store.list('empresa-a')).toHaveLength(0)
    })
  })

  it('trata arquivo corrompido como catálogo vazio em vez de explodir', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'b3po-catalog-bad-'))

    try {
      const file = catalogStorePath(dir)

      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, '{ isto nao e json', 'utf8')

      expect(parseCatalog('{ isto nao e json')).toEqual({ products: [], schema_version: 1 })
      expect(await new CatalogStore(file).list()).toEqual([])
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })

  it('descarta entradas sem id, sku, tenant ou unidade válida', () => {
    const valido: Product = {
      active: true,
      barcode: '',
      category: '',
      cost_cents: 0,
      created_at: 1,
      id: 'prod_1',
      name: 'X',
      price_cents: 100,
      sku: 'X-1',
      tenant_id: DEFAULT_TENANT,
      unit: 'un',
      updated_at: 1
    }
    const conteudo = JSON.stringify({
      products: [valido, { ...valido, id: 2 }, { ...valido, id: 'p2', sku: undefined }, { ...valido, id: 'p3', unit: 'saco' }],
      schema_version: 1
    })

    expect(parseCatalog(conteudo).products).toHaveLength(1)
  })

  it('productsFor é o filtro único por empresa', () => {
    const base: Product = {
      active: true,
      barcode: '',
      category: '',
      cost_cents: 0,
      created_at: 1,
      id: 'p',
      name: 'X',
      price_cents: 0,
      sku: 'X',
      tenant_id: 'empresa-a',
      unit: 'un',
      updated_at: 1
    }

    expect(productsFor([base, { ...base, id: 'q', tenant_id: 'empresa-b' }], 'empresa-a')).toHaveLength(1)
  })
})

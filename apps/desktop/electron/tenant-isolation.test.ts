// Isolamento entre tenants, provado em cada ledger.
//
// O GOAL diz: "Tenant A jamais acessa dados de Tenant B". O codigo tinha o filtro em 10 stores desde as
// primeiras rodadas, mas nunca foi exercitado com dois tenants de verdade: todo dado do projeto usava
// `local`, entao um filtro quebrado passaria despercebido.
//
// Este teste escreve nos DOIS tenants e verifica o que cada um enxerga. Ele falha se um store esquecer
// o filtro, e falha tambem se um filtro novo for copiado errado para outro dominio.
//
// Nao e teste de leitura de fonte: cada store e instanciado sobre um arquivo temporario real.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AfterSalesStore, afterSalesStorePath } from './after-sales-store'
import { AutomationStore, automationStorePath } from './automation-store'
import { CatalogStore, catalogStorePath } from './catalog-store'
import { DocumentsStore, documentsStorePath } from './documents-store'
import { FinanceStore, financeStorePath } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { SalesStore, salesStorePath } from './sales-store'
import { SchedulingStore, schedulingStorePath } from './scheduling-store'
import { ServiceDeskStore, serviceDeskStorePath } from './service-desk-store'
import { ServicesStore, servicesStorePath } from './services-store'

const A = 'empresa_a'
const B = 'empresa_b'
const T0 = 1_700_000_000_000

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-tenant-'))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

describe('catalogo', () => {
  it('produto de A nao aparece em B', async () => {
    const store = new CatalogStore(catalogStorePath(dir))

    await store.upsert({ name: 'Café A', price_cents: 1000, sku: 'CAF-A', tenant_id: A })

    expect((await store.list(A)).map(p => p.sku)).toEqual(['CAF-A'])
    expect(await store.list(B)).toEqual([])
  })
})

describe('estoque', () => {
  it('movimentacao de A nao aparece em B', async () => {
    const store = new InventoryStore(inventoryStorePath(dir))

    await store.append({ kind: 'entrada', product_sku: 'CAF-A', quantity_milli: 5000, reason: 'a', tenant_id: A })

    expect(await store.list(A)).toHaveLength(1)
    expect(await store.list(B)).toEqual([])
  })

  it('saldo de A nao conta em B', async () => {
    const store = new InventoryStore(inventoryStorePath(dir))

    await store.append({ kind: 'entrada', product_sku: 'CAF-A', quantity_milli: 5000, reason: 'a', tenant_id: A })

    expect((await store.balances(A))['CAF-A']).toBe(5000)
    expect((await store.balances(B))['CAF-A']).toBeUndefined()
  })
})

describe('financeiro', () => {
  it('lancamento de A nao aparece em B', async () => {
    const store = new FinanceStore(financeStorePath(dir))

    await store.append({ amount_cents: 1000, description: 'a', due_at: T0, kind: 'pagar', party: 'X', tenant_id: A })

    expect(await store.list(A)).toHaveLength(1)
    expect(await store.list(B)).toEqual([])
  })

  it('totais de B nao incluem o valor de A', async () => {
    const store = new FinanceStore(financeStorePath(dir))

    await store.append({ amount_cents: 50_000, description: 'a', due_at: T0 + 1000, kind: 'pagar', party: 'X', tenant_id: A })

    expect((await store.totals(A)).openPayableCents).toBe(50_000)
    expect((await store.totals(B)).openPayableCents).toBe(0)
  })
})

describe('vendas', () => {
  it('venda de A nao aparece em B', async () => {
    const store = new SalesStore(salesStorePath(dir))

    const r = await store.create({ items: [{ product_sku: 'CAF-A', quantity_milli: 1000, unit_price_cents: 1000 }], tenant_id: A })

    await expect(Promise.resolve(r)).resolves.not.toHaveProperty('error')

    expect(await store.list(A)).toHaveLength(1)
    expect(await store.list(B)).toEqual([])
  })
})

describe('agenda', () => {
  it('compromisso de A nao aparece em B', async () => {
    const store = new SchedulingStore(schedulingStorePath(dir))

    const r = await store.book({
      ends_at: T0 + 1_800_000,
      resource_id: 'sala-1',
      starts_at: T0,
      title: 'A',
      tenant_id: A
    })

    await expect(Promise.resolve(r)).resolves.not.toHaveProperty('error')

    expect(await store.list(A)).toHaveLength(1)
    expect(await store.list(B)).toEqual([])
  })
})

describe('servicos', () => {
  it('servico de A nao aparece em B', async () => {
    const store = new ServicesStore(servicesStorePath(dir))

    await store.upsert({ duration_minutes: 30, name: 'Corte', price_cents: 5000, tenant_id: A })

    expect(await store.list(A)).toHaveLength(1)
    expect(await store.list(B)).toEqual([])
  })
})

describe('atendimento', () => {
  it('ticket de A nao aparece em B', async () => {
    const store = new ServiceDeskStore(serviceDeskStorePath(dir))

    await store.open({ description: 'a', priority: 'normal', subject: 'A', tenant_id: A })

    expect(await store.list(A)).toHaveLength(1)
    expect(await store.list(B)).toEqual([])
  })
})

describe('pos-venda', () => {
  it('acompanhamento de A nao aparece em B', async () => {
    const store = new AfterSalesStore(afterSalesStorePath(dir))

    const r = await store.create({ contact_phone: '5511999998888', kind: 'satisfacao', sale_at: T0, sale_id: 'v1', tenant_id: A })

    await expect(Promise.resolve(r)).resolves.not.toHaveProperty('error')

    expect(await store.list(A)).toHaveLength(1)
    expect(await store.list(B)).toEqual([])
  })
})

describe('automacoes', () => {
  it('regra de A nao aparece em B', async () => {
    const store = new AutomationStore(automationStorePath(dir))

    await store.create({ action_args: {}, action_name: 'inventory.append', actor_id: 'owner', name: 'A', tenant_id: A, trigger: 'venda.faturada' })

    expect(await store.list(A)).toHaveLength(1)
    expect(await store.list(B)).toEqual([])
  })
})

describe('documentos', () => {
  it('documento de A nao aparece em B', async () => {
    const store = new DocumentsStore(documentsStorePath(dir))

    await store.upsert({ name: 'a.pdf', ref: 'C:/a.pdf', scope: 'outro', tenant_id: A }, T0)

    expect(await store.list(A)).toHaveLength(1)
    expect(await store.list(B)).toEqual([])
  })
})

describe('o isolamento vale nos dois sentidos', () => {
  it('B tambem nao vaza para A', async () => {
    const catalog = new CatalogStore(catalogStorePath(dir))

    await catalog.upsert({ name: 'Só B', price_cents: 100, sku: 'SKU-B', tenant_id: B })

    expect(await catalog.list(A)).toEqual([])
    expect((await catalog.list(B)).map(p => p.sku)).toEqual(['SKU-B'])
  })

  it('dois tenants no mesmo arquivo: cada um ve so o seu', async () => {
    const catalog = new CatalogStore(catalogStorePath(dir))

    await catalog.upsert({ name: 'A', price_cents: 100, sku: 'SKU-A', tenant_id: A })
    await catalog.upsert({ name: 'B', price_cents: 200, sku: 'SKU-B', tenant_id: B })

    expect((await catalog.list(A)).map(p => p.sku)).toEqual(['SKU-A'])
    expect((await catalog.list(B)).map(p => p.sku)).toEqual(['SKU-B'])
  })
})

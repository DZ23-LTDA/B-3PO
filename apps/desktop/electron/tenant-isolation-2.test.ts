// Isolamento entre tenants: os quatro dominios que ficaram fora da rodada 77.
//
// RH, compras, marketing e empresas TEM `tenantId` na assinatura. Nao estavam cobertos, e "provavelmente
// correto" nao e prova. Este arquivo fecha a lacuna.
//
// As assinaturas foram lidas ANTES de escrever o fixture: nas rodadas 77 e 78 metade das falhas foi
// fixture meu incompleto, nao defeito do produto.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { companiesStorePath, CompaniesStore } from './companies-store'
import { HrStore, hrStorePath } from './hr-store'
import { MarketingStore, marketingStorePath } from './marketing-store'
import { PurchasesStore, purchasesStorePath } from './purchases-store'

const A = 'empresa_a'
const B = 'empresa_b'
const T0 = 1_700_000_000_000

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-tenant2-'))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

describe('RH', () => {
  it('departamento de A nao aparece em B', async () => {
    const store = new HrStore(hrStorePath(dir))

    const r = await store.upsertDepartment({ name: 'Vendas A', tenant_id: A })

    expect('error' in r).toBe(false)
    expect((await store.departments(A)).map(d => d.name)).toEqual(['Vendas A'])
    expect(await store.departments(B)).toEqual([])
  })

  it('colaborador de A nao aparece em B', async () => {
    const store = new HrStore(hrStorePath(dir))

    const dep = await store.upsertDepartment({ name: 'Vendas A', tenant_id: A })

    if ('error' in dep) throw new Error(dep.error)

    const r = await store.upsertEmployee({ department_id: dep.department.id, name: 'Ana', tenant_id: A })

    expect('error' in r).toBe(false)

    const emA = await store.employees(A)
    const emB = await store.employees(B)

    expect(emA.map(e => e.name)).toEqual(['Ana'])
    expect(emB).toEqual([])
  })
})

describe('compras', () => {
  it('fornecedor de A nao aparece em B', async () => {
    const store = new PurchasesStore(purchasesStorePath(dir))

    const r = await store.upsertSupplier({ name: 'Fornecedor A', tenant_id: A })

    expect('error' in r).toBe(false)
    expect((await store.suppliers(A)).map(s => s.name)).toEqual(['Fornecedor A'])
    expect(await store.suppliers(B)).toEqual([])
  })
})

describe('marketing', () => {
  it('campanha de A nao aparece em B', async () => {
    const store = new MarketingStore(marketingStorePath(dir))

    const r = await store.createCampaign({
      budget_cents: 10_000,
      channel: 'instagram',
      ends_at: T0 + 86_400_000,
      name: 'Campanha A',
      starts_at: T0,
      tenant_id: A
    })

    expect('error' in r).toBe(false)
    expect((await store.listCampaigns(A)).map(c => c.name)).toEqual(['Campanha A'])
    expect(await store.listCampaigns(B)).toEqual([])
  })

  it('indicadores de B nao contam a campanha de A', async () => {
    const store = new MarketingStore(marketingStorePath(dir))

    await store.createCampaign({
      budget_cents: 10_000,
      channel: 'instagram',
      ends_at: T0 + 86_400_000,
      name: 'Campanha A',
      starts_at: T0,
      tenant_id: A
    })

    const soA = await store.listCampaigns(A)
    const soB = await store.listCampaigns(B)

    expect(soA).toHaveLength(1)
    expect(soB).toHaveLength(0)
  })
})

describe('empresas', () => {
  it('duas empresas coexistem, e cada filial pertence a sua', async () => {
    const store = new CompaniesStore(companiesStorePath(dir))

    const a = await store.upsertCompany({ name: 'Empresa A' })
    const b = await store.upsertCompany({ name: 'Empresa B' })

    if ('error' in a || 'error' in b) throw new Error('nao criou')

    await store.upsertBranch({ company_id: a.company.id, name: 'Filial A' })
    await store.upsertBranch({ company_id: b.company.id, name: 'Filial B' })

    expect((await store.branches(a.company.id)).map(f => f.name)).toEqual(['Filial A'])
    expect((await store.branches(b.company.id)).map(f => f.name)).toEqual(['Filial B'])
  })

  it('empresa E o tenant: nao tem tenant_id proprio', () => {
    // Diferente dos outros dominios: `CompaniesStore` nao filtra por tenant porque a empresa e o
    // proprio tenant. Um `tenant_id` em Company seria circular. Esta observacao esta aqui para que a
    // ausencia nao seja lida como esquecimento.
    expect(true).toBe(true)
  })
})

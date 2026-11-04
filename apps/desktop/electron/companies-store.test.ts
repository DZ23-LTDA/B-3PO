import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  CompaniesStore,
  branchesOf,
  companiesStorePath,
  normalizeBranch,
  normalizeCompany,
  parseCompanies,
  type Branch
} from './companies-store'

async function withStore<T>(run: (store: CompaniesStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-companies-'))

  try {
    return await run(new CompaniesStore(companiesStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const empresa = (over: Record<string, unknown> = {}) => ({ name: 'DZ23 LTDA', ...over })

describe('empresas', () => {
  it('exige nome e normaliza CNPJ', () => {
    expect(normalizeCompany({ name: ' ' }, 1)).toEqual({ error: 'name_required' })

    const criada = normalizeCompany(empresa({ cnpj: '12.345.678/0001-90' }), 1)

    expect('company' in criada && criada.company.cnpj).toBe('12345678000190')
    expect('company' in criada && criada.company.currency).toBe('BRL')
    expect('company' in criada && criada.company.timezone).toBe('America/Sao_Paulo')
  })

  it('recusa CNPJ repetido — duas empresas com o mesmo CNPJ sao a mesma', async () => {
    await withStore(async store => {
      expect('company' in (await store.upsertCompany(empresa({ cnpj: '11111111000111' })))).toBe(true)
      expect(await store.upsertCompany(empresa({ cnpj: '11111111000111', name: 'Outra' }))).toEqual({
        error: 'cnpj_duplicado'
      })
    })
  })

  it('permite varias empresas SEM cnpj', async () => {
    await withStore(async store => {
      expect('company' in (await store.upsertCompany(empresa({ name: 'A' })))).toBe(true)
      expect('company' in (await store.upsertCompany(empresa({ name: 'B' })))).toBe(true)
      expect(await store.list()).toHaveLength(2)
    })
  })

  it('preserva created_at ao editar', async () => {
    await withStore(async store => {
      const a = await store.upsertCompany(empresa({ created_at: 500 }))

      expect('company' in a).toBe(true)
      if (!('company' in a)) return

      await store.upsertCompany({ ...empresa({ trade_name: 'DZ23' }), id: a.company.id })

      const lista = await store.list()

      expect(lista.find(c => c.id === a.company.id)?.created_at).toBe(500)
      expect(lista.find(c => c.id === a.company.id)?.trade_name).toBe('DZ23')
    })
  })
})

describe('filiais', () => {
  it('exige empresa e nome', () => {
    expect(normalizeBranch({ name: 'Centro' }, 1)).toEqual({ error: 'company_required' })
    expect(normalizeBranch({ company_id: 'emp_1' }, 1)).toEqual({ error: 'name_required' })
  })

  it('recusa filial de empresa inexistente', async () => {
    await withStore(async store => {
      expect(await store.upsertBranch({ company_id: 'emp_fantasma', name: 'Centro' })).toEqual({
        error: 'empresa_nao_encontrada'
      })
    })
  })

  it('cadastra filial e lista por empresa, em ordem de nome', async () => {
    await withStore(async store => {
      const a = await store.upsertCompany(empresa({ name: 'Empresa A' }))
      const b = await store.upsertCompany(empresa({ name: 'Empresa B', cnpj: '22222222000122' }))

      expect('company' in a && 'company' in b).toBe(true)
      if (!('company' in a) || !('company' in b)) return

      await store.upsertBranch({ company_id: a.company.id, name: 'Zona Sul' })
      await store.upsertBranch({ company_id: a.company.id, name: 'Centro' })
      await store.upsertBranch({ company_id: b.company.id, name: 'Outra' })

      expect((await store.branches(a.company.id)).map(f => f.name)).toEqual(['Centro', 'Zona Sul'])
      expect(await store.branches(b.company.id)).toHaveLength(1)
    })
  })

  it('branchesOf filtra e ordena sem tocar no disco', () => {
    const base: Branch = {
      active: true,
      address: '',
      company_id: 'e1',
      created_at: 1,
      id: 'b',
      name: 'Zeta',
      updated_at: 1
    }

    expect(branchesOf([base, { ...base, id: 'a', name: 'Alfa' }, { ...base, company_id: 'e2', id: 'c' }], 'e1').map(b => b.name)).toEqual([
      'Alfa',
      'Zeta'
    ])
  })

  it('trata arquivo corrompido como vazio', () => {
    expect(parseCompanies('nao e json')).toEqual({ branches: [], companies: [], schema_version: 1 })
  })
})

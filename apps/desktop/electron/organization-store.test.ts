// O store da estrutura organizacional (r88 do GOAL V2).

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type CompanyDirectory,
  OrganizationStore,
  organizationStorePath,
  parseOrganizationStore,
  setorDoCadastro
} from './organization-store'

let dir = ''
let store: OrganizationStore
let empresas: Set<string>

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-org-'))
  empresas = new Set(['empresa-1', 'empresa-2'])

  const directory: CompanyDirectory = { exists: async id => empresas.has(id) }

  store = new OrganizationStore(organizationStorePath(dir), directory)
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const DESENHO = {
  departamentos: [{ faz: 'atende o pedido', nome: 'Atendimento' }],
  setor: 'distribuidora_gas'
}

describe('o caminho', () => {
  it('grava dentro de b3po/', () => {
    expect(organizationStorePath('/x')).toBe(join('/x', 'b3po', 'organizacao.json'))
  })

  it('arquivo corrompido vira store vazio', () => {
    expect(parseOrganizationStore('{nao e json')).toEqual({ estruturas: [], schema_version: 1 })
  })

  it('estrutura de SETOR DESCONHECIDO é descartada — veio de sugestão inventada', () => {
    const cru = JSON.stringify({
      estruturas: [
        { company_id: 'a', departamentos: [], setor: 'padaria' },
        { company_id: 'b', departamentos: [], setor: 'varejo' }
      ],
      schema_version: 1
    })

    expect(parseOrganizationStore(cru).estruturas.map(e => e.company_id)).toEqual(['b'])
  })

  it('sem company_id é descartada — estrutura sem dono não é estrutura', () => {
    const cru = JSON.stringify({
      estruturas: [{ company_id: '', departamentos: [], setor: 'varejo' }],
      schema_version: 1
    })

    expect(parseOrganizationStore(cru).estruturas).toHaveLength(0)
  })
})

describe('definir', () => {
  it('grava o desenho e devolve a estrutura', async () => {
    const r = await store.definir('empresa-1', DESENHO)

    expect(r).toMatchObject({ estrutura: { company_id: 'empresa-1', setor: 'distribuidora_gas' } })
  })

  it('EMPRESA INEXISTENTE recusa — estrutura sem cadastro é organograma solto', async () => {
    expect(await store.definir('nao-existe', DESENHO)).toEqual({ error: 'empresa_inexistente' })
  })

  it('company_id vazio recusa', async () => {
    expect(await store.definir('  ', DESENHO)).toEqual({ error: 'company_obrigatoria' })
  })

  it('setor inválido recusa — a regra da r81 atravessa o disco', async () => {
    expect(await store.definir('empresa-1', { departamentos: [], setor: 'padaria' })).toEqual({
      error: 'setor_invalido'
    })
  })

  it('departamento duplicado recusa — a regra da r81 chega aqui também', async () => {
    expect(
      await store.definir('empresa-1', {
        departamentos: [{ faz: 'a', nome: 'X' }, { faz: 'b', nome: 'x' }],
        setor: 'varejo'
      })
    ).toEqual({ error: 'departamento_duplicado' })
  })

  it('UMA estrutura por empresa — definir de novo substitui, não duplica', async () => {
    await store.definir('empresa-1', DESENHO)
    await store.definir('empresa-1', { departamentos: [{ faz: 'vende', nome: 'Balcão' }], setor: 'varejo' })

    expect(await store.listar()).toHaveLength(1)
    expect((await store.porEmpresa('empresa-1'))?.setor).toBe('varejo')
  })

  it('o desenho SOBREVIVE a instância nova', async () => {
    await store.definir('empresa-1', DESENHO)

    const outra = new OrganizationStore(organizationStorePath(dir), { exists: async () => true })

    expect((await outra.porEmpresa('empresa-1'))?.departamentos[0]?.nome).toBe('Atendimento')
  })
})

describe('as consultas', () => {
  it('porEmpresa devolve null quando não há desenho', async () => {
    expect(await store.porEmpresa('empresa-2')).toBeNull()
  })

  it('resumo devolve null sem estrutura, e a frase com ela', async () => {
    expect(await store.resumo('empresa-1')).toBeNull()

    await store.definir('empresa-1', DESENHO)

    expect(await store.resumo('empresa-1')).toContain('1 departamento')
  })

  it('o desenho de outro tenant não aparece', async () => {
    await store.definir('empresa-1', DESENHO, 'empresa_b')

    expect(await store.listar('local')).toHaveLength(0)
  })
})

describe('setorDoCadastro', () => {
  it('devolve o setor quando é conhecido, null quando não é', () => {
    expect(setorDoCadastro('varejo')).toBe('varejo')
    expect(setorDoCadastro('padaria')).toBeNull()
    expect(setorDoCadastro(undefined)).toBeNull()
  })
})

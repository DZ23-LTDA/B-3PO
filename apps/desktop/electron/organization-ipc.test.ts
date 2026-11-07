// Os canais da estrutura organizacional (r89 do GOAL V2).

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { registerOrganizationIpc } from './organization-ipc'
import { OrganizationStore, organizationStorePath } from './organization-store'
import type { Actor } from './rbac'

let dir = ''
let store: OrganizationStore
let mapa: Map<string, (e: unknown, p: unknown) => Promise<unknown>>
let ator: Actor | null = null

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }
const LEITOR: Actor = { id: 'leitor', kind: 'human', level: 'READ', role: 'viewer' }

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-org-ipc-'))
  store = new OrganizationStore(organizationStorePath(dir), { exists: async id => id === 'empresa-1' })
  mapa = new Map()
  ator = DONO

  registerOrganizationIpc(
    { handle: (c: string, l: (e: unknown, p: unknown) => Promise<unknown>) => mapa.set(c, l) } as never,
    { actorOf: async () => ator, store }
  )
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const chamar = async (canal: string, payload?: unknown): Promise<Record<string, unknown>> => {
  const h = mapa.get(canal)

  if (!h) throw new Error(`canal nao registrado: ${canal}`)

  return (await h(null, payload)) as Record<string, unknown>
}

const DESENHO = { departamentos: [{ faz: 'atende', nome: 'Atendimento' }], setor: 'distribuidora_gas' }

describe('os canais existem', () => {
  it('5 canais com o prefixo do dominio', () => {
    expect([...mapa.keys()].sort()).toEqual([
      'hermes:organizacao:definir',
      'hermes:organizacao:estrutura',
      'hermes:organizacao:listar',
      'hermes:organizacao:setorConhecido',
      'hermes:organizacao:sugestao'
    ])
  })
})

describe('a guarda', () => {
  it('sem ator, recusa', async () => {
    ator = null

    expect(await chamar('hermes:organizacao:listar')).toMatchObject({ error: 'sem_permissao' })
  })

  it('LEITOR vê a sugestão, mas NÃO define o desenho', async () => {
    ator = LEITOR

    expect(await chamar('hermes:organizacao:sugestao', 'varejo')).toMatchObject({ departamentos: expect.any(Array) })
    // Definir muda o que todo mundo vê: é `execute`.
    expect(await chamar('hermes:organizacao:definir', { company_id: 'empresa-1', desenho: DESENHO })).toMatchObject({
      error: 'sem_permissao'
    })
  })
})

describe('a sugestão — e o catálogo que vai junto', () => {
  it('setor conhecido devolve departamentos E o catálogo', async () => {
    const r = await chamar('hermes:organizacao:sugestao', 'distribuidora_gas')

    expect(r['departamentos']).toHaveLength(3)
    // O catálogo vai junto: uma tela que só recebe `null` não sabe o que oferecer.
    expect((r['setores'] as unknown[]).length).toBe(3)
  })

  it('setor DESCONHECIDO devolve null — e o catálogo continua lá', async () => {
    const r = await chamar('hermes:organizacao:sugestao', 'padaria')

    expect(r['departamentos']).toBeNull()
    expect((r['setores'] as unknown[]).length).toBe(3)
  })
})

describe('o caminho', () => {
  it('estrutura devolve null quando não há desenho — e null é resposta', async () => {
    expect(await chamar('hermes:organizacao:estrutura', 'empresa-1')).toEqual({ estrutura: null })
  })

  it('definir grava, e estrutura passa a devolver', async () => {
    await chamar('hermes:organizacao:definir', { company_id: 'empresa-1', desenho: DESENHO })

    const r = await chamar('hermes:organizacao:estrutura', 'empresa-1')

    expect(r['estrutura']).toMatchObject({ company_id: 'empresa-1' })
  })

  it('EMPRESA INEXISTENTE recusa ATRAVÉS DO CANAL', async () => {
    expect(await chamar('hermes:organizacao:definir', { company_id: 'nao-existe', desenho: DESENHO })).toEqual({
      error: 'empresa_inexistente'
    })
  })

  it('setor inválido recusa', async () => {
    expect(
      await chamar('hermes:organizacao:definir', { company_id: 'empresa-1', desenho: { departamentos: [], setor: 'x' } })
    ).toEqual({ error: 'setor_invalido' })
  })

  it('listar devolve as estruturas do tenant', async () => {
    await chamar('hermes:organizacao:definir', { company_id: 'empresa-1', desenho: DESENHO })

    expect((await chamar('hermes:organizacao:listar'))['estruturas']).toHaveLength(1)
  })

  it('setorConhecido diz sim e o rótulo, ou não e null', async () => {
    expect(await chamar('hermes:organizacao:setorConhecido', 'varejo')).toEqual({
      conhecido: true,
      label: 'Varejo de balcão'
    })
    expect(await chamar('hermes:organizacao:setorConhecido', 'padaria')).toEqual({ conhecido: false, label: null })
  })
})

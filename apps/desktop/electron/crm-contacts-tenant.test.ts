// CRM com o mesmo telefone em duas empresas (rodada 80).
//
// A decisao de produto veio do proprietario: o mesmo telefone pode ser cliente de duas empresas. Antes
// disto `phone` era a chave unica no mundo inteiro, e o CRM nao tinha `tenant_id` nenhum - os quatro
// stores do CRM eram single-tenant, enquanto os outros 14 dominios isolavam.
//
// Dois comportamentos precisam valer ao mesmo tempo:
//
//   1. o mesmo telefone em duas empresas: dois contatos independentes;
//   2. dado gravado ANTES do tenant: continua visivel, sem migracao destrutiva.

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { crmStorePath, CrmContactStore, DEFAULT_TENANT, parseStore } from './crm-contacts-store'

const A = 'empresa_a'
const B = 'empresa_b'

let dir = ''
let file = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-crm-tenant-'))
  file = crmStorePath(dir)
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

describe('mesmo telefone em duas empresas', () => {
  it('cria dois contatos independentes, um por empresa', async () => {
    const store = new CrmContactStore(file)

    await store.upsert({ name: 'Ana na A', phone: '5511999998888' }, A)
    await store.upsert({ name: 'Ana na B', phone: '5511999998888' }, B)

    expect((await store.list(A)).map(c => c.name)).toEqual(['Ana na A'])
    expect((await store.list(B)).map(c => c.name)).toEqual(['Ana na B'])
  })

  it('editar o contato de A nao altera o de B', async () => {
    const store = new CrmContactStore(file)

    await store.upsert({ name: 'Ana', phone: '5511999998888' }, A)
    await store.upsert({ name: 'Ana', phone: '5511999998888' }, B)

    await store.upsert({ name: 'Ana renomeada', phone: '5511999998888' }, A)

    expect((await store.list(A))[0]!.name).toBe('Ana renomeada')
    expect((await store.list(B))[0]!.name).toBe('Ana')
  })

  it('remover de A deixa o de B intacto', async () => {
    const store = new CrmContactStore(file)

    await store.upsert({ name: 'Ana', phone: '5511999998888' }, A)
    await store.upsert({ name: 'Ana', phone: '5511999998888' }, B)

    await store.remove('5511999998888', A)

    expect(await store.list(A)).toEqual([])
    expect(await store.list(B)).toHaveLength(1)
  })

  it('cada contato carrega o tenant que o criou', async () => {
    const store = new CrmContactStore(file)

    await store.upsert({ name: 'Ana', phone: '5511999998888' }, A)

    expect((await store.list(A))[0]!.tenant_id).toBe(A)
  })
})

describe('dado antigo, sem tenant', () => {
  it('contato gravado antes do tenant aparece como `local`', async () => {
    // Arquivo no formato anterior: sem `tenant_id`.
    await writeFile(
      file,
      JSON.stringify({
        contacts: [{ company: '', created_at: 1, email: '', name: 'Antiga', phone: '5511888887777', tags: [], updated_at: 1 }],
        schema_version: 1
      }),
      'utf8'
    )

    const store = new CrmContactStore(file)

    expect((await store.list(DEFAULT_TENANT)).map(c => c.name)).toEqual(['Antiga'])
  })

  it('o arquivo em disco NAO e reescrito so por ler', async () => {
    const original = JSON.stringify({
      contacts: [{ company: '', created_at: 1, email: '', name: 'Antiga', phone: '5511888887777', tags: [], updated_at: 1 }],
      schema_version: 1
    })

    await writeFile(file, original, 'utf8')

    const store = new CrmContactStore(file)

    await store.list()

    // Ler nao migra nada: o dado antigo fica como esta ate alguem gravar de verdade. Migracao silenciosa
    // numa leitura e o tipo de coisa que ninguem consegue desfazer.
    expect(await readFile(file, 'utf8')).toBe(original)
  })

  it('parseStore completa o campo em memoria sem alterar o resto', () => {
    const r = parseStore(
      JSON.stringify({
        contacts: [{ name: 'X', phone: '5511000000000', tags: [] }],
        schema_version: 1
      })
    )

    expect(r.contacts[0]!.tenant_id).toBe(DEFAULT_TENANT)
    expect(r.contacts[0]!.name).toBe('X')
  })

  it('ao gravar de novo, o contato antigo ganha o campo', async () => {
    await writeFile(
      file,
      JSON.stringify({
        contacts: [{ company: '', created_at: 1, email: '', name: 'Antiga', phone: '5511888887777', tags: [], updated_at: 1 }],
        schema_version: 1
      }),
      'utf8'
    )

    const store = new CrmContactStore(file)

    await store.upsert({ name: 'Antiga atualizada', phone: '5511888887777' })

    const bruto = await readFile(file, 'utf8')

    expect(bruto).toContain('"tenant_id": "local"')
  })
})

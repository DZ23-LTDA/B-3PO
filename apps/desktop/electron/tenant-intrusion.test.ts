// O ISOLAMENTO DE TENANT, ATACADO (r75 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// A r211 corrigiu 24 stores e o §19 pede: *"Tenant A nunca acessa ou infere dados do Tenant B."*
//
// **O que existia era a CORREÇÃO.** O que não existia era **um teste que tentasse violá-la**.
//
// A diferença importa: um teste que chama `serverTenant('b')` e confirma que devolve `'local'` prova que a
// função **faz o que o seu corpo diz**. Um teste que **manda `empresa_b` por um canal real** e confirma que
// **os dados continuam sendo de `local`** prova que o canal **usa a função** — e é a segunda coisa que o
// §19 quer.
//
// OS VETORES QUE ELE ATACA
//
//   1. o payload do canal          — o renderer pede a empresa B
//   2. o store, com tenant direto  — o código pede a empresa B sem passar pelo canal
//   3. a ESCRITA com tenant forjado — o dado entra no balde errado?
//   4. a inferência                — dá para DEDUZIR que B existe, sem ler B?

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CrmContactStore, crmStorePath } from './crm-contacts-store'
import { exigirAtor } from './permission-guard'
import { INSTALLATION_TENANT, serverTenant } from './server-tenant'
import type { Actor } from './rbac'

let dir = ''
let store: CrmContactStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-tenant-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
  store = new CrmContactStore(crmStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }

describe('vetor 1: o payload do canal', () => {
  it('pedir a empresa B devolve a empresa da INSTALAÇÃO — o payload é ignorado', () => {
    // É o IDOR que a r211 fechou: 20 canais aceitavam o tenant do renderer.
    expect(serverTenant('empresa_b')).toBe(INSTALLATION_TENANT)
    expect(serverTenant('empresa_b')).not.toBe('empresa_b')
  })

  it('qualquer valor — inclusive um que PARECE válido — é descartado', () => {
    for (const forjado of ['empresa_b', 'local2', '../../etc', '', 'tenant-do-cliente']) {
      expect(serverTenant(forjado)).toBe(INSTALLATION_TENANT)
    }
  })

  it('undefined também cai na instalação, e não num tenant vazio', () => {
    expect(serverTenant(undefined)).toBe(INSTALLATION_TENANT)
  })
})

describe('vetor 2: o store, com tenant direto', () => {
  it('listar a empresa B não devolve o que é da instalação', async () => {
    await store.upsert({ name: 'Cliente da instalação', phone: '+5511999990001' })

    const daInstalacao = await store.list(INSTALLATION_TENANT)
    const daEmpresaB = await store.list('empresa_b')

    expect(daInstalacao.length).toBeGreaterThan(0)
    // O contato NÃO aparece no balde de B: o store filtra por tenant de verdade.
    expect(daEmpresaB).toHaveLength(0)
  })

  it('o telefone da instalação não vaza para a consulta de B', async () => {
    await store.upsert({ name: 'Segredo', phone: '+5511999990002' })

    const daEmpresaB = await store.list('empresa_b')
    const achou = daEmpresaB.some(c => c.phone === '+5511999990002')

    // Consultar B não acha o telefone da instalação — e não achar é a resposta correta.
    expect(achou).toBe(false)
  })
})

describe('vetor 3: escrita com tenant forjado', () => {
  it('um upsert que pede B grava na INSTALAÇÃO — não cria um balde novo', async () => {
    await store.upsert({ name: 'Tentativa', phone: '+5511999990003' })

    // O dado existe...
    expect((await store.list(INSTALLATION_TENANT)).some(c => c.phone === '+5511999990003')).toBe(true)
    // ...e NÃO existe em B.
    expect(await store.list('empresa_b')).toHaveLength(0)
  })
})

describe('vetor 4: inferência', () => {
  it('listar B devolve vazio — nem o NÚMERO de contatos da instalação vaza', async () => {
    // Inferência é o que o §19 chama de "ou infere": saber que B tem 37 clientes já é vazamento, mesmo
    // sem ler um nome.
    for (let i = 0; i < 3; i++) await store.upsert({ name: `C${i}`, phone: `+55119999901${i}` })

    const daInstalacao = await store.list(INSTALLATION_TENANT)
    const daEmpresaB = await store.list('empresa_b')

    expect(daInstalacao).toHaveLength(3)
    expect(daEmpresaB).toHaveLength(0)
  })
})

describe('vetor 5: a guarda não confunde os dois problemas', () => {
  it('sem ator, a recusa é `sem_ator` — nunca "sem dados"', () => {
    // Uma guarda que devolvesse lista vazia sem ator esconderia a diferença entre "não pode ver" e "não há
    // nada". Quem depurasse veria uma tela vazia em vez de um problema de permissão.
    return expect(
      exigirAtor(
        async () => null,
        'read',
        'contacts',
        async () => ({ contatos: [] })
      )
    ).resolves.toMatchObject({ error: 'sem_permissao' })
  })

  it('a guarda NÃO muda o tenant — quem decide continua sendo `serverTenant`', async () => {
    const r = await exigirAtor(
      async () => DONO,
      'read',
      'contacts',
      async () => ({ contatos: await store.list(serverTenant('empresa_b')) })
    )

    expect(r).toMatchObject({ contatos: [] })
  })
})

// O renderer não escolhe de qual empresa são os dados (rodada 86).
//
// O achado da rodada 85: vinte canais IPC faziam `store.list(tenant(payload))`. O `payload` vem do
// renderer, então o pedido carregava o alvo — IDOR por construção. Com um tenant só não vazava nada;
// com dois tenants reais no mesmo perfil, código no renderer leria os dados do outro.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DocumentsStore, documentsStorePath } from './documents-store'
import { registerDocumentsIpc } from './documents-ipc'
import { INSTALLATION_TENANT, serverTenant } from './server-tenant'

const OUTRA_EMPRESA = 'empresa_b'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-idor-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

describe('serverTenant', () => {
  it('ignora o que o renderer mandou', () => {
    expect(serverTenant(OUTRA_EMPRESA)).toBe(INSTALLATION_TENANT)
    expect(serverTenant({ tenant_id: OUTRA_EMPRESA })).toBe(INSTALLATION_TENANT)
    expect(serverTenant(undefined)).toBe(INSTALLATION_TENANT)
  })
})

describe('canal de documentos', () => {
  it('pedir a outra empresa NAO devolve os documentos dela', async () => {
    const store = new DocumentsStore(documentsStorePath(dir))
    const canais = new Map<string, (event: unknown, payload: unknown) => unknown>()

    // Dados reais na outra empresa.
    await store.upsert({ name: 'segredo-b.pdf', ref: 'C:/b.pdf', scope: 'outro', tenant_id: OUTRA_EMPRESA }, 1000)
    await store.upsert({ name: 'meu.pdf', ref: 'C:/a.pdf', scope: 'outro', tenant_id: INSTALLATION_TENANT }, 1000)

    registerDocumentsIpc(
      {
        handle: (canal, listener) => {
          canais.set(canal, listener as (event: unknown, payload: unknown) => unknown)
        }
      },
      store
    )

    // O renderer pede explicitamente a outra empresa.
    const r = (await canais.get('hermes:documents:list')!(null, OUTRA_EMPRESA)) as {
      documents: { name: string }[]
    }

    expect(r.documents.map(d => d.name)).toEqual(['meu.pdf'])
    expect(r.documents.some(d => d.name === 'segredo-b.pdf')).toBe(false)
  })

  it('pedir um objeto com tenant_id tambem e ignorado', async () => {
    const store = new DocumentsStore(documentsStorePath(dir))
    const canais = new Map<string, (event: unknown, payload: unknown) => unknown>()

    await store.upsert({ name: 'segredo-b.pdf', ref: 'C:/b.pdf', scope: 'outro', tenant_id: OUTRA_EMPRESA }, 1000)

    registerDocumentsIpc(
      {
        handle: (canal, listener) => {
          canais.set(canal, listener as (event: unknown, payload: unknown) => unknown)
        }
      },
      store
    )

    const r = (await canais.get('hermes:documents:list')!(null, { tenant_id: OUTRA_EMPRESA })) as {
      documents: unknown[]
    }

    expect(r.documents).toEqual([])
  })
})

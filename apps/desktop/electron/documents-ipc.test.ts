import { describe, expect, it, vi } from 'vitest'

import { registerDocumentsIpc } from './documents-ipc'
import type { DocumentRecord } from './documents-store'
import { INSTALLATION_TENANT } from './server-tenant'

const doc: DocumentRecord = {
  created_at: 1,
  custodian: '',
  id: 'doc_1',
  kind: 'contrato',
  name: 'a.pdf',
  notes: '',
  ref: 'C:/a.pdf',
  scope: 'outro',
  scope_id: '',
  size_bytes: 10,
  tenant_id: 'local',
  updated_at: 1
}

function fake(over: Partial<Record<'list' | 'remove' | 'totals' | 'upsert', unknown>> = {}) {
  const canais = new Map<string, (event: unknown, payload: unknown) => unknown>()

  const store = {
    list: vi.fn(async (_t?: string) => [doc]),
    remove: vi.fn(async (_id: string) => ({ ok: true as const })),
    totals: vi.fn(async (_t?: string) => ({ bytes: 10, por_kind: {}, total: 1 })),
    upsert: vi.fn(async (_input: unknown) => ({ document: doc })),
    ...over
  }

  registerDocumentsIpc(
    {
      handle: (canal, listener) => {
        canais.set(canal, listener as (event: unknown, payload: unknown) => unknown)
      }
    },
    store as never,
    { actorOf: async () => ({ id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }) }
  )

  return { canais, store }
}

describe('canais de documentos', () => {
  it('registra os tres canais', () => {
    const { canais } = fake()

    expect([...canais.keys()].sort()).toEqual([
      'hermes:documents:list',
      'hermes:documents:remove',
      'hermes:documents:upsert'
    ])
  })

  it('list devolve documentos E totais: a tela nao recalcula', async () => {
    const { canais } = fake()
    const r = (await canais.get('hermes:documents:list')!(null, undefined)) as {
      documents: DocumentRecord[]
      totals: { total: number }
    }

    expect(r.documents).toHaveLength(1)
    expect(r.totals.total).toBe(1)
  })

  // Estes dois testes ANTES afirmavam o contrario: que o canal repassava o tenant pedido pelo renderer.
  // Era o IDOR da rodada 85 escrito como se fosse o comportamento desejado. Um teste que codifica o bug
  // e pior que nenhum teste - ele protege o defeito.
  it('list NAO repassa o tenant do renderer: usa o do servidor', async () => {
    const { canais, store } = fake()

    await canais.get('hermes:documents:list')!(null, 'outro')

    expect(store.list).toHaveBeenCalledWith(INSTALLATION_TENANT)
    expect(store.list).not.toHaveBeenCalledWith('outro')
  })

  it('list sem payload tambem usa o tenant do servidor', async () => {
    const { canais, store } = fake()

    await canais.get('hermes:documents:list')!(null, undefined)

    expect(store.list).toHaveBeenCalledWith(INSTALLATION_TENANT)
  })

  it('remove aceita id como string e recusa forma inesperada sem quebrar', async () => {
    const { canais, store } = fake()

    await canais.get('hermes:documents:remove')!(null, 'doc_1')
    expect(store.remove).toHaveBeenCalledWith('doc_1')

    await canais.get('hermes:documents:remove')!(null, { nao: 'e id' })
    expect(store.remove).toHaveBeenLastCalledWith('')
  })

  it('upsert repassa o payload cru: a validacao e do store, nao do IPC', async () => {
    const { canais, store } = fake()
    const payload = { name: 'x.pdf', ref: 'C:/x.pdf' }

    await canais.get('hermes:documents:upsert')!(null, payload)

    expect(store.upsert).toHaveBeenCalledWith(payload)
  })
})

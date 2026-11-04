import { describe, expect, it, vi } from 'vitest'

import { registerDocumentsIpc } from './documents-ipc'
import type { DocumentRecord } from './documents-store'

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
    store as never
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

  it('list repassa o tenant pedido', async () => {
    const { canais, store } = fake()

    await canais.get('hermes:documents:list')!(null, 'outro')

    expect(store.list).toHaveBeenCalledWith('outro')
  })

  it('list sem payload usa o tenant padrao', async () => {
    const { canais, store } = fake()

    await canais.get('hermes:documents:list')!(null, undefined)

    expect(store.list).toHaveBeenCalledWith(undefined)
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

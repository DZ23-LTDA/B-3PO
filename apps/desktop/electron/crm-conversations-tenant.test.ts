// Conversas com tenant (rodada 83). O ULTIMO dos quatro stores do CRM.
//
// Com este, os 17 dominios isolam por empresa: 10 do ERP + 4 do CRM + RH, compras, marketing.

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { conversationsStorePath, CrmConversationStore } from './crm-conversations-store'

const A = 'empresa_a'
const B = 'empresa_b'

let dir = ''
let file = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-conv-tenant-'))
  file = conversationsStorePath(dir)
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const conversa = (over: Record<string, unknown> = {}) => ({ title: 'Ana', ...over })

describe('isolamento das conversas', () => {
  it('conversa de A nao aparece em B', async () => {
    const store = new CrmConversationStore(file)

    await store.upsert(conversa({ title: 'Cliente A' }), A)

    expect((await store.list(A)).map(c => c.title)).toEqual(['Cliente A'])
    expect(await store.list(B)).toEqual([])
  })

  it('mesmo telefone em duas empresas sao conversas separadas', async () => {
    const store = new CrmConversationStore(file)

    await store.upsert(conversa({ contact_phone: '5511999998888', title: 'Na A' }), A)
    await store.upsert(conversa({ contact_phone: '5511999998888', title: 'Na B' }), B)

    expect((await store.list(A)).map(c => c.title)).toEqual(['Na A'])
    expect((await store.list(B)).map(c => c.title)).toEqual(['Na B'])
  })

  it('remover de A nao apaga a de B', async () => {
    const store = new CrmConversationStore(file)

    const a = await store.upsert(conversa({ title: 'A' }), A)
    const b = await store.upsert(conversa({ title: 'B' }), B)

    if ('error' in a || 'error' in b) throw new Error('nao criou')

    await store.remove(a.conversation.id, A)

    expect(await store.list(A)).toEqual([])
    expect((await store.list(B)).map(c => c.title)).toEqual(['B'])
  })

  it('id de outra empresa nao serve para editar', async () => {
    const store = new CrmConversationStore(file)

    const a = await store.upsert(conversa({ title: 'Da A' }), A)

    if ('error' in a) throw new Error(a.error)

    await store.upsert({ id: a.conversation.id, title: 'sequestrada' }, B)

    expect((await store.list(A)).map(c => c.title)).toEqual(['Da A'])
  })
})

describe('arquivo anterior ao multiempresa', () => {
  it('conversa sem tenant e lida como local', async () => {
    await writeFile(
      file,
      JSON.stringify({
        conversations: [
          {
            contact_phone: '',
            created_at: 1,
            id: 'conv_antiga',
            last_message_at: null,
            last_message_preview: '',
            messages: [],
            notes: '',
            status: 'aberta',
            tags: [],
            title: 'Antiga',
            unread: 0,
            updated_at: 1
          }
        ],
        schema_version: 1
      }),
      'utf8'
    )

    const store = new CrmConversationStore(file)

    expect((await store.list('local')).map(c => c.title)).toEqual(['Antiga'])
    expect(await store.list('empresa_a')).toEqual([])
  })
})

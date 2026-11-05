// Conversas do CRM exigem ator (rodada 220).
//
// O CANAL MAIS SENSIVEL DO CRM
//
// Uma conversa carrega o conteudo do que um cliente escreveu. Nao e um telefone numa lista: e o historico do
// atendimento, de terceiro. Se este canal ficasse aberto, todo o trabalho das rodadas 218-219 estaria
// protegendo o indice e deixando o livro aberto.
//
// O TESTE PROVA A RECUSA NO ESTADO, NAO SO NA RESPOSTA
//
// Cada caso verifica que o store NAO mudou. Uma guarda que roda depois da escrita devolve `sem_permissao` e
// grava assim mesmo.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { registerCrmConversationsIpc } from './crm-conversations-ipc'
import { CrmConversationStore, conversationsStorePath } from './crm-conversations-store'
import type { Actor } from './rbac'

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>

function fakeIpc() {
  const handlers = new Map<string, Handler>()

  return {
    channels: () => [...handlers.keys()],
    handle: (channel: string, handler: Handler) => handlers.set(channel, handler),
    invoke: async (channel: string, ...args: unknown[]) => {
      const handler = handlers.get(channel)

      if (!handler) throw new Error(`canal ausente: ${channel}`)

      return handler({}, ...args)
    }
  }
}

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }
const SO_LE: Actor = { id: 'leitor', kind: 'human', level: 'READ', role: 'viewer' }

async function comConversas(
  ator: Actor | null,
  run: (ipc: ReturnType<typeof fakeIpc>, store: CrmConversationStore) => Promise<void>
) {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-conv-perm-'))

  try {
    const store = new CrmConversationStore(conversationsStorePath(dir))
    const ipc = fakeIpc()

    registerCrmConversationsIpc(ipc, store, { actorOf: async () => ator })

    await run(ipc, store)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const UMA = {
  contact_phone: '+5511999999999',
  id: 'c1',
  last_message_at: null,
  last_message_preview: 'oi',
  messages: [],
  notes: '',
  tags: [],
  title: 'Cliente'
}

describe('sem ator', () => {
  it('list recusa sem devolver conversa', async () => {
    // O ponto: a conversa de terceiro nao sai junto com o erro.
    await comConversas(null, async ipc => {
      const r = (await ipc.invoke('hermes:crm-conversations:list')) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect(r.reason).toBe('sem_ator')
      expect(r.conversations).toBeUndefined()
    })
  })

  it('upsert recusa e o store nao muda', async () => {
    await comConversas(null, async (ipc, store) => {
      const r = (await ipc.invoke('hermes:crm-conversations:upsert', UMA)) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect(await store.list()).toHaveLength(0)
    })
  })

  it('remove recusa sem apagar', async () => {
    await comConversas(null, async (ipc, store) => {
      await store.upsert(UMA)

      const r = (await ipc.invoke('hermes:crm-conversations:remove', 'c1')) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect(await store.list()).toHaveLength(1)
    })
  })
})

describe('quem so le', () => {
  it('le as conversas', async () => {
    await comConversas(SO_LE, async (ipc, store) => {
      await store.upsert(UMA)

      const r = (await ipc.invoke('hermes:crm-conversations:list')) as { conversations: unknown[] }

      expect(r.conversations).toHaveLength(1)
    })
  })

  it('NAO grava', async () => {
    await comConversas(SO_LE, async (ipc, store) => {
      const r = (await ipc.invoke('hermes:crm-conversations:upsert', UMA)) as Record<string, unknown>

      expect(r.error).toBe('sem_permissao')
      expect(await store.list()).toHaveLength(0)
    })
  })
})

describe('o dono', () => {
  it('grava e lista', async () => {
    await comConversas(DONO, async (ipc, store) => {
      await ipc.invoke('hermes:crm-conversations:upsert', UMA)

      expect(await store.list()).toHaveLength(1)
    })
  })
})

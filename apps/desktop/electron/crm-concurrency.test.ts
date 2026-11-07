// Concorrência nos stores de CRM (rodada 237).
//
// O mesmo defeito do estoque (r234) e do financeiro/vendas (r235): read -> valida -> write sem serialização.
// A r236 mediu que 4 dos 4 stores de CRM estavam expostos e a tentativa de aplicar a fila em massa quebrou por
// regex; a r237 aplicou com assinatura literal.
//
// O que importa NÃO é a resposta de cada chamada — é quantos registros o ARQUIVO tem depois. Quatro contatos
// simultâneos com uma resposta "ok" cada e um contato no arquivo significam três clientes perdidos.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CrmContactStore, crmStorePath } from './crm-contacts-store'
import { CrmConversationStore, conversationsStorePath } from './crm-conversations-store'
import { CrmPipelineStore, pipelineStorePath } from './crm-pipeline-store'
import { CrmTaskStore, tasksStorePath } from './crm-tasks-store'

async function comDir(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-crm-conc-'))

  try {
    await run(dir)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('crm: escritas simultaneas', () => {
  it('quatro contatos simultaneos viram quatro contatos', async () => {
    await comDir(async dir => {
      const store = new CrmContactStore(crmStorePath(dir))

      await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          store.upsert({ name: `Cliente ${i}`, phone: `551199999000${i}` })
        )
      )

      const contacts = await store.list()

      expect(contacts.length).toBe(4)
    })
  })

  it('quatro oportunidades simultaneas viram quatro', async () => {
    await comDir(async dir => {
      const store = new CrmPipelineStore(pipelineStorePath(dir))

      await Promise.all(
        Array.from({ length: 4 }, (_, i) => store.upsert({ contact_phone: `551199999000${i}`, stage: 'novo', title: `Oportunidade ${i}`, value_cents: 10_000 }))
      )

      const opportunities = await store.list()

      expect(opportunities.length).toBe(4)
    })
  })

  it('quatro tarefas simultaneas viram quatro', async () => {
    await comDir(async dir => {
      const store = new CrmTaskStore(tasksStorePath(dir))

      await Promise.all(Array.from({ length: 4 }, (_, i) => store.upsert({ title: `Tarefa ${i}` })))

      const tasks = await store.list()

      expect(tasks.length).toBe(4)
    })
  })

  it('quatro conversas simultaneas viram quatro', async () => {
    await comDir(async dir => {
      const store = new CrmConversationStore(conversationsStorePath(dir))

      await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          store.upsert({ contact_phone: `551199999000${i}`, last_message: `mensagem ${i}`, title: `Conversa ${i}` })
        )
      )

      const conversations = await store.list()

      expect(conversations.length).toBe(4)
    })
  })
})

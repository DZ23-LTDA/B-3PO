// Conversas do CRM expostas ao renderer por IPC. Mesmo desenho de contatos, funil e tarefas: o processo
// principal valida e grava, e um erro de validação volta como `{ error }` em vez de exceção.
//
// PERMISSÃO (r220)
//
// **O canal mais sensível do CRM.** Uma conversa carrega o conteúdo do que um cliente escreveu — não só um
// telefone. Listar já expõe histórico de terceiro; gravar insere mensagem no atendimento.
//
// `read` para list; `execute` para upsert/remove. Sem ator, nem a lista sai.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { CrmConversation } from './crm-conversations-store'

export type CrmConversationsResult = { error: string } | { conversation: CrmConversation }

export interface CrmConversationStoreLike {
  list: () => Promise<CrmConversation[]>
  remove: (id: string) => Promise<{ error: string } | { ok: true }>
  upsert: (input: unknown) => Promise<CrmConversationsResult>
}

export interface CrmConversationsIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerCrmConversationsIpc(
  ipcMain: IpcRegistrar,
  store: CrmConversationStoreLike,
  deps: CrmConversationsIpcDeps
): void {
  ipcMain.handle(
    'hermes:crm-conversations:list',
    async (): Promise<Denied | { conversations: CrmConversation[] }> =>
      exigirAtor(deps.actorOf, 'read', 'crm-conversation', async () => ({ conversations: await store.list() }))
  )

  ipcMain.handle(
    'hermes:crm-conversations:upsert',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<Denied | CrmConversationsResult> =>
      exigirAtor(deps.actorOf, 'execute', 'crm-conversation', async () => store.upsert(payload))
  )

  ipcMain.handle(
    'hermes:crm-conversations:remove',
    async (_event: IpcMainInvokeEvent, id: unknown): Promise<Denied | { error: string } | { ok: true }> =>
      exigirAtor(deps.actorOf, 'execute', 'crm-conversation', async () =>
        store.remove(typeof id === 'string' ? id : '')
      )
  )
}

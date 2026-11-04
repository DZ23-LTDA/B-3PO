// Conversas do CRM expostas ao renderer por IPC. Mesmo desenho de contatos, funil e tarefas: o processo
// principal valida e grava, e um erro de validação volta como `{ error }` em vez de exceção.

import type { IpcRegistrar } from './ipc-types'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { CrmConversation } from './crm-conversations-store'

export type CrmConversationsResult = { error: string } | { conversation: CrmConversation }

export interface CrmConversationStoreLike {
  list: () => Promise<CrmConversation[]>
  remove: (id: string) => Promise<{ error: string } | { ok: true }>
  upsert: (input: unknown) => Promise<CrmConversationsResult>
}

export function registerCrmConversationsIpc(
  ipcMain: IpcRegistrar,
  store: CrmConversationStoreLike
): void {
  ipcMain.handle(
    'hermes:crm-conversations:list',
    async (): Promise<{ conversations: CrmConversation[] }> => ({ conversations: await store.list() })
  )

  ipcMain.handle(
    'hermes:crm-conversations:upsert',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<CrmConversationsResult> => store.upsert(payload)
  )

  ipcMain.handle(
    'hermes:crm-conversations:remove',
    (_event: IpcMainInvokeEvent, id: unknown): Promise<{ error: string } | { ok: true }> =>
      store.remove(typeof id === 'string' ? id : '')
  )
}

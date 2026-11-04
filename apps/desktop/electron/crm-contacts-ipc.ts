// Contatos do CRM expostos ao renderer por IPC.
//
// O renderer pede; o processo principal valida e grava (o store é dono do arquivo). Os handlers devolvem
// `{ contacts }` ou `{ error }` — nunca lançam para a janela, porque um erro de validação é resposta, não
// acidente.

import { registerCrmCompanyLogoIpc } from './crm-company-logo'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import { CrmContactStore, crmStorePath, type CrmContact } from './crm-contacts-store'
import { registerCrmPipelineIpc } from './crm-pipeline-ipc'
import { CrmPipelineStore, pipelineStorePath } from './crm-pipeline-store'
import { CrmConversationStore, conversationsStorePath } from './crm-conversations-store'
import { ingestEnabled, maybeStartWhatsAppIngest } from './crm-whatsapp-boot'
import { registerCrmConversationsIpc } from './crm-conversations-ipc'
import { registerCrmTasksIpc } from './crm-tasks-ipc'
import { CrmTaskStore, tasksStorePath } from './crm-tasks-store'

export type CrmContactsResult = { contacts: CrmContact[] } | { error: string }

export interface CrmContactsStore {
  list: () => Promise<CrmContact[]>
  remove: (phone: string) => Promise<{ contacts: CrmContact[] }>
  upsert: (input: unknown) => Promise<CrmContactsResult>
}

export function registerCrmContactsIpc(ipcMain: Pick<IpcMain, 'handle'>, store: CrmContactsStore): void {
  ipcMain.handle('hermes:crm-contacts:list', async (): Promise<{ contacts: CrmContact[] }> => ({
    contacts: await store.list()
  }))

  ipcMain.handle('hermes:crm-contacts:upsert', (_event: IpcMainInvokeEvent, payload: unknown): Promise<CrmContactsResult> =>
    store.upsert(payload)
  )

  ipcMain.handle(
    'hermes:crm-contacts:remove',
    (_event: IpcMainInvokeEvent, phone: unknown): Promise<{ contacts: CrmContact[] }> =>
      store.remove(typeof phone === 'string' ? phone : '')
  )
}

/** Monta o store do usuário e registra os handlers: `main.ts` só precisa de uma chamada. */
export function mountCrmContacts(ipcMain: Pick<IpcMain, 'handle'>, userDataDir: string): CrmConversationStore {
  registerCrmCompanyLogoIpc(ipcMain)
  registerCrmContactsIpc(ipcMain, new CrmContactStore(crmStorePath(userDataDir)))
  registerCrmPipelineIpc(ipcMain, new CrmPipelineStore(pipelineStorePath(userDataDir)))
  registerCrmTasksIpc(ipcMain, new CrmTaskStore(tasksStorePath(userDataDir)))
  const conversas = new CrmConversationStore(conversationsStorePath(userDataDir))
  registerCrmConversationsIpc(ipcMain, conversas)

  // Webhook do WhatsApp: sobe apenas com opt-in explicito e credenciais presentes (crm-whatsapp-boot.ts).
  // Fica aqui, e nao no main.ts, porque main.ts esta no teto do ratchet de saude e nao pode crescer.
  void maybeStartWhatsAppIngest({
    appSecret: process.env.WHATSAPP_CLOUD_APP_SECRET,
    enabled: ingestEnabled(process.env),
    sink: conversas,
    token: process.env.B3PO_CRM_INGEST_TOKEN,
  }).catch(() => {
    // abrir a porta e opcional: falhar aqui nao pode derrubar o app
  })

  // devolvido para o listener do webhook usar o MESMO store do IPC (uma instancia, um arquivo)
  return conversas
}

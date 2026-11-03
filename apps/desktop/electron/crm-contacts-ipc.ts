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
export function mountCrmContacts(ipcMain: Pick<IpcMain, 'handle'>, userDataDir: string): void {
  registerCrmCompanyLogoIpc(ipcMain)
  registerCrmContactsIpc(ipcMain, new CrmContactStore(crmStorePath(userDataDir)))
  registerCrmPipelineIpc(ipcMain, new CrmPipelineStore(pipelineStorePath(userDataDir)))
}

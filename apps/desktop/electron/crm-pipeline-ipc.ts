// Funil do CRM exposto ao renderer por IPC. Mesmo desenho dos contatos: o processo principal valida e grava,
// e um erro de validação volta como resposta `{ error }` em vez de exceção.

import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { CrmOpportunity } from './crm-pipeline-store'

export type CrmPipelineResult = { error: string } | { opportunities: CrmOpportunity[] }

export interface CrmPipelineStoreLike {
  list: () => Promise<CrmOpportunity[]>
  remove: (id: string) => Promise<{ opportunities: CrmOpportunity[] }>
  upsert: (input: unknown) => Promise<CrmPipelineResult>
}

export function registerCrmPipelineIpc(ipcMain: Pick<IpcMain, 'handle'>, store: CrmPipelineStoreLike): void {
  ipcMain.handle('hermes:crm-pipeline:list', async (): Promise<{ opportunities: CrmOpportunity[] }> => ({
    opportunities: await store.list()
  }))

  ipcMain.handle(
    'hermes:crm-pipeline:upsert',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<CrmPipelineResult> => store.upsert(payload)
  )

  ipcMain.handle(
    'hermes:crm-pipeline:remove',
    (_event: IpcMainInvokeEvent, id: unknown): Promise<{ opportunities: CrmOpportunity[] }> =>
      store.remove(typeof id === 'string' ? id : '')
  )
}

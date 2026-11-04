// Tarefas do CRM expostas ao renderer por IPC. Mesmo desenho dos contatos e do funil: o processo principal
// valida e grava, e um erro de validação volta como resposta `{ error }` em vez de exceção.

import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { CrmTask } from './crm-tasks-store'

export type CrmTasksResult = { error: string } | { tasks: CrmTask[] }

export interface CrmTaskStoreLike {
  list: () => Promise<CrmTask[]>
  remove: (id: string) => Promise<{ tasks: CrmTask[] }>
  upsert: (input: unknown) => Promise<CrmTasksResult>
}

export function registerCrmTasksIpc(ipcMain: Pick<IpcMain, 'handle'>, store: CrmTaskStoreLike): void {
  ipcMain.handle('hermes:crm-tasks:list', async (): Promise<{ tasks: CrmTask[] }> => ({ tasks: await store.list() }))

  ipcMain.handle(
    'hermes:crm-tasks:upsert',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<CrmTasksResult> => store.upsert(payload)
  )

  ipcMain.handle(
    'hermes:crm-tasks:remove',
    (_event: IpcMainInvokeEvent, id: unknown): Promise<{ tasks: CrmTask[] }> =>
      store.remove(typeof id === 'string' ? id : '')
  )
}

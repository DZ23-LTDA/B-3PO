// Tarefas do CRM expostas ao renderer por IPC. Mesmo desenho dos contatos e do funil: o processo principal
// valida e grava, e um erro de validação volta como resposta `{ error }` em vez de exceção.
//
// PERMISSÃO (r219)
//
// Tarefa diz quem cuida do cliente e o que ficou combinado — dado pessoal e operacional. `read` para list,
// `execute` para as duas escritas.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { CrmTask } from './crm-tasks-store'

export type CrmTasksResult = { error: string } | { tasks: CrmTask[] }

export interface CrmTaskStoreLike {
  list: () => Promise<CrmTask[]>
  remove: (id: string) => Promise<{ tasks: CrmTask[] }>
  upsert: (input: unknown) => Promise<CrmTasksResult>
}

export interface CrmTasksIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerCrmTasksIpc(ipcMain: IpcRegistrar, store: CrmTaskStoreLike, deps: CrmTasksIpcDeps): void {
  ipcMain.handle(
    'hermes:crm-tasks:list',
    async (): Promise<Denied | { tasks: CrmTask[] }> =>
      exigirAtor(deps.actorOf, 'read', 'crm-task', async () => ({ tasks: await store.list() }))
  )

  ipcMain.handle(
    'hermes:crm-tasks:upsert',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<Denied | CrmTasksResult> =>
      exigirAtor(deps.actorOf, 'execute', 'crm-task', async () => store.upsert(payload))
  )

  ipcMain.handle(
    'hermes:crm-tasks:remove',
    async (_event: IpcMainInvokeEvent, id: unknown): Promise<Denied | { tasks: CrmTask[] }> =>
      exigirAtor(deps.actorOf, 'execute', 'crm-task', async () => store.remove(typeof id === 'string' ? id : ''))
  )
}

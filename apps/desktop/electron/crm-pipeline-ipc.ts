// Funil do CRM exposto ao renderer por IPC. Mesmo desenho dos contatos: o processo principal valida e grava,
// e um erro de validação volta como resposta `{ error }` em vez de exceção.
//
// PERMISSÃO (r219)
//
// Oportunidade carrega valor de negócio (`amount_cents`) e o cliente. `list` já revela o pipeline inteiro;
// `upsert`/`remove` movem esse valor. `read` para list, `execute` para as duas escritas.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { CrmOpportunity } from './crm-pipeline-store'

export type CrmPipelineResult = { error: string } | { opportunities: CrmOpportunity[] }

export interface CrmPipelineStoreLike {
  list: () => Promise<CrmOpportunity[]>
  remove: (id: string) => Promise<{ opportunities: CrmOpportunity[] }>
  upsert: (input: unknown) => Promise<CrmPipelineResult>
}

export interface CrmPipelineIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerCrmPipelineIpc(
  ipcMain: IpcRegistrar,
  store: CrmPipelineStoreLike,
  deps: CrmPipelineIpcDeps
): void {
  ipcMain.handle(
    'hermes:crm-pipeline:list',
    async (): Promise<Denied | { opportunities: CrmOpportunity[] }> =>
      exigirAtor(deps.actorOf, 'read', 'crm-pipeline', async () => ({ opportunities: await store.list() }))
  )

  ipcMain.handle(
    'hermes:crm-pipeline:upsert',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<Denied | CrmPipelineResult> =>
      exigirAtor(deps.actorOf, 'execute', 'crm-pipeline', async () => store.upsert(payload))
  )

  ipcMain.handle(
    'hermes:crm-pipeline:remove',
    async (_event: IpcMainInvokeEvent, id: unknown): Promise<Denied | { opportunities: CrmOpportunity[] }> =>
      exigirAtor(deps.actorOf, 'execute', 'crm-pipeline', async () =>
        store.remove(typeof id === 'string' ? id : '')
      )
  )
}

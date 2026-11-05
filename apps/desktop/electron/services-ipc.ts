// Serviços expostos ao renderer por IPC.
//
// PERMISSÃO (r224)
//
// Serviço carrega preço e duração: `list` já revela a tabela de preços do negócio. `read` para list/find,
// `execute` para save/remove.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import type { IpcMainInvokeEvent } from 'electron'

import type { Service } from './services-store'

export interface ServicesStoreLike {
  findByName: (name: string, tenantId?: string) => Promise<Service | null>
  list: (tenantId?: string) => Promise<Service[]>
  remove: (id: string) => Promise<{ error: string } | { services: Service[] }>
  upsert: (input: unknown) => Promise<{ error: string } | { service: Service; services: Service[] }>
}

export interface ServicesIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerServicesIpc(ipcMain: IpcRegistrar, store: ServicesStoreLike, deps: ServicesIpcDeps): void {
  ipcMain.handle(
    'hermes:services:list',
    async (): Promise<Denied | { services: Service[] }> =>
      exigirAtor(deps.actorOf, 'read', 'services', async () => ({ services: await store.list() }))
  )

  ipcMain.handle(
    'hermes:services:find',
    async (_event: IpcMainInvokeEvent, name: unknown): Promise<Denied | { service: Service | null }> =>
      exigirAtor(deps.actorOf, 'read', 'services', async () => ({
        service: await store.findByName(typeof name === 'string' ? name : '')
      }))
  )

  ipcMain.handle(
    'hermes:services:save',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'services', async () => store.upsert(payload))
  )

  ipcMain.handle(
    'hermes:services:remove',
    async (_event: IpcMainInvokeEvent, id: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'services', async () => store.remove(typeof id === 'string' ? id : ''))
  )
}

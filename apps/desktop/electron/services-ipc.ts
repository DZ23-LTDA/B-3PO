// Catálogo de serviços exposto ao renderer.

import type { IpcMainInvokeEvent } from 'electron'

import type { IpcRegistrar } from './ipc-types'
import type { Service } from './services-store'

export interface ServicesStoreLike {
  findByName: (name: string, tenantId?: string) => Promise<Service | null>
  list: (tenantId?: string) => Promise<Service[]>
  remove: (id: string) => Promise<{ error: string } | { services: Service[] }>
  upsert: (input: unknown) => Promise<{ error: string } | { service: Service; services: Service[] }>
}

export function registerServicesIpc(ipcMain: IpcRegistrar, store: ServicesStoreLike): void {
  ipcMain.handle('hermes:services:list', async (): Promise<{ services: Service[] }> => ({ services: await store.list() }))

  ipcMain.handle(
    'hermes:services:find',
    async (_event: IpcMainInvokeEvent, name: unknown): Promise<{ service: Service | null }> => ({
      service: await store.findByName(typeof name === 'string' ? name : '')
    })
  )

  ipcMain.handle(
    'hermes:services:save',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<{ error: string } | { service: Service; services: Service[] }> =>
      store.upsert(payload)
  )

  ipcMain.handle(
    'hermes:services:remove',
    (_event: IpcMainInvokeEvent, id: unknown): Promise<{ error: string } | { services: Service[] }> =>
      store.remove(typeof id === 'string' ? id : '')
  )
}

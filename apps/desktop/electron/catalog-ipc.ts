// Catálogo de produtos exposto ao renderer por IPC.
//
// Mesmo desenho dos IPC do CRM: o processo principal valida e grava, e erro de validação volta como
// `{ error }`. O renderer nunca recebe exceção nem decide o que é válido.

import type { IpcRegistrar } from './ipc-types'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { Product } from './catalog-store'

export type CatalogResult = { error: string } | { products: Product[] }

export interface CatalogStoreLike {
  list: (tenantId?: string) => Promise<Product[]>
  remove: (id: string, tenantId?: string) => Promise<{ products: Product[] }>
  upsert: (input: unknown) => Promise<CatalogResult>
}

function tenant(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function registerCatalogIpc(ipcMain: IpcRegistrar, store: CatalogStoreLike): void {
  ipcMain.handle(
    'hermes:catalog:list',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ products: Product[] }> => ({
      products: await store.list(tenant(tenantId))
    })
  )

  ipcMain.handle(
    'hermes:catalog:upsert',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<CatalogResult> => store.upsert(payload)
  )

  ipcMain.handle(
    'hermes:catalog:remove',
    (_event: IpcMainInvokeEvent, id: unknown, tenantId: unknown): Promise<{ products: Product[] }> =>
      store.remove(typeof id === 'string' ? id : '', tenant(tenantId))
  )
}

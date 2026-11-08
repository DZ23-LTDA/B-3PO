// Catálogo de produtos exposto ao renderer por IPC.
//
// Mesmo desenho dos IPC do CRM: o processo principal valida e grava, e erro de validação volta como
// `{ error }`. O renderer nunca recebe exceção nem decide o que é válido.
//
// PERMISSÃO (r223)
//
// Catálogo é preço e custo: `list` já revela a margem de cada produto. `read` para list, `execute` para
// upsert/remove.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { Product } from './catalog-store'

export type CatalogResult = { error: string } | { products: Product[] }

export interface CatalogStoreLike {
  list: (tenantId?: string) => Promise<Product[]>
  remove: (id: string, tenantId?: string) => Promise<{ products: Product[] }>
  upsert: (input: unknown) => Promise<CatalogResult>
}

export interface CatalogIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerCatalogIpc(ipcMain: IpcRegistrar, store: CatalogStoreLike, deps: CatalogIpcDeps): void {
  ipcMain.handle(
    'hermes:catalog:list',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<Denied | { products: Product[] }> =>
      exigirAtor(deps.actorOf, 'read', 'catalog', async () => ({ products: await store.list(serverTenant(tenantId)) }))
  )

  ipcMain.handle(
    'hermes:catalog:upsert',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<Denied | CatalogResult> =>
      exigirAtor(deps.actorOf, 'execute', 'catalog', async () => store.upsert(payload))
  )

  ipcMain.handle(
    'hermes:catalog:remove',
    async (_event: IpcMainInvokeEvent, id: unknown, tenantId: unknown): Promise<Denied | { products: Product[] }> =>
      exigirAtor(deps.actorOf, 'execute', 'catalog', async () =>
        store.remove(typeof id === 'string' ? id : '', serverTenant(tenantId))
      )
  )
}

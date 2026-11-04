// IPC do registro de documentos.
//
// Nao ha canal de upload: o binario nao passa por aqui (ver `documents-store.ts`). O que o renderer
// pode fazer e registrar, listar, corrigir metadados e remover o registro.

import type { IpcRegistrar } from './ipc-types'
import type { DocumentRecord } from './documents-store'

export interface DocumentsStoreLike {
  list: (tenantId?: string) => Promise<DocumentRecord[]>
  remove: (id: string) => Promise<{ error: string } | { ok: true }>
  totals: (tenantId?: string) => Promise<{ bytes: number; por_kind: Record<string, number>; total: number }>
  upsert: (input: unknown) => Promise<{ document: DocumentRecord } | { error: string }>
}

function tenant(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function registerDocumentsIpc(ipcMain: IpcRegistrar, store: DocumentsStoreLike): void {
  ipcMain.handle(
    'hermes:documents:list',
    async (_event: unknown, payload: unknown) => ({
      documents: await store.list(tenant(payload)),
      totals: await store.totals(tenant(payload))
    })
  )

  ipcMain.handle('hermes:documents:upsert', async (_event: unknown, payload: unknown) => store.upsert(payload))

  ipcMain.handle('hermes:documents:remove', async (_event: unknown, payload: unknown) =>
    store.remove(typeof payload === 'string' ? payload : '')
  )
}

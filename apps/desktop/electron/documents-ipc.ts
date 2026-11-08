// IPC do registro de documentos.
//
// Nao ha canal de upload: o binario nao passa por aqui (ver `documents-store.ts`). O que o renderer
// pode fazer e registrar, listar, corrigir metadados e remover o registro.
//
// PERMISSÃO (r224)
//
// Documento é o registro do que a empresa guarda — nome, tipo, tamanho, vínculo. `read` para list (que já traz
// os totais), `execute` para upsert/remove.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'
import type { DocumentRecord } from './documents-store'

export interface DocumentsStoreLike {
  list: (tenantId?: string) => Promise<DocumentRecord[]>
  remove: (id: string) => Promise<{ error: string } | { ok: true }>
  totals: (tenantId?: string) => Promise<{ bytes: number; por_kind: Record<string, number>; total: number }>
  upsert: (input: unknown) => Promise<{ document: DocumentRecord } | { error: string }>
}

export interface DocumentsIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerDocumentsIpc(ipcMain: IpcRegistrar, store: DocumentsStoreLike, deps: DocumentsIpcDeps): void {
  ipcMain.handle(
    'hermes:documents:list',
    async (_event: unknown, payload: unknown): Promise<Denied | Record<string, unknown>> =>
      exigirAtor(deps.actorOf, 'read', 'documents', async () => ({
        // O tenant vem do SERVIDOR, não do payload: aceitar o do renderer seria IDOR por construção.
        documents: await store.list(serverTenant(payload)),
        totals: await store.totals(serverTenant(payload))
      }))
  )

  ipcMain.handle(
    'hermes:documents:upsert',
    async (_event: unknown, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'documents', async () => store.upsert(payload))
  )

  ipcMain.handle(
    'hermes:documents:remove',
    async (_event: unknown, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'documents', async () =>
        store.remove(typeof payload === 'string' ? payload : '')
      )
  )
}

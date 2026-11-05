// Empresas e filiais expostas ao renderer.
//
// PERMISSÃO (r223)
//
// A empresa E o tenant — não há filtro por tenant aqui de propósito (`companies-store.ts` explica). Mas isso não
// torna o canal público: `saveCompany` cria o registro canônico que dá nome e CNPJ ao negócio, e `list` mostra
// todas as empresas da instalação. `read` para as consultas, `execute` para as duas escritas.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { Branch, Company, CompaniesStore } from './companies-store'

export interface CompaniesStoreLike {
  branches: (companyId: string) => Promise<Branch[]>
  list: () => Promise<Company[]>
  upsertBranch: (input: unknown) => Promise<{ branch: Branch; branches: Branch[] } | { error: string }>
  upsertCompany: (input: unknown) => Promise<{ companies: Company[]; company: Company } | { error: string }>
}

export interface CompaniesIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerCompaniesIpc(ipcMain: IpcRegistrar, store: CompaniesStoreLike, deps: CompaniesIpcDeps): void {
  ipcMain.handle(
    'hermes:companies:list',
    async (): Promise<Denied | { companies: Company[] }> =>
      exigirAtor(deps.actorOf, 'read', 'companies', async () => ({ companies: await store.list() }))
  )

  ipcMain.handle(
    'hermes:companies:branches',
    async (_event: IpcMainInvokeEvent, companyId: unknown): Promise<Denied | { branches: Branch[] }> =>
      exigirAtor(deps.actorOf, 'read', 'companies', async () => ({
        branches: await store.branches(typeof companyId === 'string' ? companyId : '')
      }))
  )

  ipcMain.handle(
    'hermes:companies:saveCompany',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'companies', async () => store.upsertCompany(payload))
  )

  ipcMain.handle(
    'hermes:companies:saveBranch',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'companies', async () => store.upsertBranch(payload))
  )
}

export type { CompaniesStore }

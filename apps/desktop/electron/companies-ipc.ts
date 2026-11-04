// Empresas e filiais expostas ao renderer.

import type { IpcRegistrar } from './ipc-types'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { Branch, Company, CompaniesStore } from './companies-store'

export interface CompaniesStoreLike {
  branches: (companyId: string) => Promise<Branch[]>
  list: () => Promise<Company[]>
  upsertBranch: (input: unknown) => Promise<{ branch: Branch; branches: Branch[] } | { error: string }>
  upsertCompany: (input: unknown) => Promise<{ companies: Company[]; company: Company } | { error: string }>
}

export function registerCompaniesIpc(ipcMain: IpcRegistrar, store: CompaniesStoreLike): void {
  ipcMain.handle('hermes:companies:list', async (): Promise<{ companies: Company[] }> => ({
    companies: await store.list()
  }))

  ipcMain.handle(
    'hermes:companies:branches',
    async (_event: IpcMainInvokeEvent, companyId: unknown): Promise<{ branches: Branch[] }> => ({
      branches: await store.branches(typeof companyId === 'string' ? companyId : '')
    })
  )

  ipcMain.handle(
    'hermes:companies:saveCompany',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<{ companies: Company[]; company: Company } | { error: string }> =>
      store.upsertCompany(payload)
  )

  ipcMain.handle(
    'hermes:companies:saveBranch',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<{ branch: Branch; branches: Branch[] } | { error: string }> =>
      store.upsertBranch(payload)
  )
}

export type { CompaniesStore }

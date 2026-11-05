// Financeiro exposto ao renderer.
//
// Mesmo desenho dos outros domínios: o main valida e grava, erro volta como valor, e os totais são
// calculados lá — a tela nunca soma nem decide o que está vencido.

import type { IpcRegistrar } from './ipc-types'
import { totaisPorCentroDeCusto } from './finance-store'
import { serverTenant } from './server-tenant'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { FinanceEntry, FinanceTotals } from './finance-store'

export interface FinanceStoreLike {
  append: (input: unknown) => Promise<{ entries: FinanceEntry[]; entry: FinanceEntry } | { error: string }>
  list: (tenantId?: string) => Promise<FinanceEntry[]>
  settle: (id: string, tenantId?: string, paidAt?: number) => Promise<{ entries: FinanceEntry[] } | { error: string }>
  totals: (tenantId?: string) => Promise<FinanceTotals>
}

export function registerFinanceIpc(ipcMain: IpcRegistrar, store: FinanceStoreLike): void {
  ipcMain.handle(
    'hermes:finance:list',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ entries: FinanceEntry[] }> => ({
      entries: await store.list(serverTenant(tenantId))
    })
  )

  ipcMain.handle(
    'hermes:finance:totals',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ totals: FinanceTotals }> => ({
      totals: await store.totals(serverTenant(tenantId))
    })
  )

  ipcMain.handle(
    'hermes:finance:append',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<{ entries: FinanceEntry[]; entry: FinanceEntry } | { error: string }> =>
      store.append(payload)
  )

  ipcMain.handle(
    'hermes:finance:settle',
    (_event: IpcMainInvokeEvent, id: unknown, tenantId: unknown): Promise<{ entries: FinanceEntry[] } | { error: string }> =>
      store.settle(typeof id === 'string' ? id : '', serverTenant(tenantId))
  )
  // Totais por centro de custo. Derivados dos lancamentos - nenhum total e somado no renderer.
  ipcMain.handle(
    'hermes:finance:costCenters',
    async (_event: IpcMainInvokeEvent, tenantId: unknown) => ({
      costCenters: totaisPorCentroDeCusto(await store.list(serverTenant(tenantId)))
    })
  )
}
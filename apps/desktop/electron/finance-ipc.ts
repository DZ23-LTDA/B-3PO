// Financeiro exposto ao renderer.
//
// Mesmo desenho dos outros domínios: o main valida e grava, erro volta como valor, e os totais são
// calculados lá — a tela nunca soma nem decide o que está vencido.

import type { IpcRegistrar } from './ipc-types'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { FinanceEntry, FinanceTotals } from './finance-store'

export interface FinanceStoreLike {
  append: (input: unknown) => Promise<{ entries: FinanceEntry[]; entry: FinanceEntry } | { error: string }>
  list: (tenantId?: string) => Promise<FinanceEntry[]>
  settle: (id: string, tenantId?: string, paidAt?: number) => Promise<{ entries: FinanceEntry[] } | { error: string }>
  totals: (tenantId?: string) => Promise<FinanceTotals>
}

function tenant(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function registerFinanceIpc(ipcMain: IpcRegistrar, store: FinanceStoreLike): void {
  ipcMain.handle(
    'hermes:finance:list',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ entries: FinanceEntry[] }> => ({
      entries: await store.list(tenant(tenantId))
    })
  )

  ipcMain.handle(
    'hermes:finance:totals',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ totals: FinanceTotals }> => ({
      totals: await store.totals(tenant(tenantId))
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
      store.settle(typeof id === 'string' ? id : '', tenant(tenantId))
  )
}

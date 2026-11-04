// Estoque exposto ao renderer por IPC.
//
// Mesmo desenho do catálogo: o processo principal valida e grava, erro volta como valor, e o saldo
// nunca é aceito do chamador — ele é derivado das movimentações no main.

import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { InventoryMovement } from './inventory-store'

export type MovementResult = { balance: number; movement: InventoryMovement; movements: InventoryMovement[] } | { error: string }

export interface InventoryStoreLike {
  append: (input: unknown) => Promise<MovementResult>
  balances: (tenantId?: string) => Promise<Record<string, number>>
  list: (tenantId?: string) => Promise<InventoryMovement[]>
}

function tenant(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function registerInventoryIpc(ipcMain: Pick<IpcMain, 'handle'>, store: InventoryStoreLike): void {
  ipcMain.handle(
    'hermes:inventory:list',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ movements: InventoryMovement[] }> => ({
      movements: await store.list(tenant(tenantId))
    })
  )

  ipcMain.handle(
    'hermes:inventory:balances',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ balances: Record<string, number> }> => ({
      balances: await store.balances(tenant(tenantId))
    })
  )

  ipcMain.handle(
    'hermes:inventory:append',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<MovementResult> => store.append(payload)
  )
}

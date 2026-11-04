// Estoque exposto ao renderer por IPC.
//
// Mesmo desenho do catálogo: o processo principal valida e grava, erro volta como valor, e o saldo
// nunca é aceito do chamador — ele é derivado das movimentações no main.

import type { IpcRegistrar } from './ipc-types'
import { serverTenant } from './server-tenant'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { InventoryMovement } from './inventory-store'

export type MovementResult = { balance: number; movement: InventoryMovement; movements: InventoryMovement[] } | { error: string }

export interface InventoryStoreLike {
  append: (input: unknown) => Promise<MovementResult>
  balances: (tenantId?: string) => Promise<Record<string, number>>
  list: (tenantId?: string) => Promise<InventoryMovement[]>
}

/** Opcional: anunciado quando o saldo CRUZA para zero — a transicao e o evento, nao o estado. */
export interface InventoryEventSink {
  stockRanOut: (info: { product_sku: string; tenant_id: string }) => Promise<void>
}

export function registerInventoryIpc(
  ipcMain: IpcRegistrar,
  store: InventoryStoreLike,
  onEvent?: InventoryEventSink
): void {
  ipcMain.handle(
    'hermes:inventory:list',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ movements: InventoryMovement[] }> => ({
      movements: await store.list(serverTenant(tenantId))
    })
  )

  ipcMain.handle(
    'hermes:inventory:balances',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ balances: Record<string, number> }> => ({
      balances: await store.balances(serverTenant(tenantId))
    })
  )

  ipcMain.handle(
    'hermes:inventory:append',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<MovementResult> => {
      const r = await store.append(payload)

      if ('error' in r || !onEvent) return r

      // Zerado e EVENTO so na transicao. Olhar alance === 0 a cada movimento dispararia de novo em
      // toda saida seguinte de um item ja zerado; e a passagem para zero que interessa.
      if (r.balance === 0 && r.movement.kind === 'saida') {
        try {
          await onEvent.stockRanOut({ product_sku: r.movement.product_sku, tenant_id: r.movement.tenant_id })
        } catch {
          // A automacao falhar nao desfaz a baixa de estoque.
        }
      }

      return r
    }
  )
}
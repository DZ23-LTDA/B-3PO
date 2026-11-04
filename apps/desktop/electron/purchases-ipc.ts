// Compras expostas ao renderer, incluindo o **recebimento**, que atravessa para o estoque.
//
// Mesma defesa de vendas: valida antes de gravar. O pedido só é marcado como recebido depois que as
// entradas passaram pelo ledger — e a `ref` determinística faz um retry completar o que faltou em vez de
// duplicar mercadoria.

import type { IpcRegistrar } from './ipc-types'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { InventoryMovement } from './inventory-store'
import { normalizePurchase, stockMovementsFor, type PurchaseOrder, type Supplier } from './purchases-store'

export interface PurchasesStoreLike {
  orders: (tenantId?: string) => Promise<PurchaseOrder[]>
  saveOrder: (input: unknown) => Promise<{ error: string } | { order: PurchaseOrder; orders: PurchaseOrder[] }>
  suppliers: (tenantId?: string) => Promise<Supplier[]>
  upsertSupplier: (input: unknown) => Promise<{ error: string } | { supplier: Supplier; suppliers: Supplier[] }>
}

export interface InventoryLike {
  append: (input: unknown) => Promise<{ balance: number } | { error: string }>
}

export interface PurchasesDeps {
  inventory: InventoryLike
  store: PurchasesStoreLike
}

export type ReceiveResult =
  | { error: string }
  | { order: PurchaseOrder; orders: PurchaseOrder[]; stock: InventoryMovement[] }

function tenant(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function registerPurchasesIpc(ipcMain: IpcRegistrar, deps: PurchasesDeps): void {
  ipcMain.handle(
    'hermes:purchases:suppliers',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ suppliers: Supplier[] }> => ({
      suppliers: await deps.store.suppliers(tenant(tenantId))
    })
  )

  ipcMain.handle(
    'hermes:purchases:saveSupplier',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<{ error: string } | { supplier: Supplier; suppliers: Supplier[] }> =>
      deps.store.upsertSupplier(payload)
  )

  ipcMain.handle(
    'hermes:purchases:orders',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ orders: PurchaseOrder[] }> => ({
      orders: await deps.store.orders(tenant(tenantId))
    })
  )

  ipcMain.handle(
    'hermes:purchases:saveOrder',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<{ error: string } | { order: PurchaseOrder; orders: PurchaseOrder[] }> =>
      deps.store.saveOrder(payload)
  )

  // Receber: marca como recebido e lança as entradas no estoque, nesta ordem.
  ipcMain.handle('hermes:purchases:receive', async (_event: IpcMainInvokeEvent, payload: unknown): Promise<ReceiveResult> => {
    const normalizado = normalizePurchase({ ...(payload as object), status: 'recebido' }, Date.now())

    if ('error' in normalizado) {
      return { error: normalizado.error }
    }

    const salvo = await deps.store.saveOrder({ ...(payload as object), status: 'recebido' })

    if ('error' in salvo) {
      return { error: salvo.error }
    }

    const stock: InventoryMovement[] = []

    for (const movimento of stockMovementsFor(salvo.order)) {
      const entrada = await deps.inventory.append(movimento)

      if ('balance' in entrada) {
        stock.push(movimento as unknown as InventoryMovement)
      } else if (entrada.error !== 'ref_duplicado') {
        return { error: entrada.error }
      }
    }

    return { order: salvo.order, orders: salvo.orders, stock }
  })
}

// Compras expostas ao renderer, incluindo o **recebimento**, que atravessa para o estoque.
//
// Mesma defesa de vendas: valida antes de gravar. O pedido só é marcado como recebido depois que as
// entradas passaram pelo ledger — e a `ref` determinística faz um retry completar o que faltou em vez de
// duplicar mercadoria.

import type { IpcRegistrar } from './ipc-types'
import { serverTenant } from './server-tenant'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { InventoryMovement } from './inventory-store'
import { payableForPurchase, type FinanceEntry } from './finance-store'
import { normalizePurchase, stockMovementsFor, type PurchaseOrder, type Supplier } from './purchases-store'
import { situacaoDaCompra, type LimiteDeCompra } from './purchase-approval'

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
  finance: { append: (input: unknown) => Promise<{ entry: FinanceEntry } | { error: string }> }
  /** Limite de compra da empresa. Ausente ou com cents: null desliga o controle. */
  limiteDeCompra?: () => Promise<LimiteDeCompra>
  inventory: InventoryLike
  store: PurchasesStoreLike
}

export type ReceiveResult =
  | { error: string }
  | { finance: FinanceEntry | null; order: PurchaseOrder; orders: PurchaseOrder[]; stock: InventoryMovement[] }

export function registerPurchasesIpc(ipcMain: IpcRegistrar, deps: PurchasesDeps): void {
  ipcMain.handle(
    'hermes:purchases:suppliers',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ suppliers: Supplier[] }> => ({
      suppliers: await deps.store.suppliers(serverTenant(tenantId))
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
      orders: await deps.store.orders(serverTenant(tenantId))
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

    // Limite de compra (GOAL §15). Sem limiteDeCompra configurado, nada muda: o controle e opt-in do dono.
    // Recusar AQUI, antes de gravar, e o que impede um pedido acima do teto de virar estoque e conta a pagar
    // para depois alguem descobrir que precisava de assinatura.
    if (deps.limiteDeCompra) {
      const limite = await deps.limiteDeCompra()
      const total = normalizado.order.items.reduce((soma, item) => soma + (item.total_cents ?? 0), 0)
      const situacao = situacaoDaCompra(total, limite)

      if (situacao.precisa) {
        return { error: 'aprovacao_necessaria' }
      }
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

    // A conta a pagar e derivada do pedido recebido, com ref deterministica: um retry nao duplica.
    const pagar = payableForPurchase(salvo.order)
    let finance: FinanceEntry | null = null

    if (pagar) {
      const lancado = await deps.finance.append(pagar)

      if ('entry' in lancado) {
        finance = lancado.entry
      } else if (lancado.error !== 'ref_duplicado') {
        return { error: lancado.error }
      }
    }

    return { order: salvo.order, orders: salvo.orders, stock, finance }
  })
}
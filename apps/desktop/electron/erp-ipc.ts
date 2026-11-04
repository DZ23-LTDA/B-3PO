// Montagem do IPC do Business Core (ERP), separada da montagem do CRM.
//
// Um domínio entra aqui quando tem store e testes — não antes. Cada um é ligado no seu próprio store,
// sobre os mesmos arquivos sob `userData`, e o renderer só alcança o que está registrado.

import type { IpcMain } from 'electron'

import { CatalogStore, catalogStorePath } from './catalog-store'
import { ActorsStore, actorsStorePath, primaryOwner } from './actors-store'
import { CompaniesStore, companiesStorePath } from './companies-store'
import { registerCompaniesIpc } from './companies-ipc'
import { registerCatalogIpc } from './catalog-ipc'
import { FinanceStore, financeStorePath } from './finance-store'
import { registerFinanceIpc } from './finance-ipc'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { registerInventoryIpc } from './inventory-ipc'
import { PurchasesStore, purchasesStorePath } from './purchases-store'
import { registerPurchasesIpc } from './purchases-ipc'
import { SchedulingStore, schedulingStorePath } from './scheduling-store'
import { registerSchedulingIpc } from './scheduling-ipc'
import { SalesStore, salesStorePath } from './sales-store'
import { registerSalesIpc } from './sales-ipc'

/**
 * Monta os IPC do ERP. Catálogo, estoque e vendas; financeiro e agenda ganham tela depois.
 *
 * Vendas recebe também estoque e financeiro porque faturar atravessa os três — a orquestração mora
 * aqui, no processo principal, e não no renderer.
 */
export function mountErpIpc(ipcMain: Pick<IpcMain, 'handle'>, userDataDir: string): void {
  const inventory = new InventoryStore(inventoryStorePath(userDataDir))
  const finance = new FinanceStore(financeStorePath(userDataDir))

  registerCatalogIpc(ipcMain, new CatalogStore(catalogStorePath(userDataDir)))
  // Empresas nao tem tenant_id: ela E o tenant. Fica fora do filtro por empresa de proposito.
  registerCompaniesIpc(ipcMain, new CompaniesStore(companiesStorePath(userDataDir)))
  registerInventoryIpc(ipcMain, inventory)
  registerFinanceIpc(ipcMain, finance)
  registerSchedulingIpc(ipcMain, new SchedulingStore(schedulingStorePath(userDataDir)))
  // Compras recebe o estoque porque receber um pedido entra mercadoria no ledger.
  registerPurchasesIpc(ipcMain, { inventory, store: new PurchasesStore(purchasesStorePath(userDataDir)) })
  // O ator e resolvido AQUI, no processo principal: o renderer nao diz quem e.
  const actors = new ActorsStore(actorsStorePath(userDataDir))
  const actorOf = async () => primaryOwner(await actors.list())

  registerSalesIpc(ipcMain, {
    actorOf,
    finance,
    inventory,
    sales: new SalesStore(salesStorePath(userDataDir))
  })
}

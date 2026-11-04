// Montagem do IPC do Business Core (ERP), separada da montagem do CRM.
//
// Um domínio entra aqui quando tem store e testes — não antes. Cada um é ligado no seu próprio store,
// sobre os mesmos arquivos sob `userData`, e o renderer só alcança o que está registrado.

import type { IpcRegistrar } from './ipc-types'
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
import { buildDomainTools } from './agent-tools-catalog'
import type { AgentTool } from './agent-tools'
import { ServiceDeskStore, serviceDeskStorePath } from './service-desk-store'
import { registerServiceDeskIpc } from './service-desk-ipc'
import { registerAfterSalesIpc } from './after-sales-ipc'
import { registerAnalyticsIpc } from './analytics-ipc'
import { registerMarketingIpc } from './marketing-ipc'
import { MarketingStore, marketingStorePath } from './marketing-store'
import { AfterSalesStore, afterSalesStorePath } from './after-sales-store'
import { bootAgentMcp } from './mcp-boot'
import { registerAdminIpc } from './admin-ipc'
import { HrStore, hrStorePath } from './hr-store'
import { registerHrIpc } from './hr-ipc'
import { registerSchedulingCatalogIpc } from './scheduling-catalog-ipc'
import { registerServicesIpc } from './services-ipc'
import { ServicesStore, servicesStorePath } from './services-store'

/**
 * Monta os IPC do ERP. Catálogo, estoque e vendas; financeiro e agenda ganham tela depois.
 *
 * Vendas recebe também estoque e financeiro porque faturar atravessa os três — a orquestração mora
 * aqui, no processo principal, e não no renderer.
 */
export interface ErpMounted {
  /** Ferramentas de dominio para o servidor MCP. Construidas dos MESMOS stores que os IPC usam. */
  tools: AgentTool[]
}

export function mountErpIpc(ipcMain: IpcRegistrar, userDataDir: string): ErpMounted {
  const inventory = new InventoryStore(inventoryStorePath(userDataDir))
  const finance = new FinanceStore(financeStorePath(userDataDir))

  registerCatalogIpc(ipcMain, new CatalogStore(catalogStorePath(userDataDir)))
  const services = new ServicesStore(servicesStorePath(userDataDir))

  registerServicesIpc(ipcMain, services)
  registerHrIpc(ipcMain, new HrStore(hrStorePath(userDataDir)))
  const desk = new ServiceDeskStore(serviceDeskStorePath(userDataDir))

  registerServiceDeskIpc(ipcMain, desk)
  // Empresas nao tem tenant_id: ela E o tenant. Fica fora do filtro por empresa de proposito.
  registerCompaniesIpc(ipcMain, new CompaniesStore(companiesStorePath(userDataDir)))
  registerInventoryIpc(ipcMain, inventory)
  registerFinanceIpc(ipcMain, finance)
  const scheduling = new SchedulingStore(schedulingStorePath(userDataDir))

  registerSchedulingIpc(ipcMain, scheduling)
  // Caminho novo: agendar exige servico do catalogo e deriva o fim do horario da duracao real.
  registerSchedulingCatalogIpc(ipcMain, { scheduling, services })
  // Compras recebe o estoque porque receber um pedido entra mercadoria no ledger.
  registerPurchasesIpc(ipcMain, { inventory, store: new PurchasesStore(purchasesStorePath(userDataDir)) })
  // O ator e resolvido AQUI, no processo principal: o renderer nao diz quem e.
  const actors = new ActorsStore(actorsStorePath(userDataDir))

  // `ensureOwner` antes de resolver: num perfil novo nao existe dono, e sem dono TODA acao de escrita
  // volta `sem_permissao` — o produto fica inutilizavel na primeira abertura. O primeiro dono e local e
  // criado sozinho; isso nao e escalada, e o estado inicial que a interface pressupoe.
  const actorOf = async () => {
    await actors.ensureOwner()

    return primaryOwner(await actors.list())
  }

  // Administracao de atores. Estava implementada desde a rodada 26 e NUNCA montada: sem ela nao ha
  // como criar um bot pela interface, e sem bot o servidor MCP nunca tem credencial para emitir.
  registerAdminIpc(ipcMain, {
    actorOf: async () => {
      await actors.ensureOwner()

      const dono = await actorOf()

      // O nome do ator precisa vir junto: sem ele a tela mostra o nivel sem saber de quem.
      return dono ? { id: dono.id, kind: dono.kind, level: dono.level, name: dono.name, role: dono.role, scopes: dono.scopes } : null
    },
    actors
  })

  const sales = new SalesStore(salesStorePath(userDataDir))
  const afterSales = new AfterSalesStore(afterSalesStorePath(userDataDir))

  // O pós-venda entra no faturamento: sem isto `deps.afterSales` fica undefined em produção e nenhum
  // acompanhamento é criado — o domínio existe no disco e ninguém o alimenta.
  registerSalesIpc(ipcMain, { actorOf, afterSales, finance, inventory, sales })
  registerAfterSalesIpc(ipcMain, { actorOf, afterSales, sales })
  const marketing = new MarketingStore(marketingStorePath(userDataDir))

  registerMarketingIpc(ipcMain, { marketing })
  // Analytics le pelo dono de cada dominio. Nao tem store proprio - de proposito.
  registerAnalyticsIpc(ipcMain, { afterSales, desk, finance, inventory, marketing, sales })

  // As ferramentas do agente usam ESTES stores: nao ha segundo conjunto de dados.
  const tools = buildDomainTools({
    catalog: new CatalogStore(catalogStorePath(userDataDir)),
    desk: new ServiceDeskStore(serviceDeskStorePath(userDataDir)),
    finance,
    inventory,
    sales
  })

  // Servidor MCP dos agentes. Disparado daqui (e nao do main.ts) porque este e o ponto que ja tem o
  // userDataDir E as ferramentas: o main.ts esta sob ratchet de tamanho e so pode encolher.
  // Sem await: subir socket nao pode atrasar a janela, e falhar aqui nao pode derrubar o app.
  void bootAgentMcp(userDataDir, tools).then(r => console.error('[b3po-mcp]', JSON.stringify(r)))

  return { tools }
}

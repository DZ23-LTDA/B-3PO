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
import { registerDocumentsIpc } from './documents-ipc'
import { CrmContactStore, crmStorePath } from './crm-contacts-store'
import { CrmConversationStore, conversationsStorePath } from './crm-conversations-store'
import { CrmPipelineStore, pipelineStorePath } from './crm-pipeline-store'
import { CrmTaskStore, tasksStorePath } from './crm-tasks-store'
import { registerFiscalIpc } from './fiscal-ipc'
import { registerSchedulingBlockIpc } from './scheduling-block-ipc'
import { registerAgentIpc } from './agent-ipc'
import { FiscalStore, fiscalStorePath } from './fiscal-store'
import { resolverProvedor } from './fiscal-provider'
import { registerLookupIpc } from './lookup-ipc'
import { registerPrivacyIpc } from './privacy-ipc'
import { DocumentsStore, documentsStorePath } from './documents-store'
import { FinanceStore, financeStorePath } from './finance-store'
import { registerFinanceIpc } from './finance-ipc'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { registerInventoryIpc } from './inventory-ipc'
import { createDispatcher, dispatchQuietly } from './automation-dispatch'
import { resolveRuleActor, withOwnerAlias } from './automation-actors'
import { dueSoonConditions, overdueConditions } from './automation-conditions'
import { SweepStore, sweepStatePath } from './automation-sweep'
import { PurchasesStore, purchasesStorePath } from './purchases-store'
import { registerPurchasesIpc } from './purchases-ipc'
import { QuotationStore, quotationsStorePath } from './quotation-store'
import { SchedulingStore, schedulingStorePath } from './scheduling-store'
import { registerSchedulingIpc } from './scheduling-ipc'
import { SalesStore, salesStorePath } from './sales-store'
import { registerSalesIpc } from './sales-ipc'
import { buildDomainTools } from './agent-tools-catalog'
import type { AgentTool } from './agent-tools'
import { ServiceDeskStore, serviceDeskStorePath } from './service-desk-store'
import { registerServiceDeskIpc } from './service-desk-ipc'
import { registerAfterSalesIpc } from './after-sales-ipc'

import { registerAutomationIpc } from './automation-ipc'
import { AutomationStore, automationStorePath } from './automation-store'
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
  /** Dispara a varredura de condicoes agora. Exposto para o teste nao esperar o intervalo. */
  varrer: () => Promise<void>
}

export function mountErpIpc(ipcMain: IpcRegistrar, userDataDir: string): ErpMounted {
  const inventory = new InventoryStore(inventoryStorePath(userDataDir))
  const finance = new FinanceStore(financeStorePath(userDataDir))

  registerCatalogIpc(ipcMain, new CatalogStore(catalogStorePath(userDataDir)), { actorOf: () => actorOf() })

  // Registro de documentos. NAO guarda o binario - ver documents-store.ts para o porque.
  registerDocumentsIpc(ipcMain, new DocumentsStore(documentsStorePath(userDataDir)))

  // Pedido do titular (LGPD). Reusa os MESMOS stores do CRM: nenhum armazenamento paralelo.
  // Consulta publica de CNPJ/CEP: leitura pura, sem gravacao.
  registerLookupIpc(ipcMain)

  // Documento fiscal: o emissor vem do ambiente, nunca do renderer.
  registerFiscalIpc(ipcMain, { store: new FiscalStore(fiscalStorePath(userDataDir)) })
  registerSchedulingBlockIpc(ipcMain, userDataDir)

  // Agentes: roster, execucoes e fila de aprovacao. Montado aqui, nao em main.ts, pelo mesmo motivo da r125:
  // main.ts esta no teto de linhas e a montagem de dominio mora neste arquivo.
  registerAgentIpc(ipcMain, userDataDir)

  registerPrivacyIpc(ipcMain, {
    store: {
      contacts: new CrmContactStore(crmStorePath(userDataDir)),
      conversations: new CrmConversationStore(conversationsStorePath(userDataDir)),
      opportunities: new CrmPipelineStore(pipelineStorePath(userDataDir)),
      tasks: new CrmTaskStore(tasksStorePath(userDataDir))
    }
  })
  const services = new ServicesStore(servicesStorePath(userDataDir))

  registerServicesIpc(ipcMain, services)
  // r221: o RH exige ator. `actorOf` e o resolvedor desta montagem (ensureOwner + primaryOwner).
  registerHrIpc(ipcMain, new HrStore(hrStorePath(userDataDir)), { actorOf: () => actorOf() })
  const desk = new ServiceDeskStore(serviceDeskStorePath(userDataDir))

  registerServiceDeskIpc(ipcMain, desk, {
    ticketOpened: async ticket => {
      await dispatchQuietly(dispatch, { detail: ticket, tenant_id: ticket.tenant_id, type: 'ticket.aberto' })
    }
  })
  // Empresas nao tem tenant_id: ela E o tenant. Fica fora do filtro por empresa de proposito.
  registerCompaniesIpc(ipcMain, new CompaniesStore(companiesStorePath(userDataDir)), { actorOf: () => actorOf() })
  // r217: o estoque passou a exigir ator. `onEvent` continua quarto parametro — a guarda vem antes de
  // proposito: um evento de automacao nao pode disparar por uma acao que nao foi autorizada.
  registerInventoryIpc(
    ipcMain,
    inventory,
    { actorOf: () => actorOf() },
    {
      stockRanOut: async info => {
        await dispatchQuietly(dispatch, { detail: info, tenant_id: info.tenant_id, type: 'estoque.zerado' })
      }
    }
  )
  // r215: o financeiro passou a exigir ator. A arrow so e chamada dentro do handler, entao a ordem
  // de declaracao de ctorOf (mais abaixo) nao importa.
  registerFinanceIpc(ipcMain, finance, { actorOf: () => actorOf() })
  const scheduling = new SchedulingStore(schedulingStorePath(userDataDir))

  registerSchedulingIpc(ipcMain, scheduling)
  // Caminho novo: agendar exige servico do catalogo e deriva o fim do horario da duracao real.
  registerSchedulingCatalogIpc(ipcMain, { scheduling, services })
  // Compras recebe o estoque porque receber um pedido entra mercadoria no ledger.
  registerPurchasesIpc(ipcMain, {
    // r222: compras exige ator. A guarda vem antes do limite de compra: primeiro quem age, depois se cabe no teto.
    actorOf: () => actorOf(),
    finance,
    inventory,
    // Sem esta injecao o canal de cotacao responde vazio e o save devolve cotacoes_indisponivel: o store
    // existia e ninguem alcancava. A captura da r201 pegou exatamente isso.
    quotations: new QuotationStore(quotationsStorePath(userDataDir)),
    store: new PurchasesStore(purchasesStorePath(userDataDir))
  })
  // O ator e resolvido AQUI, no processo principal: o renderer nao diz quem e.
  const actors = new ActorsStore(actorsStorePath(userDataDir))

  // `ensureOwner` antes de resolver: num perfil novo nao existe dono, e sem dono TODA acao de escrita
  // volta `sem_permissao` — o produto fica inutilizavel na primeira abertura. O primeiro dono e local e
  // criado sozinho; isso nao e escalada, e o estado inicial que a interface pressupoe.
  const actorOf = async () => {
    await actors.ensureOwner()

    return primaryOwner(await actors.list())
  }

  // O despachante de automacoes. `tools` e `automations` sao getters: ambos sao montados mais adiante
  // neste arquivo, e o disparo so acontece depois de tudo pronto.
  let ferramentas: AgentTool[] | null = null
  let automacoes: AutomationStore | null = null

  const dispatch = createDispatcher({
    // O alias owner (rodada 68) vive em utomation-actors.ts, onde tem teste. Aqui so aplicamos.
    actors: async () => withOwnerAlias(await actors.list(), await actorOf()),
    automations: {
      list: async tenant => (automacoes ? automacoes.list(tenant) : [])
    },
    now: () => Date.now(),
    tools: () => ferramentas ?? []
  })

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
  // O elo que faltava: um fato do dominio vira evento, e o evento vira execucao de regra. Sem isto o
  // executor de automacoes existe, passa nos testes e nunca roda em producao.
  const automations = new AutomationStore(automationStorePath(userDataDir))

  automacoes = automations

  registerSalesIpc(ipcMain, {
    actorOf,
    afterSales,
    finance,
    inventory,
    onEvent: async event => {
      // O mesmo despachante dos outros dominios: uma montagem, nao tres copias.
      await dispatchQuietly(dispatch, { detail: event, tenant_id: event.tenant_id, type: event.type })
    },
    sales
  })
  registerAfterSalesIpc(ipcMain, { actorOf, afterSales, sales })

  const marketing = new MarketingStore(marketingStorePath(userDataDir))

  registerMarketingIpc(ipcMain, { marketing })
  // Analytics le pelo dono de cada dominio. Nao tem store proprio - de proposito.
  registerAnalyticsIpc(ipcMain, { afterSales, desk, finance, inventory, marketing, sales })

  // As ferramentas do agente usam ESTES stores: nao ha segundo conjunto de dados.
  const tools: AgentTool[] = buildDomainTools({
    catalog: new CatalogStore(catalogStorePath(userDataDir)),
    desk: new ServiceDeskStore(serviceDeskStorePath(userDataDir)),
    finance,
    // O agente ve o mesmo emissor que a tela: resolvido do ambiente, nunca do renderer.
    fiscal: { provider: resolverProvedor(process.env), store: new FiscalStore(fiscalStorePath(userDataDir)) },
    inventory,
    sales
  })

  // Automacoes: a tela precisa do catalogo REAL de ferramentas, entao o registro vem DEPOIS de 	ools.
  ferramentas = tools

  registerAutomationIpc(ipcMain, { automations, sweep: () => varrer(), tools })

  // Varredura das condicoes que NAO sao evento: atendimento atrasado e conta vencendo. Roda no mesmo
  // intervalo do resto e e idempotente por (gatilho, entidade) - ver utomation-sweep.ts.
  const sweep = new SweepStore(sweepStatePath(userDataDir))

  async function varrer(): Promise<void> {
    await sweep.run({
      conditions: async () => {
        const [tickets, entradas] = await Promise.all([desk.list(), finance.list()])

        return [
          ...overdueConditions(tickets, 'local'),
          ...dueSoonConditions(entradas, 'local', Date.now())
        ]
      },
      now: () => Date.now(),
      run: async (trigger, condicao) => {
        return dispatch({ detail: { entity_id: condicao.entity_id }, tenant_id: condicao.tenant_id, type: trigger })
      }
    })
  }

  // Intervalo longo de proposito: a varredura e idempotente, mas nao ha razao para acordar o disco a
  // cada minuto. Cinco minutos e sensivel para SLA sem ser ruido.
  const varredura = setInterval(() => {
    void varrer().catch(() => {
      // Falha na varredura nao pode derrubar o app: a proxima tentativa acontece no intervalo seguinte.
    })
  }, 5 * 60_000)

  varredura.unref?.()

  return { tools, varrer }

  // Servidor MCP dos agentes. Disparado daqui (e nao do main.ts) porque este e o ponto que ja tem o
  // userDataDir E as ferramentas: o main.ts esta sob ratchet de tamanho e so pode encolher.
  // Sem await: subir socket nao pode atrasar a janela, e falhar aqui nao pode derrubar o app.
  void bootAgentMcp(userDataDir, tools).then(r => console.error('[b3po-mcp]', JSON.stringify(r)))

  return { tools, varrer }
}
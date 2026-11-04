// IPC do analytics.
//
// Le cada dominio pelo DONO dele (o mesmo store que a tela usa) e entrega o snapshot pronto. Nao ha
// busca em arquivo, nao ha cache, nao ha tabela: se o ledger de vendas mudar, o proximo painel mostra.

import type { AfterSalesStore } from './after-sales-store'
import { alertsFor, buildSnapshot, type RawData, type Snapshot } from './analytics'
import type { FinanceStore } from './finance-store'
import type { InventoryStore } from './inventory-store'
import type { MarketingStore } from './marketing-store'
import type { SalesStore } from './sales-store'
import type { ServiceDeskStore } from './service-desk-store'
import { indicators as deskIndicators } from './service-desk-store'
import type { IpcRegistrar } from './ipc-types'

export interface AnalyticsDeps {
  afterSales: AfterSalesStore
  desk: ServiceDeskStore
  finance: FinanceStore
  inventory: InventoryStore
  marketing: MarketingStore
  sales: SalesStore
  tenantId?: string
}

export interface DashboardPayload {
  alerts: ReturnType<typeof alertsFor>
  generatedAt: number
  snapshot: Snapshot
}

/** Junta tudo. Exportado para o teste poder exercitar a leitura real, sem importar o Electron. */
export async function gatherSnapshot(deps: AnalyticsDeps, now: number): Promise<DashboardPayload> {
  const tenantId = deps.tenantId ?? 'local'

  const [vendas, saldos, financeiro, tickets, afterSales, campanhas, posts] = await Promise.all([
    deps.sales.list(tenantId),
    deps.inventory.balances(tenantId),
    deps.finance.totals(tenantId),
    deps.desk.list(tenantId),
    deps.afterSales.listAll(tenantId),
    deps.marketing.listCampaigns(tenantId),
    deps.marketing.listPosts(tenantId)
  ])

  const raw: RawData = {
    afterSales,
    // `abertos` do atendimento vira `pendentes` aqui. O mapeamento fica nomeado numa funcao so, para
    // nao depender de lembrar que os dois nomes significam a mesma coisa.
    desk: deskToSnapshot(tickets, now, tenantId),
    finance: {
      aPagarCents: financeiro.openPayableCents,
      aReceberCents: financeiro.openReceivableCents
    },
    inventory: saldos,
    marketing: { campaigns: campanhas, posts, schema_version: 1 },
    sales: vendas.map(v => ({ id: v.id, status: v.status, tenant_id: v.tenant_id, total_cents: v.total_cents })),
    tenantId
  }

  const snapshot = buildSnapshot(raw, now)

  return { alerts: alertsFor(snapshot), generatedAt: now, snapshot }
}

/** Mapeamento nome-a-nome do indicador do atendimento para o do painel. */
export function deskToSnapshot(tickets: Parameters<typeof deskIndicators>[0], now: number, tenantId: string) {
  const r = deskIndicators(tickets, now, tenantId)

  return { atrasados: r.atrasados, pendentes: r.abertos, satisfacaoMedia: r.satisfacaoMedia }
}

export function registerAnalyticsIpc(ipcMain: IpcRegistrar, deps: AnalyticsDeps): void {
  ipcMain.handle('hermes:analytics:dashboard', async (): Promise<DashboardPayload> => {
    return gatherSnapshot(deps, Date.now())
  })
}

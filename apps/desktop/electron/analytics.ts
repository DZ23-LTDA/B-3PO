// Analytics: leitura consolidada dos dominios.
//
// NAO tem store proprio. Isso e a decisao inteira: o GOAL proibe "um banco paralelo para cada agente",
// e um analytics que guarda os proprios numeros seria exatamente isso — um segundo lugar onde o total
// de vendas pode discordar do ledger de vendas.
//
// Aqui so ha duas coisas: uma leitura por dominio (via os mesmos stores) e uma conta em cima do que
// foi lido. Cada indicador continua sendo responsabilidade do dono dele; este modulo apenas soma.
//
// A conta e pura (`buildSnapshot` recebe os dados, nao os busca), para poder ser testada sem I/O e com
// numeros escolhidos — inclusive os casos de ausencia de dado.

import type { AfterSalesIndicators, FollowUp } from './after-sales-store'
import { indicators as afterSalesIndicators } from './after-sales-store'
import type { MarketingFile } from './marketing-store'
import { indicators as marketingIndicators } from './marketing-store'

export interface SalesSnapshot {
  faturadas: number
  /** Soma de `total_cents` das vendas faturadas. */
  totalCents: number
}

export interface InventorySnapshot {
  /** SKUs com saldo > 0. */
  comSaldo: number
  /** SKUs zerados ou negativos — o que precisa de reposicao. */
  zerados: number
}

export interface FinanceSnapshot {
  aPagarCents: number
  aReceberCents: number
  /** Receber - pagar. Negativo significa que o previsto fecha no vermelho. */
  saldoCents: number
}

export interface DeskSnapshot {
  atrasados: number
  pendentes: number
  satisfacaoMedia: null | number
}

export interface Snapshot {
  afterSales: AfterSalesIndicators
  desk: DeskSnapshot
  finance: FinanceSnapshot
  inventory: InventorySnapshot
  marketing: ReturnType<typeof marketingIndicators>
  sales: SalesSnapshot
}

/** Venda na forma que o snapshot precisa: o indicador de pos-venda usa o `id` para casar o ref. */
export interface SnapshotSale {
  id: string
  status: string
  tenant_id: string
  total_cents: number
}

export interface RawData {
  afterSales: FollowUp[]
  desk: DeskSnapshot
  finance: { aPagarCents: number; aReceberCents: number }
  inventory: Record<string, number>
  marketing: MarketingFile
  sales: SnapshotSale[]
  tenantId: string
}

/**
 * Consolida. Funcao pura: os mesmos dados de entrada dao o mesmo numero de saida, sempre.
 *
 * `saldoCents` e derivado das duas parcelas em vez de somado a parte — se as parcelas estiverem certas,
 * o saldo esta certo por construcao.
 */
export function buildSnapshot(raw: RawData, now: number): Snapshot {
  const vendas = raw.sales.filter(v => v.tenant_id === raw.tenantId && v.status === 'faturado')
  const saldos = Object.values(raw.inventory)

  return {
    afterSales: afterSalesIndicators(raw.afterSales, raw.sales, now, raw.tenantId),
    desk: raw.desk,
    finance: {
      aPagarCents: raw.finance.aPagarCents,
      aReceberCents: raw.finance.aReceberCents,
      saldoCents: raw.finance.aReceberCents - raw.finance.aPagarCents
    },
    inventory: {
      comSaldo: saldos.filter(s => s > 0).length,
      zerados: saldos.filter(s => s <= 0).length
    },
    marketing: marketingIndicators(raw.marketing, now, raw.tenantId),
    sales: {
      faturadas: vendas.length,
      totalCents: vendas.reduce((total, v) => total + v.total_cents, 0)
    }
  }
}

export interface Alert {
  detail: string
  domain: 'desk' | 'finance' | 'inventory' | 'marketing' | 'sales'
  severity: 'alta' | 'media'
  title: string
}

/**
 * Alertas derivados do snapshot. Ordem fixa: o que custa dinheiro primeiro.
 *
 * Um alerta so existe quando o dado sustenta a afirmacao — nao ha "tudo ok" inventado nem alerta
 * preventivo sobre numero que ninguem mediu.
 */
/** Singular com 1; plural no resto (incluindo zero, que em portugues pede plural). */
function plural(n: number, um: string, muitos: string): string {
  return n === 1 ? um : muitos
}

export function alertsFor(snapshot: Snapshot): Alert[] {
  const alertas: Alert[] = []

  if (snapshot.finance.saldoCents < 0) {
    alertas.push({
      detail: 'As contas a pagar abertas passam das contas a receber.',
      domain: 'finance',
      severity: 'alta',
      title: 'O caixa previsto fecha negativo'
    })
  }

  if (snapshot.desk.atrasados > 0) {
    alertas.push({
      detail: `${snapshot.desk.atrasados} ${snapshot.desk.atrasados === 1 ? 'atendimento passou' : 'atendimentos passaram'} do prazo combinado.`,
      domain: 'desk',
      severity: 'alta',
      title: 'Atendimento fora do prazo'
    })
  }

  if (snapshot.inventory.zerados > 0) {
    alertas.push({
      detail: `${snapshot.inventory.zerados} ${plural(snapshot.inventory.zerados, 'produto', 'produtos')} sem saldo para vender.`,
      domain: 'inventory',
      severity: 'alta',
      title: 'Estoque zerado em item cadastrado'
    })
  }

  if (snapshot.afterSales.semAcompanhamento > 0) {
    alertas.push({
      detail: `${snapshot.afterSales.semAcompanhamento} ${plural(snapshot.afterSales.semAcompanhamento, 'venda faturada', 'vendas faturadas')} sem nenhum acompanhamento.`,
      domain: 'sales',
      severity: 'media',
      title: 'Pós-venda não foi agendado'
    })
  }

  if (snapshot.marketing.agendadasVencidas > 0) {
    alertas.push({
      detail: `${snapshot.marketing.agendadasVencidas} ${plural(snapshot.marketing.agendadasVencidas, 'campanha agendada', 'campanhas agendadas')} com início já passado.`,
      domain: 'marketing',
      severity: 'media',
      title: 'Campanha agendada não foi ativada'
    })
  }

  return alertas
}

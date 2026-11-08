/**
 * Painel consolidado no renderer.
 *
 * Uma chamada só: o processo principal já leu os seis domínios e devolveu o snapshot pronto. O
 * renderer não soma nada — se somasse, haveria duas contas possíveis para o mesmo total.
 */

export interface AlertRow {
  detail: string
  domain: 'desk' | 'finance' | 'inventory' | 'marketing' | 'sales'
  severity: 'alta' | 'media'
  title: string
}

export interface DashboardPayload {
  alerts: AlertRow[]
  generatedAt: number
  snapshot: {
    afterSales: { atrasados: number; pendentes: number; semAcompanhamento: number }
    desk: { atrasados: number; pendentes: number; satisfacaoMedia: null | number }
    finance: { aPagarCents: number; aReceberCents: number; saldoCents: number }
    inventory: { comSaldo: number; zerados: number }
    marketing: { agendadasVencidas: number; ativas: number; leads: number; spendTotalCents: number }
    sales: { faturadas: number; totalCents: number }
  }
}

interface Bridge {
  dashboard: () => Promise<DashboardPayload>
}

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { analytics?: Bridge } }).hermesDesktop?.analytics ?? null
}

export function analyticsAvailable(): boolean {
  return bridge() !== null
}

export async function loadDashboard(): Promise<DashboardPayload | null> {
  const api = bridge()

  return api ? api.dashboard() : null
}

export function moneyLabel(centavos: number): string {
  const negativo = centavos < 0
  const texto = `R$ ${(Math.abs(centavos) / 100).toFixed(2).replace('.', ',')}`

  return negativo ? `− ${texto}` : texto
}

/** Média de satisfação em uma casa. `null` é "sem avaliação", nunca "0". */
export function satisfactionLabel(media: null | number): string {
  return media === null ? '—' : media.toFixed(1)
}

export const DOMAIN_LABEL: Record<AlertRow['domain'], string> = {
  desk: 'Atendimento',
  finance: 'Financeiro',
  inventory: 'Estoque',
  marketing: 'Marketing',
  sales: 'Vendas'
}

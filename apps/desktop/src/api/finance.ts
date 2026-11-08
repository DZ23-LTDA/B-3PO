/**
 * Financeiro no renderer.
 *
 * Os totais vêm do processo principal, calculados sobre os lançamentos. Esta camada só formata —
 * nenhum total é somado aqui.
 */

export interface FinanceEntryRow {
  amount_cents: number
  /**
   * Centro de custo (r184).
   *
   * `''` = nao alocado. Ausencia do campo em registros antigos tambem significa nao alocado — a tela trata os
   * dois casos igual, mas nao inventa um centro.
   */
  cost_center?: string
  created_at: number
  currency: string
  description: string
  due_at: number
  id: string
  kind: string
  party: string
  ref: string
  status: string
  tenant_id: string
  updated_at: number
}

export interface CostCenterTotalRow {
  pago_cents: number
  pendente_cents: number
}

export interface FinanceTotalsRow {
  openPayableCents: number
  openReceivableCents: number
  overdueCents: number
  paidPayableCents: number
  paidReceivableCents: number
}

interface FinanceBridge {
  append: (payload: Record<string, unknown>) => Promise<{ error: string } | { entry: FinanceEntryRow; entries: FinanceEntryRow[] }>
  list: (tenantId?: string) => Promise<{ entries: FinanceEntryRow[] }>
  costCenters: (tenantId?: string) => Promise<{ costCenters: Record<string, CostCenterTotalRow> }>
  settle: (id: string, tenantId?: string) => Promise<{ error: string } | { entries: FinanceEntryRow[] }>
  totals: (tenantId?: string) => Promise<{ totals: FinanceTotalsRow }>
}

function bridge(): FinanceBridge | null {
  const host = (globalThis as { hermesDesktop?: { finance?: FinanceBridge } }).hermesDesktop

  return host?.finance ?? null
}

export function financeAvailable(): boolean {
  return bridge() !== null
}

/** Totais por centro de custo. `''` aparece como "nao alocado" — nao some do relatorio. */
export async function loadCostCenters(tenantId?: string): Promise<Record<string, CostCenterTotalRow>> {
  const api = bridge()

  if (!api) return {}

  const r = await api.costCenters(tenantId)

  return r?.costCenters ?? {}
}

export async function listEntries(tenantId?: string): Promise<FinanceEntryRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.list(tenantId)

  return Array.isArray(r?.entries) ? r.entries : []
}

export async function loadTotals(tenantId?: string): Promise<FinanceTotalsRow> {
  const vazio: FinanceTotalsRow = {
    openPayableCents: 0,
    openReceivableCents: 0,
    overdueCents: 0,
    paidPayableCents: 0,
    paidReceivableCents: 0
  }
  const api = bridge()

  if (!api) return vazio

  const r = await api.totals(tenantId)

  return r?.totals ?? vazio
}

export async function addEntry(
  payload: Record<string, unknown>
): Promise<{ error: string } | { entries: FinanceEntryRow[]; entry: FinanceEntryRow }> {
  const api = bridge()

  if (!api) return { error: 'financeiro_indisponivel' }

  return api.append(payload)
}

export async function settleEntry(id: string, tenantId?: string): Promise<{ error: string } | { entries: FinanceEntryRow[] }> {
  const api = bridge()

  if (!api) return { error: 'financeiro_indisponivel' }

  return api.settle(id, tenantId)
}

/** Data de vencimento em texto pt-BR curto: só o dia conta para o operador. */
export function dueLabel(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'

  return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Vencido é derivado do relógio, não de uma marca gravada. */
export function isOverdue(entry: { due_at: number; status: string }, now = Date.now()): boolean {
  return entry.status === 'aberto' && entry.due_at > 0 && entry.due_at < now
}

/** Valor de um campo de texto em centavos: "74,70" → 7470. */
export function amountValue(texto: string): number {
  const limpo = texto.trim().replace(/\s/g, '')

  if (!limpo) return 0

  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const parsed = Number.parseFloat(normalizado)

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0
}

/** Data de um input `date` para vencimento em ms, ao meio-dia local (evita virar o dia por fuso). */
export function dueFromInput(value: string): number {
  if (!value) return 0

  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())

  if (!partes) return 0

  const ms = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]), 12, 0, 0, 0).getTime()

  return Number.isFinite(ms) ? ms : 0
}

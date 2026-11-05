/**
 * Estoque no renderer.
 *
 * O saldo vem do processo principal, derivado das movimentações. Esta camada só tipa a chamada e
 * converte para texto — nunca soma nem guarda saldo por conta própria.
 */

export const MOVEMENT_KINDS = ['entrada', 'saida', 'ajuste'] as const

export type MovementKind = (typeof MOVEMENT_KINDS)[number]

export interface MovementRow {
  created_at: number
  id: string
  kind: MovementKind
  product_sku: string
  quantity_milli: number
  reason: string
  ref: string
  tenant_id: string
}

interface InventoryBridge {
  append: (payload: Record<string, unknown>) => Promise<{ error: string } | { balance: number; movement: MovementRow; movements: MovementRow[] }>
  balances: (tenantId?: string) => Promise<{ balances: Record<string, number> }>
  inventario: (payload: Record<string, unknown>) => Promise<{ ajustes: number; ignoradas: string[]; sem_diferenca: string[] } | { error: string }>
  list: (tenantId?: string) => Promise<{ movements: MovementRow[] }>
}

function bridge(): InventoryBridge | null {
  const host = (globalThis as { hermesDesktop?: { inventory?: InventoryBridge } }).hermesDesktop

  return host?.inventory ?? null
}

/** Uma linha de contagem fisica. */
export interface ContagemRow {
  /** Quanto o contador encontrou, em milesimos. */
  contado_milli: number
  product_sku: string
}

export interface ResultadoInventario {
  ajustes: number
  /** SKUs que a contagem nao pode reconciliar (saldo desconhecido ou contagem invalida). */
  ignoradas: string[]
  /** SKUs que ja batiam com o ledger. */
  sem_diferenca: string[]
}

/**
 * Aplica uma contagem fisica. O saldo NAO e sobrescrito: cada diferenca vira movimento com `ref` deterministica
 * (`inventario:<id>:<sku>`), entao repetir o mesmo inventario completa o que faltou em vez de duplicar.
 *
 * Sem preload devolve `inventario_indisponivel`: a tela roda em teste e em navegador sem Electron.
 */
export async function registrarInventario(
  id: string,
  contagens: ContagemRow[]
): Promise<ResultadoInventario | { error: string }> {
  const api = bridge()

  if (!api) return { error: 'inventario_indisponivel' }

  return api.inventario({ contagens, id })
}

export function inventoryAvailable(): boolean {
  return bridge() !== null
}

export async function listMovements(tenantId?: string): Promise<MovementRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.list(tenantId)

  return Array.isArray(r?.movements) ? r.movements : []
}

export async function loadBalances(tenantId?: string): Promise<Record<string, number>> {
  const api = bridge()

  if (!api) return {}

  const r = await api.balances(tenantId)

  return r?.balances ?? {}
}

export async function appendMovement(
  payload: Record<string, unknown>
): Promise<{ error: string } | { balance: number; movements: MovementRow[] }> {
  const api = bridge()

  if (!api) return { error: 'estoque_indisponivel' }

  const r = await api.append(payload)

  if ('error' in r) return r

  return { balance: r.balance, movements: r.movements }
}

/** Saldo em milésimos para texto: 7000 → "7", 1500 → "1,5". */
export function quantityLabel(milli: number): string {
  if (!Number.isFinite(milli)) return '0'

  const sinal = milli < 0 ? '-' : ''
  const abs = Math.abs(milli)
  const inteiro = Math.trunc(abs / 1000)
  const resto = abs % 1000

  if (resto === 0) return `${sinal}${inteiro}`

  return `${sinal}${inteiro},${String(resto).padStart(3, '0').replace(/0+$/, '')}`
}

/** Abaixo deste saldo o produto pede reposição. Zero e negativo também pedem. */
export const LOW_STOCK_MILLI = 5000

export function isLowStock(milli: number): boolean {
  return Number.isFinite(milli) && milli < LOW_STOCK_MILLI
}

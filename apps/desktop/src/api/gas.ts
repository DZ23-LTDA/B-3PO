/**
 * Vasilhame em comodato no renderer — a vertical de gás/água.
 *
 * O problema que isto resolve: o estoque conta **produto** ("quantos kg tenho para vender") e, depois
 * de uma venda, conta um a menos. Mas o botijão **não desapareceu** — ele está na casa do cliente e
 * precisa voltar. Sem contar o **recipiente**, a revenda não sabe quantos cascos são dela, nem quais
 * estão com quem.
 *
 * Duas contagens coexistem de propósito: `inventory` responde "quanto eu tenho para vender", `gas`
 * responde "quantos cascos são meus e onde estão".
 */

export const VASILHAME_KINDS = ['botijao_p13', 'botijao_13', 'botijao_45', 'galao_20', 'outro'] as const

export type VasilhameKind = (typeof VASILHAME_KINDS)[number]

export interface VasilhameRow {
  customer_id: string | null
  deposit_cents: number
  delivered_at: number
  id: string
  kind: VasilhameKind
  lost_reason: string
  returned_at: number | null
  serial: string
  status: 'estoque' | 'comodato' | 'perdido'
  updated_at: number
}

export interface GasSaldoRow {
  em_comodato: number
  em_estoque: number
  perdidos: number
  por_tipo: Record<string, number>
}

interface GasBridge {
  cadastrar: (payload: Record<string, unknown>) => Promise<{ error: string } | { saldo: GasSaldoRow; vasilhame: VasilhameRow }>
  devolver: (id: string) => Promise<{ error: string } | { saldo: GasSaldoRow; vasilhame: VasilhameRow }>
  doCliente: (customerId: string) => Promise<{ vasilhames: VasilhameRow[] }>
  entregar: (
    id: string,
    customerId: string
  ) => Promise<{ error: string } | { saldo: GasSaldoRow; vasilhame: VasilhameRow }>
  list: () => Promise<{ saldo: GasSaldoRow; vasilhames: VasilhameRow[] }>
  perder: (
    id: string,
    motivo: string
  ) => Promise<{ error: string } | { saldo: GasSaldoRow; vasilhame: VasilhameRow }>
}

function bridge(): GasBridge | null {
  const host = (globalThis as { hermesDesktop?: { gas?: GasBridge } }).hermesDesktop

  return host?.gas ?? null
}

export function gasAvailable(): boolean {
  return bridge() !== null
}

const VAZIO: GasSaldoRow = { em_comodato: 0, em_estoque: 0, perdidos: 0, por_tipo: {} }

export async function loadGas(): Promise<{ saldo: GasSaldoRow; vasilhames: VasilhameRow[] }> {
  const api = bridge()

  if (!api) {
    return { saldo: VAZIO, vasilhames: [] }
  }

  const r = await api.list()

  return { saldo: r.saldo ?? VAZIO, vasilhames: r.vasilhames ?? [] }
}

export async function cadastrarVasilhame(
  payload: Record<string, unknown>
): Promise<{ error: string } | { saldo: GasSaldoRow; vasilhame: VasilhameRow }> {
  const api = bridge()

  return api ? api.cadastrar(payload) : { error: 'indisponivel' }
}

export async function entregarVasilhame(
  id: string,
  customerId: string
): Promise<{ error: string } | { saldo: GasSaldoRow; vasilhame: VasilhameRow }> {
  const api = bridge()

  return api ? api.entregar(id, customerId) : { error: 'indisponivel' }
}

export async function devolverVasilhame(
  id: string
): Promise<{ error: string } | { saldo: GasSaldoRow; vasilhame: VasilhameRow }> {
  const api = bridge()

  return api ? api.devolver(id) : { error: 'indisponivel' }
}

export async function perderVasilhame(
  id: string,
  motivo: string
): Promise<{ error: string } | { saldo: GasSaldoRow; vasilhame: VasilhameRow }> {
  const api = bridge()

  return api ? api.perder(id, motivo) : { error: 'indisponivel' }
}

/** Rótulo humano do tipo — a tela fala "13 kg", não "botijao_13". */
export const VASILHAME_LABEL: Record<VasilhameKind, string> = {
  botijao_13: '13 kg',
  botijao_45: '45 kg',
  botijao_p13: 'P-13',
  galao_20: 'Galão 20 L',
  outro: 'Outro',
}

export const VASILHAME_STATUS_LABEL: Record<VasilhameRow['status'], string> = {
  comodato: 'com o cliente',
  estoque: 'na revenda',
  perdido: 'perdido',
}

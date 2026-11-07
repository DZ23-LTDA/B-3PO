/**
 * Leitura periódica de medidor no renderer.
 *
 * Água encanada não se cobra por casco: se cobra pela **diferença entre duas leituras**. O modelo de
 * comodato (`gas.ts`) conta o recipiente; este conta o **consumo**, que é uma série por medidor — e a
 * série é o dado: sem a leitura anterior, a atual não significa nada.
 */

export const MEDIDOR_KINDS = ['hidrometro', 'gasometro', 'outro'] as const

export type MedidorKind = (typeof MEDIDOR_KINDS)[number]

export interface MedidorRow {
  customer_id: string | null
  id: string
  installed_at: number
  kind: MedidorKind
  serial: string
}

export interface LeituraRow {
  id: string
  medidor_id: string
  read_at: number
  reading_milli: number
}

export interface ConsumoRow {
  anterior: LeituraRow | null
  atual: LeituraRow | null
  consumo_milli: number | null
  medidor_id: string
}

interface MedidoresBridge {
  cadastrar: (payload: Record<string, unknown>) => Promise<
    { error: string } | { medidor: MedidorRow; medidores: MedidorRow[] }
  >
  leitura: (
    payload: Record<string, unknown>
  ) => Promise<{ error: string } | { consumo: ConsumoRow; leitura: LeituraRow }>
  list: () => Promise<{ consumos: ConsumoRow[]; leituras: LeituraRow[]; medidores: MedidorRow[] }>
}

function bridge(): MedidoresBridge | null {
  const host = (globalThis as { hermesDesktop?: { medidores?: MedidoresBridge } }).hermesDesktop

  return host?.medidores ?? null
}

export function medidoresAvailable(): boolean {
  return bridge() !== null
}

export async function loadMedidores(): Promise<{
  consumos: ConsumoRow[]
  leituras: LeituraRow[]
  medidores: MedidorRow[]
}> {
  const api = bridge()

  if (!api) return { consumos: [], leituras: [], medidores: [] }

  const r = await api.list()

  return {
    consumos: r.consumos ?? [],
    leituras: r.leituras ?? [],
    medidores: r.medidores ?? [],
  }
}

export async function cadastrarMedidor(
  payload: Record<string, unknown>
): Promise<{ error: string } | { medidor: MedidorRow; medidores: MedidorRow[] }> {
  const api = bridge()

  return api ? api.cadastrar(payload) : { error: 'indisponivel' }
}

export async function registrarLeitura(
  payload: Record<string, unknown>
): Promise<{ error: string } | { consumo: ConsumoRow; leitura: LeituraRow }> {
  const api = bridge()

  return api ? api.leitura(payload) : { error: 'indisponivel' }
}

/**
 * Rótulo do medidor em m³ — o número que o cliente lê no relógio.
 *
 * `12345` milésimos viram `12,345 m³`. Sem separador de milhar: é leitura de relógio, não preço.
 */
export function metrosCubicos(milli: number): string {
  const inteiro = Math.floor(milli / 1000)
  const resto = milli % 1000

  return `${inteiro},${String(resto).padStart(3, '0')} m³`
}

/** Litros — a unidade em que a revenda costuma falar. */
export function litros(milli: number): string {
  return `${milli.toLocaleString('pt-BR')} L`
}

export const MEDIDOR_LABEL: Record<MedidorKind, string> = {
  gasometro: 'Gasômetro',
  hidrometro: 'Hidrômetro',
  outro: 'Outro',
}

/** Tradução dos erros do store — a tela fala português, não chave. */
export const MEDIDOR_ERRO: Record<string, string> = {
  dados_invalidos: 'Dados inválidos.',
  leitura_invalida: 'Informe uma leitura válida (número não negativo).',
  leitura_regrediu:
    'A leitura é menor que a anterior. Um medidor não anda para trás — se ele foi trocado, cadastre o medidor novo.',
  medidor_nao_encontrado: 'Medidor não encontrado.',
  medidor_obrigatorio: 'Escolha o medidor.',
  tipo_invalido: 'Tipo de medidor inválido.',
}

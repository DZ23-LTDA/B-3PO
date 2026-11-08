/**
 * T-12 — política tarifária no renderer.
 *
 * A regra que atravessa este arquivo: **não existe preço padrão**. `calcularTarifa` devolve
 * `{ conta: null }` quando não há política vigente, e a tela é obrigada a dizer "não configurada".
 * Um valor default aqui viraria cobrança errada com aparência de correta.
 */

export interface FaixaTarifa {
  /** Teto em milésimos de m³. `null` = última faixa, sem teto. */
  ate_milli: number | null
  /** Centavos por m³. */
  preco_centavos_por_m3: number
}

export interface PoliticaTarifaRow {
  created_at: number
  esgoto_percentual: number | null
  faixas: FaixaTarifa[]
  id: string
  minimo_milli: number | null
  moeda: string
  taxa_fixa_centavos: number | null
  vigencia_fim: number | null
  vigencia_inicio: number
}

export interface FaixaAplicadaRow {
  ate_milli: number | null
  milli_na_faixa: number
  preco_centavos_por_m3: number
  subtotal_centavos: number
}

export interface ContaRow {
  agua_centavos: number
  consumo_faturado_milli: number
  consumo_medido_milli: number
  esgoto_centavos: number
  faixas_aplicadas: FaixaAplicadaRow[]
  minimo_aplicado: boolean
  moeda: string
  politica_id: string
  taxa_fixa_centavos: number
  total_centavos: number
}

export interface TarifaIpc {
  calcular: (payload: { consumo_milli: number; quando?: number }) => Promise<{ conta: ContaRow | null; error?: string }>
  list: () => Promise<{ error?: string; politicas?: PoliticaTarifaRow[] }>
  remover: (payload: { id: string }) => Promise<{ error?: string; ok?: true }>
  salvar: (payload: Partial<PoliticaTarifaRow>) => Promise<{ error?: string; politica?: PoliticaTarifaRow }>
}

export function tarifasBridge(): TarifaIpc | null {
  return (globalThis as { hermesDesktop?: { tarifas?: TarifaIpc } }).hermesDesktop?.tarifas ?? null
}

/** Centavos → texto com a moeda da política. Não assume R$: a moeda vem configurada. */
export function formatarCentavos(centavos: number, moeda: string, locale = 'pt-BR'): string {
  try {
    return new Intl.NumberFormat(locale, { currency: moeda, style: 'currency' }).format(centavos / 100)
  } catch {
    // Moeda desconhecida para o Intl: mostra o número e o código, nunca chuta um símbolo.
    return `${(centavos / 100).toFixed(2)} ${moeda}`
  }
}

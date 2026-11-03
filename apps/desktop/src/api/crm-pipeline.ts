/**
 * Funil do CRM no renderer. A verdade é do processo principal (arquivo sob `userData`); aqui se tipa a
 * chamada, se padroniza os estágios e se formata valor em dinheiro para a tela.
 */

export const PIPELINE_STAGES = ['novo', 'contato', 'qualificacao', 'proposta', 'negociacao', 'ganho', 'perdido'] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export interface CrmOpportunityRow {
  contact_phone: string
  created_at: number
  currency: string
  id: string
  stage: PipelineStage
  title: string
  updated_at: number
  value_cents: number
}

interface CrmPipelineBridge {
  list: () => Promise<{ opportunities: CrmOpportunityRow[] }>
  remove: (id: string) => Promise<{ opportunities: CrmOpportunityRow[] }>
  upsert: (payload: Partial<CrmOpportunityRow>) => Promise<{ error: string } | { opportunities: CrmOpportunityRow[] }>
}

function bridge(): CrmPipelineBridge | null {
  const host = (globalThis as { hermesDesktop?: { crmPipeline?: CrmPipelineBridge } }).hermesDesktop

  return host?.crmPipeline ?? null
}

export function pipelineAvailable(): boolean {
  return bridge() !== null
}

export async function listOpportunities(): Promise<CrmOpportunityRow[]> {
  const api = bridge()

  if (!api) {
    throw new Error('unavailable')
  }

  return (await api.list()).opportunities ?? []
}

export async function saveOpportunity(
  payload: Partial<CrmOpportunityRow>
): Promise<{ error: string } | { opportunities: CrmOpportunityRow[] }> {
  const api = bridge()

  if (!api) {
    return { error: 'unavailable' }
  }

  return api.upsert(payload)
}

export async function removeOpportunity(id: string): Promise<CrmOpportunityRow[]> {
  const api = bridge()

  if (!api) {
    throw new Error('unavailable')
  }

  return (await api.remove(id)).opportunities ?? []
}

/** Valor em dinheiro a partir de centavos; `Intl` do locale evita "R$ 1500.00" na tela em português. */
export function money(cents: number, currency = 'BRL', locale = 'pt-BR'): string {
  try {
    return new Intl.NumberFormat(locale, { currency, style: 'currency' }).format((cents || 0) / 100)
  } catch {
    return `${(cents || 0) / 100} ${currency}`
  }
}

/**
 * Rótulo do estágio VEM DO CATÁLOGO de i18n. Havia um mapa fixo em português aqui, então a tela mostrava
 * português mesmo com a interface em inglês — defeito meu, corrigido: quem chama passa o texto traduzido e o
 * estágio vira o fallback quando a chave não existe.
 */
export function stageLabel(stage: PipelineStage, stages: Partial<Record<PipelineStage, string>>): string {
  return stages[stage] ?? stage
}

/** Totais reais: aberto (fora de ganho/perdido) e ganho, em centavos. */
export function opportunityTotals(rows: readonly CrmOpportunityRow[]): { openCents: number; wonCents: number } {
  let openCents = 0
  let wonCents = 0

  for (const row of rows) {
    if (row.stage === 'ganho') {
      wonCents += row.value_cents
    } else if (row.stage !== 'perdido') {
      openCents += row.value_cents
    }
  }

  return { openCents, wonCents }
}

const MESSAGES: Record<string, string> = {
  contact_required: 'Escolha o contato da oportunidade.',
  stage_invalid: 'Estágio inválido.',
  title_required: 'Dê um nome à oportunidade.',
  unavailable: 'Este cliente não tem disco local para guardar o funil.'
}

export function pipelineErrorText(code: string): string {
  return MESSAGES[code] ?? `Não foi possível salvar (${code}).`
}

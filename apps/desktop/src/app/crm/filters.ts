import type { CrmOpportunityRow } from '@/api/crm-pipeline'

export interface OpportunityFilter {
  /** Texto livre: casa com título, telefone do contato ou motivo de perda. */
  query: string
  /** Estágio específico, ou `'todos'`. */
  stage: 'todos' | CrmOpportunityRow['stage']
}

export const EMPTY_OPPORTUNITY_FILTER: OpportunityFilter = { query: '', stage: 'todos' }

/**
 * Filtro do funil.
 *
 * Puro de propósito: a tela precisa saber **quantas** oportunidades sobraram e **quais**, e a contagem por coluna
 * tem de refletir o filtro — senão a coluna diz "3" e mostra um cartão. Nada aqui inventa dado: só decide o que
 * entra e o que fica de fora.
 */
export function filterOpportunities(
  rows: readonly CrmOpportunityRow[],
  filter: OpportunityFilter
): CrmOpportunityRow[] {
  const busca = filter.query.trim().toLowerCase()

  return rows.filter(row => {
    if (filter.stage !== 'todos' && row.stage !== filter.stage) {
      return false
    }

    if (!busca) {
      return true
    }

    // Telefone entra na busca porque é como o contato aparece no cartão; sem isso, procurar por número não acha.
    return [row.title, row.contact_phone, row.lost_reason].some(campo => campo.toLowerCase().includes(busca))
  })
}

/** Há filtro ativo? A tela usa isto para dizer que o quadro está recortado. */
export function hasActiveFilter(filter: OpportunityFilter): boolean {
  return filter.query.trim() !== '' || filter.stage !== 'todos'
}

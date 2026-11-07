import type { CrmContactRow } from '@/api/crm-contacts'
import type { CrmOpportunityRow } from '@/api/crm-pipeline'
import { opportunityTotals } from '@/api/crm-pipeline'
import { taskCounts, type CrmTaskRow } from '@/api/crm-tasks'

export interface CrmSummary {
  contacts: number
  /** Oportunidades fora de ganho/perdido. */
  openOpportunities: number
  openValueCents: number
  wonOpportunities: number
  wonValueCents: number
  openTasks: number
  lateTasks: number
  doneTasks: number
}

/**
 * Números do painel do CRM — todos derivados do que está gravado, nenhum inventado.
 *
 * A função é pura de propósito: o painel não recalcula regra de negócio, só conta o que os stores devolveram. Um
 * "total" que não sai daqui é um número falso, e é justamente o que a tela não pode mostrar.
 */
export function summarizeCrm(input: {
  contacts: readonly CrmContactRow[]
  now: number
  opportunities: readonly CrmOpportunityRow[]
  tasks: readonly CrmTaskRow[]
}): CrmSummary {
  const { openCents, wonCents } = opportunityTotals(input.opportunities as CrmOpportunityRow[])
  const { done, late, open } = taskCounts(input.tasks as CrmTaskRow[], input.now)

  return {
    contacts: input.contacts.length,
    doneTasks: done,
    lateTasks: late,
    openOpportunities: input.opportunities.filter(row => row.stage !== 'ganho' && row.stage !== 'perdido').length,
    openTasks: open,
    openValueCents: openCents,
    wonOpportunities: input.opportunities.filter(row => row.stage === 'ganho').length,
    wonValueCents: wonCents
  }
}

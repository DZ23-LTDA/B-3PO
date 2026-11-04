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

/**
 * O contato desta linha ainda existe?
 *
 * Apagar um contato não apaga a oportunidade nem a tarefa — e não deve: o histórico de negócio continua valendo.
 * Mas a tela precisa dizer que o telefone ali é um contato que não existe mais, em vez de mostrar um número
 * solto como se estivesse tudo bem.
 */
function phoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function isKnownContact(contacts: readonly { phone: string }[], phone: string): boolean {
  // Os contatos sao gravados so com digitos (o store chama digitsOnly), mas a oportunidade e a tarefa guardam o
  // telefone como foi digitado. Comparar texto cru acusava "contato excluido" para um contato que existe sempre
  // que alguem escrevia com mascara ("+55 11 99999-1111" x "+5511999991111"). Comparar digitos resolve os dois lados.
  const alvo = phoneDigits(phone)
  if (!alvo) {
    return true
  }

  return contacts.some(contact => phoneDigits(contact.phone) === alvo)
}

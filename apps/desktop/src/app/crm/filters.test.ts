import { describe, expect, it } from 'vitest'

import type { CrmOpportunityRow } from '@/api/crm-pipeline'

import { EMPTY_OPPORTUNITY_FILTER, filterOpportunities, hasActiveFilter } from './filters'

const op = (over: Partial<CrmOpportunityRow> = {}): CrmOpportunityRow => ({
  contact_phone: '+5511999991111',
  created_at: 1,
  currency: 'BRL',
  id: 'opp',
  lost_reason: '',
  stage: 'novo',
  title: 'Consultoria',
  updated_at: 1,
  value_cents: 100,
  ...over
})

describe('filtro do funil', () => {
  const linhas = [
    op({ id: '1', title: 'Consultoria de 3 meses', stage: 'negociacao' }),
    op({ id: '2', title: 'Implantação', stage: 'ganho', contact_phone: '+5511988882222' }),
    op({ id: '3', title: 'Suporte anual', stage: 'perdido', lost_reason: 'preço alto' })
  ]

  it('sem filtro devolve tudo, na mesma ordem', () => {
    expect(filterOpportunities(linhas, EMPTY_OPPORTUNITY_FILTER).map(r => r.id)).toEqual(['1', '2', '3'])
  })

  it('filtra por estágio', () => {
    expect(filterOpportunities(linhas, { query: '', stage: 'ganho' }).map(r => r.id)).toEqual(['2'])
  })

  it('busca no título, sem diferenciar maiúsculas ou espaços em volta', () => {
    expect(filterOpportunities(linhas, { query: '  IMPLANTA ', stage: 'todos' }).map(r => r.id)).toEqual(['2'])
  })

  it('busca no telefone do contato', () => {
    expect(filterOpportunities(linhas, { query: '98888', stage: 'todos' }).map(r => r.id)).toEqual(['2'])
  })

  it('busca no motivo da perda', () => {
    expect(filterOpportunities(linhas, { query: 'preço', stage: 'todos' }).map(r => r.id)).toEqual(['3'])
  })

  it('combina texto e estágio', () => {
    expect(filterOpportunities(linhas, { query: 'consultoria', stage: 'ganho' })).toEqual([])
  })

  it('texto sem correspondência devolve vazio em vez de tudo', () => {
    expect(filterOpportunities(linhas, { query: 'inexistente', stage: 'todos' })).toEqual([])
  })

  it('sabe dizer quando há filtro ativo', () => {
    expect(hasActiveFilter(EMPTY_OPPORTUNITY_FILTER)).toBe(false)
    expect(hasActiveFilter({ query: '   ', stage: 'todos' })).toBe(false)
    expect(hasActiveFilter({ query: 'x', stage: 'todos' })).toBe(true)
    expect(hasActiveFilter({ query: '', stage: 'perdido' })).toBe(true)
  })
})

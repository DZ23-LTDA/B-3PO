import { describe, expect, it } from 'vitest'

import {
  createDeal,
  dealCard,
  effectiveProbability,
  forecast,
  isForecastOverdue,
  isLost,
  isWon,
  lostReasons,
  moveDealTo,
  setProbability
} from './pipeline'
import type { DealDetail, DealStage } from './pipeline'

const T0 = 1_700_000_000_000
const DAY = 24 * 60 * 60 * 1000

const stages: DealStage[] = [
  { id: 'new', name: 'Novo lead', order: 0, probability: 10 },
  { id: 'qualified', name: 'Qualificação', order: 1, probability: 40 },
  { id: 'won', name: 'Ganho', order: 2, won: true, probability: 100 },
  { id: 'lost', name: 'Perdido', order: 3, lost: true, probability: 0 }
]

function deal(overrides: Partial<Parameters<typeof createDeal>[0]> = {}): DealDetail {
  const created = createDeal(
    {
      id: 'd1',
      contactId: 'c1',
      title: 'Proposta anual',
      stageId: 'new',
      now: T0,
      valueCents: 100_000,
      ...overrides
    },
    stages
  )

  if ('error' in created) {
    throw new Error(`deal de teste inválido: ${created.error}`)
  }

  return created
}

describe('funil — criação', () => {
  it('recusa etapa desconhecida e probabilidade fora de 0..100', () => {
    expect(createDeal({ id: 'd', contactId: 'c', title: 'x', stageId: 'nada', now: T0 }, stages)).toEqual({
      error: 'unknown_stage'
    })
    expect(
      createDeal({ id: 'd', contactId: 'c', title: 'x', stageId: 'new', now: T0, probability: 150 }, stages)
    ).toEqual({ error: 'invalid_probability' })
  })

  it('nasce com histórico de criação e valor não negativo', () => {
    const created = deal({ valueCents: -500 })

    expect(created.valueCents).toBe(0)
    expect(created.history[0]?.note).toBe('criado')
    expect(created.lostReason).toBeNull()
  })
})

describe('funil — mudança de etapa', () => {
  it('perder exige motivo com pelo menos 3 caracteres', () => {
    expect(moveDealTo(deal(), 'lost', stages, T0 + DAY)).toEqual({ error: 'lost_reason_required' })
    expect(moveDealTo(deal(), 'lost', stages, T0 + DAY, { lostReason: ' ok ' })).toEqual({
      error: 'lost_reason_required'
    })
  })

  it('perder com motivo guarda o motivo e registra autor no histórico', () => {
    const lost = moveDealTo(deal(), 'lost', stages, T0 + DAY, {
      by: 'Leandro',
      lostReason: 'preço acima do orçamento'
    }) as DealDetail

    expect(lost.lostReason).toBe('preço acima do orçamento')
    expect(lost.history.at(-1)).toMatchObject({ from: 'new', to: 'lost', by: 'Leandro' })
  })

  it('ganhar limpa motivo de perda anterior', () => {
    const lost = moveDealTo(deal(), 'lost', stages, T0 + DAY, { lostReason: 'sumiu' }) as DealDetail
    const won = moveDealTo(lost, 'won', stages, T0 + 2 * DAY) as DealDetail

    expect(won.lostReason).toBeNull()
    expect(isWon(won, stages)).toBe(true)
  })

  it('não aceita mover para a mesma etapa', () => {
    expect(moveDealTo(deal(), 'new', stages, T0 + DAY)).toEqual({ error: 'same_stage' })
  })

  it('avançar etapa mantém o motivo existente quando não é ganho nem perda', () => {
    const qualified = moveDealTo(deal(), 'qualified', stages, T0 + DAY) as DealDetail

    expect(qualified.lostReason).toBeNull()
    expect(qualified.history).toHaveLength(2)
  })
})

describe('funil — probabilidade', () => {
  it('probabilidade do negócio vence a da etapa', () => {
    expect(effectiveProbability(deal({ probability: 70 }), stages)).toBe(70)
    expect(effectiveProbability(deal(), stages)).toBe(10)
  })

  it('etapa sem probabilidade devolve 0, nunca NaN', () => {
    const semProb = [{ id: 'x', name: 'X', order: 0 }]
    const semEtapaConhecida: DealDetail = { ...deal(), stageId: 'x' }

    expect(effectiveProbability(semEtapaConhecida, semProb)).toBe(0)
  })

  it('setProbability valida faixa e registra no histórico', () => {
    expect(setProbability(deal(), 120, T0)).toEqual({ error: 'invalid_probability' })

    const updated = setProbability(deal(), 55, T0 + DAY, 'Ana') as DealDetail

    expect(updated.probability).toBe(55)
    expect(updated.history.at(-1)?.note).toBe('probabilidade: 55')
  })
})

describe('funil — previsão', () => {
  const deals: DealDetail[] = [
    deal({ id: 'a', valueCents: 100_000 }), // novo, 10%
    deal({ id: 'b', stageId: 'qualified', valueCents: 200_000 }), // 40%
    moveDealTo(deal({ id: 'c', valueCents: 300_000 }), 'won', stages, T0 + DAY) as DealDetail,
    moveDealTo(deal({ id: 'd', valueCents: 50_000 }), 'lost', stages, T0 + DAY, { lostReason: 'sem resposta' }) as DealDetail
  ]

  it('separa aberto, ganho e perdido', () => {
    const result = forecast(deals, stages, T0 + 2 * DAY)

    expect(result.openDeals).toBe(2)
    expect(result.wonDeals).toBe(1)
    expect(result.lostDeals).toBe(1)
    expect(result.openValueCents).toBe(300_000)
    expect(result.wonValueCents).toBe(300_000)
  })

  it('previsão ponderada usa probabilidade efetiva e ignora ganho/perdido', () => {
    const result = forecast(deals, stages, T0 + 2 * DAY)

    expect(result.weightedCents).toBe(10_000 + 80_000)
  })

  it('previsão atrasada conta só negócio aberto com prazo vencido', () => {
    const late = deal({ id: 'e', expectedCloseAt: T0 - DAY })

    expect(isForecastOverdue(late, stages, T0)).toBe(true)
    expect(forecast([late], stages, T0).overdueDeals).toBe(1)

    const wonDeal = moveDealTo(late, 'won', stages, T0) as DealDetail
    expect(isForecastOverdue(wonDeal, stages, T0 + 10 * DAY)).toBe(false)
  })

  it('ciclo médio só considera ganhos com tempo decorrido', () => {
    const quick = moveDealTo(deal({ id: 'f' }), 'won', stages, T0 + 2 * DAY) as DealDetail
    const slow = moveDealTo(deal({ id: 'g' }), 'won', stages, T0 + 4 * DAY) as DealDetail

    expect(forecast([quick, slow], stages, T0 + 5 * DAY).averageCycleDays).toBe(3)
    expect(forecast([deal()], stages, T0).averageCycleDays).toBeNull()
  })
})

describe('funil — relatório de perdas', () => {
  it('agrupa por motivo, ordenado por quantidade', () => {
    const lost = (id: string, reason: string, value: number) =>
      moveDealTo(deal({ id, valueCents: value }), 'lost', stages, T0 + DAY, { lostReason: reason }) as DealDetail

    const report = lostReasons(
      [lost('a', 'preço', 10_000), lost('b', 'preço', 20_000), lost('c', 'sumiu', 5_000), deal({ id: 'd' })],
      stages
    )

    expect(report[0]).toEqual({ reason: 'preço', count: 2, valueCents: 30_000 })
    expect(report[1]).toEqual({ reason: 'sumiu', count: 1, valueCents: 5_000 })
  })

  it('perdido sem motivo aparece explicitamente, não é escondido', () => {
    const orphan: DealDetail = { ...deal({ id: 'x' }), stageId: 'lost', lostReason: null }

    expect(lostReasons([orphan], stages)[0]?.reason).toBe('sem motivo registrado')
    expect(isLost(orphan, stages)).toBe(true)
  })
})

describe('funil — cartão do Kanban', () => {
  it('traz probabilidade efetiva, atraso e motivo de perda no rótulo acessível', () => {
    const late = deal({ id: 'z', expectedCloseAt: T0 - DAY, probability: 65 })
    const card = dealCard(late, stages, T0)

    expect(card.probability).toBe(65)
    expect(card.overdue).toBe(true)
    expect(card.accessibilityLabel).toBe('Proposta anual, 65% de chance, previsão atrasada')
  })

  it('cartão perdido mostra o motivo', () => {
    const lost = moveDealTo(deal(), 'lost', stages, T0 + DAY, { lostReason: 'sem orçamento' }) as DealDetail
    const card = dealCard(lost, stages, T0 + 2 * DAY)

    expect(card.lostReason).toBe('sem orçamento')
    expect(card.accessibilityLabel).toContain('perdido: sem orçamento')
  })
})

import { describe, expect, it } from 'vitest'

import { addMessage, createConversation, resolveConversation } from './inbox'
import type { Conversation } from './inbox'
import {
  dashboardMetrics,
  formatDuration,
  formatMoney,
  formatPercent,
  responseSamples
} from './dashboard'

const T0 = 1_700_000_000_000
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function conversation(id: string, name = 'Ana'): Conversation {
  return createConversation({ id, contactId: `k-${id}`, contactName: name, phone: '+5511999998888', now: T0 - DAY })
}

const stages = [
  { id: 'novo', name: 'Novo lead', order: 1 },
  { id: 'negociacao', name: 'Negociação', order: 2 },
  { id: 'ganho', name: 'Ganho', order: 3, won: true }
]

describe('dashboard — estados vazios', () => {
  it('sem dado nenhum, marca isEmpty e não inventa número disfarçado', () => {
    const metrics = dashboardMetrics({ conversations: [], deals: [], stages, contactsCreatedAt: [], now: T0 })

    expect(metrics.isEmpty).toBe(true)
    expect(metrics.newLeads.value).toBe(0)
    expect(metrics.averageResponseMs.value).toBeNull()
    expect(metrics.averageResponseMs.emptyReason).toContain('resposta')
    expect(metrics.responseRate.value).toBeNull()
    expect(metrics.conversionRate.value).toBeNull()
    expect(metrics.pendingTasks.value).toBeNull()
    expect(metrics.pendingTasks.emptyReason).toContain('tarefas')
  })
})

describe('dashboard — conversas', () => {
  it('conta abertas, não lidas e resolvidas corretamente', () => {
    const waiting = addMessage(conversation('c1'), { id: 'm1', direction: 'in', text: 'oi', at: T0 - HOUR })
    const resolved = resolveConversation(conversation('c2'), 'cliente comprou') as Conversation

    const metrics = dashboardMetrics({
      conversations: [waiting, resolved],
      deals: [],
      stages,
      contactsCreatedAt: [],
      now: T0
    })

    expect(metrics.openConversations.value).toBe(1)
    expect(metrics.unreadConversations.value).toBe(1)
  })

  it('tempo de resposta é a média entre chegada e primeira resposta', () => {
    const fast = addMessage(
      addMessage(conversation('c1'), { id: 'a', direction: 'in', text: 'oi', at: T0 - 2 * HOUR }),
      { id: 'b', direction: 'out', text: 'olá', at: T0 - 2 * HOUR + 10 * MIN }
    )
    const slow = addMessage(
      addMessage(conversation('c2'), { id: 'c', direction: 'in', text: 'oi', at: T0 - 2 * HOUR }),
      { id: 'd', direction: 'out', text: 'olá', at: T0 - 2 * HOUR + 30 * MIN }
    )

    expect(responseSamples([fast, slow])).toEqual([10 * MIN, 30 * MIN])

    const metrics = dashboardMetrics({ conversations: [fast, slow], deals: [], stages, contactsCreatedAt: [], now: T0 })
    expect(metrics.averageResponseMs.value).toBe(20 * MIN)
  })

  it('conversa sem resposta entra como pendente, não como resposta zero', () => {
    const pending = addMessage(conversation('c1'), { id: 'a', direction: 'in', text: 'oi', at: T0 - HOUR })
    const answered = addMessage(
      addMessage(conversation('c2'), { id: 'b', direction: 'in', text: 'oi', at: T0 - HOUR }),
      { id: 'c', direction: 'out', text: 'olá', at: T0 - HOUR + MIN }
    )

    const metrics = dashboardMetrics({
      conversations: [pending, answered],
      deals: [],
      stages,
      contactsCreatedAt: [],
      now: T0
    })

    expect(metrics.responseRate.value).toBe(0.5)
    expect(metrics.averageResponseMs.value).toBe(MIN)
  })

  it('espera conta só conversas abertas e guarda a maior espera', () => {
    const open = addMessage(conversation('c1'), { id: 'a', direction: 'in', text: 'oi', at: T0 - 3 * HOUR })
    const resolved = resolveConversation(
      addMessage(conversation('c2'), { id: 'b', direction: 'in', text: 'oi', at: T0 - 10 * HOUR }),
      'resolvido'
    ) as Conversation

    const metrics = dashboardMetrics({ conversations: [open, resolved], deals: [], stages, contactsCreatedAt: [], now: T0 })

    expect(metrics.waitingConversations.value).toBe(1)
    expect(metrics.longestWaitMs.value).toBe(3 * HOUR)
  })
})

describe('dashboard — funil e vendas', () => {
  const deals = [
    { id: 'd1', stageId: 'novo', valueCents: 50_000, createdAt: T0 - DAY },
    { id: 'd2', stageId: 'negociacao', valueCents: 120_000, createdAt: T0 - DAY },
    { id: 'd3', stageId: 'ganho', valueCents: 200_000, createdAt: T0 - 3 * DAY, wonAt: T0 - 2 * HOUR }
  ]

  it('separa oportunidades abertas de vendas ganhas na janela', () => {
    const metrics = dashboardMetrics({ conversations: [], deals, stages, contactsCreatedAt: [], now: T0 })

    expect(metrics.opportunities.value).toBe(2)
    expect(metrics.openPipelineCents.value).toBe(170_000)
    expect(metrics.sales.value).toBe(1)
    expect(metrics.revenueCents.value).toBe(200_000)
  })

  it('venda fora da janela não conta como venda do período', () => {
    const old = [{ id: 'd9', stageId: 'ganho', valueCents: 900_000, createdAt: T0 - 30 * DAY, wonAt: T0 - 20 * DAY }]
    const metrics = dashboardMetrics({ conversations: [], deals: old, stages, contactsCreatedAt: [], now: T0 })

    expect(metrics.sales.value).toBe(0)
    expect(metrics.revenueCents.value).toBe(0)
  })

  it('conversão usa vendas na janela sobre conversas com mensagem de cliente', () => {
    const withInbound = addMessage(conversation('c1'), { id: 'a', direction: 'in', text: 'oi', at: T0 - HOUR })
    const metrics = dashboardMetrics({
      conversations: [withInbound],
      deals,
      stages,
      contactsCreatedAt: [],
      now: T0
    })

    expect(metrics.conversionRate.value).toBe(1)
  })

  it('sem etapa marcada como ganha, nada é contado como venda', () => {
    const noWon = stages.map(stage => ({ ...stage, won: false }))
    const metrics = dashboardMetrics({ conversations: [], deals, stages: noWon, contactsCreatedAt: [], now: T0 })

    expect(metrics.sales.value).toBe(0)
    expect(metrics.opportunities.value).toBe(3)
  })
})

describe('dashboard — leads e tarefas', () => {
  it('novos leads respeitam a janela pedida', () => {
    const metrics = dashboardMetrics({
      conversations: [],
      deals: [],
      stages,
      contactsCreatedAt: [T0 - HOUR, T0 - 3 * DAY, T0 - 20 * DAY],
      now: T0
    })

    expect(metrics.newLeads.value).toBe(2)

    const wider = dashboardMetrics({
      conversations: [],
      deals: [],
      stages,
      contactsCreatedAt: [T0 - HOUR, T0 - 3 * DAY, T0 - 20 * DAY],
      now: T0,
      windowDays: 30
    })

    expect(wider.newLeads.value).toBe(3)
  })

  it('tarefas pendentes só aparecem quando existe fonte real', () => {
    const withSource = dashboardMetrics({
      conversations: [],
      deals: [],
      stages,
      contactsCreatedAt: [],
      now: T0,
      pendingTasks: 4
    })

    expect(withSource.pendingTasks.value).toBe(4)
    expect(withSource.pendingTasks.emptyReason).toBeNull()
  })
})

describe('formatação', () => {
  it('duração é legível em s, min e h', () => {
    expect(formatDuration(30_000)).toBe('30 s')
    expect(formatDuration(45 * MIN)).toBe('45 min')
    expect(formatDuration(2 * HOUR)).toBe('2 h')
    expect(formatDuration(2 * HOUR + 30 * MIN)).toBe('2 h 30 min')
    expect(formatDuration(null)).toBe('—')
  })

  it('dinheiro em reais com milhar e centavos', () => {
    expect(formatMoney(0)).toBe('R$ 0,00')
    expect(formatMoney(123_456)).toBe('R$ 1.234,56')
    expect(formatMoney(100_000_00)).toBe('R$ 100.000,00')
    expect(formatMoney(null)).toBe('—')
  })

  it('percentual arredonda e nunca inventa', () => {
    expect(formatPercent(0.755)).toBe('76%')
    expect(formatPercent(1)).toBe('100%')
    expect(formatPercent(null)).toBe('—')
  })
})

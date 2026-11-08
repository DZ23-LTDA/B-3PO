import { describe, expect, it } from 'vitest'

import {
  auditSummary,
  emptyAutomationState,
  requiresApproval,
  runAutomations
} from './automation'
import type { AutomationEvent, AutomationRule } from './automation'

const T0 = 1_700_000_000_000
const MIN = 60_000

function event(overrides: Partial<AutomationEvent> = {}): AutomationEvent {
  return {
    id: 'evt-1',
    type: 'message_received',
    at: T0,
    subjectId: 'contato-1',
    payload: { intent: 'orcamento' },
    ...overrides
  }
}

function rule(overrides: Partial<AutomationRule> = {}): AutomationRule {
  return {
    id: 'r1',
    name: 'Classificar orçamento',
    enabled: true,
    trigger: 'message_received',
    actions: [{ kind: 'classify' }],
    ...overrides
  }
}

describe('automações — casamento de gatilho e condição', () => {
  it('planeja quando gatilho e condição batem', () => {
    const result = runAutomations(event(), [rule({ conditions: [{ field: 'intent', equals: 'orcamento' }] })], emptyAutomationState())

    expect(result.actions).toHaveLength(1)
    expect(result.actions[0]).toMatchObject({ ruleId: 'r1', eventId: 'evt-1', kind: 'classify' })
    expect(result.audit[0]?.outcome).toBe('planned')
  })

  it('condição que não bate é recusada com motivo', () => {
    const result = runAutomations(
      event(),
      [rule({ conditions: [{ field: 'intent', equals: 'suporte' }] })],
      emptyAutomationState()
    )

    expect(result.actions).toHaveLength(0)
    expect(result.audit[0]).toMatchObject({ outcome: 'skipped', reason: 'condition_failed' })
  })

  it('gatilho diferente nem entra na auditoria (não é ruído de erro)', () => {
    const result = runAutomations(event({ type: 'webhook' }), [rule()], emptyAutomationState())

    expect(result.actions).toHaveLength(0)
    expect(result.audit).toHaveLength(0)
  })
})

describe('automações — desligada e pausada', () => {
  it('regra desligada não roda e diz por quê', () => {
    const result = runAutomations(event(), [rule({ enabled: false })], emptyAutomationState())

    expect(result.actions).toHaveLength(0)
    expect(result.audit[0]).toMatchObject({ reason: 'rule_disabled' })
  })

  it('regra pausada não roda mesmo ligada', () => {
    const result = runAutomations(event(), [rule({ paused: true })], emptyAutomationState())

    expect(result.actions).toHaveLength(0)
    expect(result.audit[0]).toMatchObject({ reason: 'rule_paused' })
  })
})

describe('automações — idempotência e deduplicação', () => {
  it('mesmo evento reenviado não gera ação duas vezes', () => {
    const rules = [rule()]
    const first = runAutomations(event(), rules, emptyAutomationState())
    const again = runAutomations(event(), rules, first.state)

    expect(first.actions).toHaveLength(1)
    expect(again.actions).toHaveLength(0)
    expect(again.audit[0]).toMatchObject({ reason: 'already_processed' })
  })

  it('evento novo para o mesmo contato dentro da janela é deduplicado', () => {
    const rules = [rule()]
    const first = runAutomations(event(), rules, emptyAutomationState())
    const second = runAutomations(event({ id: 'evt-2', at: T0 + MIN }), rules, first.state)

    expect(second.actions).toHaveLength(0)
    expect(second.audit[0]).toMatchObject({ reason: 'deduplicated' })
  })

  it('fora da janela, volta a rodar para o mesmo contato', () => {
    const rules = [rule({ limits: { dedupeWindowMs: 2 * MIN } })]
    const first = runAutomations(event(), rules, emptyAutomationState())
    const later = runAutomations(event({ id: 'evt-3', at: T0 + 5 * MIN }), rules, first.state)

    expect(later.actions).toHaveLength(1)
  })

  it('contatos diferentes não se deduplicam entre si', () => {
    const rules = [rule()]
    const first = runAutomations(event(), rules, emptyAutomationState())
    const other = runAutomations(event({ id: 'evt-4', subjectId: 'contato-2' }), rules, first.state)

    expect(other.actions).toHaveLength(1)
  })

  it('não muta o estado recebido', () => {
    const state = emptyAutomationState()
    runAutomations(event(), [rule()], state)

    expect(state.processed).toEqual({})
  })
})

describe('automações — limites de loop e volume', () => {
  it('cadeia acima do teto é barrada', () => {
    const deep = event({ depth: 3 })
    const result = runAutomations(deep, [rule()], emptyAutomationState(), { maxDepth: 3 })

    expect(result.actions).toHaveLength(0)
    expect(result.audit[0]).toMatchObject({ reason: 'chain_limit' })
  })

  it('teto de ações por evento recusa a regra inteira', () => {
    const greedy = rule({
      actions: [{ kind: 'classify' }, { kind: 'assign' }, { kind: 'notify' }],
      limits: { maxActionsPerEvent: 2 }
    })
    const result = runAutomations(event(), [greedy], emptyAutomationState())

    expect(result.actions).toHaveLength(0)
    expect(result.audit[0]).toMatchObject({ reason: 'action_limit' })
  })

  it('ação sensível sai marcada para aprovação, não como envio silencioso', () => {
    const result = runAutomations(
      event(),
      [rule({ actions: [{ kind: 'classify' }, { kind: 'send_template', params: { template: 'boas-vindas' } }] })],
      emptyAutomationState()
    )

    expect(requiresApproval(result.actions)).toBe(true)
    expect(result.actions.find(action => action.kind === 'send_template')?.needsApproval).toBe(true)
    expect(result.actions.find(action => action.kind === 'classify')?.needsApproval).toBe(false)
  })

  it('cada ação tem chave de idempotência estável para o executor', () => {
    const result = runAutomations(event(), [rule({ actions: [{ kind: 'classify' }, { kind: 'notify' }] })], emptyAutomationState())

    expect(result.actions.map(action => action.idempotencyKey)).toEqual(['r1:evt-1:0', 'r1:evt-1:1'])
  })
})

describe('automações — auditoria legível', () => {
  it('resume planejadas e recusas por motivo', () => {
    const rules = [
      rule({ id: 'r1' }),
      rule({ id: 'r2', paused: true }),
      rule({ id: 'r3', conditions: [{ field: 'intent', equals: 'outro' }] })
    ]
    const result = runAutomations(event(), rules, emptyAutomationState())
    const summary = auditSummary(result.audit)

    expect(summary.some(item => item.label === 'ações planejadas' && item.count === 1)).toBe(true)
    expect(summary.some(item => item.label === 'regra pausada' && item.count === 1)).toBe(true)
    expect(summary.some(item => item.label === 'condição não bateu' && item.count === 1)).toBe(true)
  })

  it('nenhuma ação sensível planejada significa que não há aprovação pendente', () => {
    const result = runAutomations(event(), [rule({ actions: [{ kind: 'classify' }] })], emptyAutomationState())

    expect(requiresApproval(result.actions)).toBe(false)
  })
})

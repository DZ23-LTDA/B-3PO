import { describe, expect, it } from 'vitest'

import type { ExecutionEvent } from '../protocol/execution'
import { approvalView, botListItems, emptyStateCopy, summarizeExecution } from './view-models'

function ev(
  type: ExecutionEvent['type'],
  sequence: number,
  data?: Record<string, unknown>
): ExecutionEvent {
  return {
    event_id: `e-${sequence}`,
    execution_id: 'exec-1',
    correlation_id: 'corr-1',
    sequence,
    type,
    at: 1_700_000_000_000 + sequence,
    data
  }
}

describe('lista de bots (view-model)', () => {
  it('ordena por título e mostra o estado do gateway', () => {
    const items = botListItems([
      { name: 'z', title: 'Zelador', description: 'd', activity: 'idle' },
      { name: 'a', title: 'Analista', description: 'd', activity: 'waiting_approval' }
    ])

    expect(items.map(i => i.title)).toEqual(['Analista', 'Zelador'])
    expect(items[0]?.statusLabel).toBe('Aguardando aprovação')
    expect(items[0]?.needsAttention).toBe(true)
    expect(items[1]?.needsAttention).toBe(false)
  })

  it('sem atividade informada não inventa estado nem chama atenção', () => {
    const [item] = botListItems([{ name: 'a', title: 'Analista', description: 'd', activity: null }])

    expect(item?.statusLabel).toBe('Sem atividade')
    expect(item?.needsAttention).toBe(false)
  })

  it('o rótulo de acessibilidade diz título e estado', () => {
    const [item] = botListItems([{ name: 'a', title: 'Analista', description: 'd', activity: 'working' }])

    expect(item?.accessibilityLabel).toBe('Analista, Trabalhando')
  })

  it('lista vazia continua vazia (a tela mostra o estado vazio)', () => {
    expect(botListItems([])).toEqual([])
  })
})

describe('resumo de execução', () => {
  it('sem eventos não há resumo — nada inventado', () => {
    expect(summarizeExecution([])).toBeNull()
  })

  it('acompanha as fases reais na ordem dos eventos', () => {
    expect(summarizeExecution([ev('execution.created', 1)])?.phase).toBe('running')
    expect(summarizeExecution([ev('execution.created', 1), ev('execution.waiting_approval', 2)])?.phase).toBe(
      'waiting_approval'
    )
    expect(
      summarizeExecution([ev('execution.created', 1), ev('execution.completed', 2)])?.phase
    ).toBe('completed')
  })

  it('só permite decidir quando o gateway PEDIU aprovação', () => {
    expect(summarizeExecution([ev('execution.created', 1)])?.canDecide).toBe(false)
    expect(summarizeExecution([ev('execution.waiting_approval', 1)])?.canDecide).toBe(true)
  })

  it('mostra a ferramenta em uso e a mensagem de erro real', () => {
    const running = summarizeExecution([ev('execution.tool_started', 1, { tool: 'terminal' })])
    const failed = summarizeExecution([ev('execution.failed', 1, { error: 'timeout do provedor' })])

    expect(running?.detail).toBe('Usando terminal')
    expect(running?.toolName).toBe('terminal')
    expect(failed?.phaseLabel).toBe('Falhou')
    expect(failed?.errorMessage).toBe('timeout do provedor')
  })

  it('cancelamento aparece como cancelado, não como falha', () => {
    const summary = summarizeExecution([ev('execution.cancelled', 2)])

    expect(summary?.phase).toBe('cancelled')
    expect(summary?.errorMessage).toBeNull()
  })
})

describe('tela de aprovação', () => {
  const waiting = summarizeExecution([ev('execution.waiting_approval', 1, { tool: 'run_shell' })])

  it('não existe tela quando não há aprovação pendente', () => {
    expect(approvalView(null, { deciding: false, hasDeviceToken: true, ownershipVerified: true })).toBeNull()
    expect(
      approvalView(summarizeExecution([ev('execution.completed', 1)]), { deciding: false, hasDeviceToken: true, ownershipVerified: true })
    ).toBeNull()
  })

  it('com token no cofre, aprovar e negar ficam habilitados', () => {
    const view = approvalView(waiting, { deciding: false, hasDeviceToken: true, ownershipVerified: true })

    expect(view?.body).toBe('O bot quer usar run_shell para continuar.')
    expect(view?.approveEnabled).toBe(true)
    expect(view?.denyEnabled).toBe(true)
    expect(view?.blockedReason).toBeNull()
  })

  it('sem token do cofre não deixa decidir e explica por quê', () => {
    const view = approvalView(waiting, { deciding: false, hasDeviceToken: false, ownershipVerified: true })

    expect(view?.approveEnabled).toBe(false)
    expect(view?.denyEnabled).toBe(false)
    expect(view?.blockedReason).toContain('Pareie este aparelho')
  })

  it('enquanto envia, os botões ficam travados para não decidir duas vezes', () => {
    const view = approvalView(waiting, { deciding: true, hasDeviceToken: true, ownershipVerified: true })

    expect(view?.approveEnabled).toBe(false)
    expect(view?.blockedReason).toContain('Enviando')
  })
})

describe('estados vazios', () => {
  it('cada motivo tem texto próprio e acionável', () => {
    for (const reason of ['no-bots', 'no-conversations', 'offline', 'connecting'] as const) {
      const copy = emptyStateCopy(reason)
      expect(copy.title.length).toBeGreaterThan(3)
      expect(copy.body.length).toBeGreaterThan(20)
    }
  })

  it('offline promete pendência, não finge sucesso', () => {
    expect(emptyStateCopy('offline').body).toContain('pendentes')
  })
})

describe('aprovação exige confirmação de posse', () => {
  const waiting = summarizeExecution([ev('execution.waiting_approval', 1, { tool: 'run_shell' })])

  it('deep link com execução de outra pessoa não oferece decisão', () => {
    const view = approvalView(waiting, { deciding: false, hasDeviceToken: true, ownershipVerified: false })

    expect(view?.approveEnabled).toBe(false)
    expect(view?.denyEnabled).toBe(false)
    expect(view?.blockedReason).toContain('Confirmando')
  })
})

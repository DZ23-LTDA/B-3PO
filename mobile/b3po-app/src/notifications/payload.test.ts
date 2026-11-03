import { describe, expect, it } from 'vitest'

import { approvalDecision, readNotificationIntent } from './payload'

describe('payload de notificação', () => {
  it('leva à tela de aprovação sem decidir nada', () => {
    const intent = readNotificationIntent({
      kind: 'approval_request',
      execution_id: 'exec-1',
      session_id: 'sess-1'
    })

    expect(intent).toEqual({
      kind: 'execution',
      executionId: 'exec-1',
      sessionId: 'sess-1',
      focus: 'approval'
    })
  })

  it('rejeita payload que tenta carregar a decisão', () => {
    for (const field of ['approve', 'decision', 'cancel', 'confirm']) {
      const intent = readNotificationIntent({
        kind: 'approval_request',
        execution_id: 'exec-1',
        [field]: true
      })

      expect(intent.kind, field).toBe('ignore')
      if (intent.kind !== 'ignore') return
      expect(intent.reason).toBe(`decision-in-payload:${field}`)
    }
  })

  it('aprovação sem execução não navega para lugar nenhum', () => {
    const intent = readNotificationIntent({ kind: 'approval_request' })

    expect(intent).toEqual({ kind: 'ignore', reason: 'approval-without-execution' })
  })

  it('leva ao detalhe da execução quando o payload só identifica a execução', () => {
    const intent = readNotificationIntent({ execution_id: 'exec-9' })

    expect(intent).toEqual({ kind: 'execution', executionId: 'exec-9', sessionId: null, focus: 'detail' })
  })

  it('leva à conversa quando o payload é de mensagem', () => {
    expect(readNotificationIntent({ kind: 'message', session_id: 'sess-3' })).toEqual({
      kind: 'message',
      sessionId: 'sess-3'
    })
  })

  it('ignora payload irreconhecível ou vazio em vez de abrir tela errada', () => {
    for (const payload of [null, undefined, 'texto', 42, {}, { kind: 'mensagem' }]) {
      expect(readNotificationIntent(payload).kind).toBe('ignore')
    }
  })

  it('a decisão carrega execução e token do dispositivo', () => {
    expect(approvalDecision('exec-1', true, 'dev-token')).toEqual({
      execution_id: 'exec-1',
      approve: true,
      device_token: 'dev-token'
    })
  })

  it('não monta decisão sem execução ou sem token do cofre', () => {
    expect(approvalDecision('  ', true, 'dev-token')).toEqual({ error: 'missing-execution' })
    expect(approvalDecision('exec-1', false, '')).toEqual({ error: 'missing-token' })
  })
})

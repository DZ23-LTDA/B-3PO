/**
 * Contrato de execução do mobile: nada é inventado, nada é duplicado.
 */
import { describe, expect, it } from 'vitest'

import {
  ExecutionLog,
  RUNTIME_CAPABILITIES,
  decideTool,
  mapRuntimeFrame,
  type ExecutionEvent,
  type PermissionPolicy
} from './execution'

const base = {
  correlation_id: 'corr-1',
  execution_id: 'exec-1'
}

function event(sequence: number, type: ExecutionEvent['type'], eventId = `ev-${sequence}`): ExecutionEvent {
  return { ...base, at: 1_700_000_000_000, event_id: eventId, sequence, type }
}

describe('mapRuntimeFrame', () => {
  it('traduz os frames que o cliente entende', () => {
    expect(mapRuntimeFrame({ type: 'turn.start' })).toBe('execution.started')
    expect(mapRuntimeFrame({ type: 'turn.end' })).toBe('execution.completed')
    expect(mapRuntimeFrame({ type: 'turn.error' })).toBe('execution.failed')
    expect(mapRuntimeFrame({ type: 'turn.failed' })).toBe('execution.failed')
    expect(mapRuntimeFrame({ type: 'tool.start' })).toBe('execution.tool_started')
    expect(mapRuntimeFrame({ type: 'tool.complete' })).toBe('execution.tool_finished')
    expect(mapRuntimeFrame({ type: 'approval.request' })).toBe('execution.waiting_approval')
  })

  it('devolve null para frame desconhecido em vez de fabricar evento', () => {
    expect(mapRuntimeFrame({ type: 'tool.generating' })).toBeNull()
    expect(mapRuntimeFrame({ type: 'session.compress' })).toBeNull()
    expect(mapRuntimeFrame({})).toBeNull()
    expect(mapRuntimeFrame({ type: 'qualquer.coisa.nova' })).toBeNull()
  })
})

describe('RUNTIME_CAPABILITIES', () => {
  it('declara que o mobile não executa ferramenta', () => {
    expect(RUNTIME_CAPABILITIES.clientExecutesTools).toBe(false)
    expect(RUNTIME_CAPABILITIES.approval).toBe('gateway')
    expect(RUNTIME_CAPABILITIES.cancellation).toBe('interrupt')
  })

  it('é congelado: capability não vira promessa em runtime', () => {
    expect(Object.isFrozen(RUNTIME_CAPABILITIES)).toBe(true)
  })
})

describe('decideTool', () => {
  const policy: PermissionPolicy = { allow: ['read_file', 'web_search'], default: 'ask', deny: ['terminal'] }

  it('deny vence allow e default', () => {
    expect(decideTool({ ...policy, allow: ['terminal'] }, 'terminal')).toBe('deny')
  })

  it('allow explícito permite', () => {
    expect(decideTool(policy, 'read_file')).toBe('allow')
  })

  it('sem regra, cai no default', () => {
    expect(decideTool(policy, 'write_file')).toBe('ask')
    expect(decideTool({ ...policy, default: 'deny' }, 'write_file')).toBe('deny')
  })
})

describe('ExecutionLog', () => {
  it('não duplica evento reenviado (reconexão)', () => {
    const log = new ExecutionLog()

    expect(log.append(event(1, 'execution.created'))).toBe(true)
    expect(log.append(event(1, 'execution.created'))).toBe(false)
    expect(log.list()).toHaveLength(1)
  })

  it('aceita o mesmo sequence com event_id diferente (não engole evento novo)', () => {
    const log = new ExecutionLog()

    expect(log.append(event(1, 'execution.started', 'ev-a'))).toBe(true)
    expect(log.append(event(1, 'execution.started', 'ev-b'))).toBe(true)
    expect(log.list()).toHaveLength(2)
  })

  it('deriva o estado do log, na ordem em que chegou', () => {
    const log = new ExecutionLog()

    expect(log.stateOf('exec-1')).toBe('unknown')
    log.append(event(1, 'execution.created'))
    expect(log.stateOf('exec-1')).toBe('running')
    log.append(event(2, 'execution.waiting_approval'))
    expect(log.stateOf('exec-1')).toBe('waiting_approval')
    log.append(event(3, 'execution.completed'))
    expect(log.stateOf('exec-1')).toBe('completed')
  })

  it('failed e cancelled são terminais', () => {
    const log = new ExecutionLog()
    log.append(event(1, 'execution.started'))
    log.append(event(2, 'execution.failed'))
    expect(log.stateOf('exec-1')).toBe('failed')

    const cancelled = new ExecutionLog()
    cancelled.append(event(1, 'execution.started'))
    cancelled.append(event(2, 'execution.cancel_requested'))
    expect(cancelled.stateOf('exec-1')).toBe('cancelled')
  })

  it('separa execuções diferentes', () => {
    const log = new ExecutionLog()
    log.append(event(1, 'execution.started'))
    log.append({ ...event(1, 'execution.started'), execution_id: 'exec-2' })

    expect(log.list('exec-1')).toHaveLength(1)
    expect(log.list('exec-2')).toHaveLength(1)
    expect(log.list()).toHaveLength(2)
  })
})

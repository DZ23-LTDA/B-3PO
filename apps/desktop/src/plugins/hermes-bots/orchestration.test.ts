/**
 * Contrato da orquestração v1: mapeamento de frames reais, proibição de evento fabricado,
 * política no despacho e idempotência por sequência.
 */

import { describe, expect, it } from 'vitest'

import {
  decideTool,
  EVENT_VERSION,
  type ExecutionContext,
  ExecutionLog,
  HERMES_CAPABILITIES,
  mapRuntimeFrame,
  newCorrelationId,
  newExecutionId
} from './orchestration'

const ctx: ExecutionContext = { execution_id: 'exec_1', bot_id: 'bot_1' }
const fixedNow = () => 1_700_000_000_000
const fixedRand = () => 0.5

describe('mapRuntimeFrame', () => {
  it('mapeia turn.start para execution.started com session_ref', () => {
    const event = mapRuntimeFrame(ctx, { type: 'turn.start', sid: 'sess_9' }, 1, fixedNow, fixedRand)

    expect(event).toMatchObject({
      event_version: EVENT_VERSION,
      event_type: 'execution.started',
      execution_id: 'exec_1',
      bot_id: 'bot_1',
      sequence: 1,
      session_ref: 'sess_9'
    })
  })

  it('mapeia tool.start e tool.complete com nome e id da ferramenta', () => {
    const started = mapRuntimeFrame(
      ctx,
      { type: 'tool.start', name: 'read_file', tool_id: 't1' },
      2,
      fixedNow,
      fixedRand
    )

    const finished = mapRuntimeFrame(
      ctx,
      { type: 'tool.complete', name: 'read_file', tool_id: 't1' },
      3,
      fixedNow,
      fixedRand
    )

    expect(started?.event_type).toBe('execution.tool_started')
    expect(started?.payload).toMatchObject({ tool: 'read_file', tool_id: 't1' })
    expect(finished?.event_type).toBe('execution.tool_finished')
  })

  it('mapeia turn.end para completed e turn.error para failed com motivo', () => {
    const done = mapRuntimeFrame(ctx, { type: 'turn.end' }, 4, fixedNow, fixedRand)
    const failed = mapRuntimeFrame(ctx, { type: 'turn.error', error: 'provider down' }, 5, fixedNow, fixedRand)

    expect(done?.event_type).toBe('execution.completed')
    expect(failed?.event_type).toBe('execution.failed')
    expect(failed?.payload.reason).toBe('provider down')
  })

  it('nunca fabrica evento para frame desconhecido', () => {
    for (const frame of [
      { type: 'message.delta', text: 'oi' },
      { type: 'tool.generating', name: 'read_file' },
      { type: 'approval.request' },
      { type: 'qualquer.coisa.nova' },
      {}
    ]) {
      expect(mapRuntimeFrame(ctx, frame, 6, fixedNow, fixedRand)).toBeNull()
    }
  })

  it('gera ids com prefixo e sem colisão mesmo com relógio fixo', () => {
    const first = newExecutionId(fixedNow, fixedRand)
    const second = newExecutionId(fixedNow, fixedRand)

    expect(first).toMatch(/^exec_/)
    expect(first).not.toBe(second)
    expect(newCorrelationId(fixedNow, fixedRand)).toMatch(/^corr_/)
  })
})

describe('HERMES_CAPABILITIES', () => {
  it('declara só o que o adaptador consegue emitir', () => {
    expect(HERMES_CAPABILITIES.runtime).toBe('hermes')
    expect(HERMES_CAPABILITIES.tool_trace).toBe(true)
    expect(HERMES_CAPABILITIES.approval).toBe('gateway')
    expect(HERMES_CAPABILITIES.cancellation).toBe('interrupt')
    expect(HERMES_CAPABILITIES.events).not.toContain('execution.cancelled')
    expect(HERMES_CAPABILITIES.events).not.toContain('execution.waiting_approval')
  })
})

describe('decideTool', () => {
  const policy = { allow: ['read_file', 'web_search'], deny: ['terminal'], default: 'deny' as const }

  it('deny vence allow', () => {
    expect(decideTool({ ...policy, allow: ['terminal'] }, 'terminal')).toBe('deny')
  })

  it('allow lista a ferramenta', () => {
    expect(decideTool(policy, 'read_file')).toBe('allow')
  })

  it('default decide o resto (deny ou ask)', () => {
    expect(decideTool(policy, 'write_file')).toBe('deny')
    expect(decideTool({ ...policy, default: 'ask' }, 'write_file')).toBe('ask')
  })
})

describe('ExecutionLog', () => {
  const make = (type: Parameters<typeof mapRuntimeFrame>[1]['type'], seq: number) =>
    mapRuntimeFrame(ctx, { type }, seq, fixedNow, fixedRand)!

  it('aplica eventos únicos e ignora replay idêntico', () => {
    const log = new ExecutionLog()
    const started = make('turn.start', 1)
    const finished = make('turn.end', 2)

    expect(log.append(started)).toBe(true)
    expect(log.append(started)).toBe(false)
    expect(log.append(finished)).toBe(true)
    expect(log.list()).toHaveLength(2)
  })

  it('rejeita mesma sequência com mesmo tipo (reconexão não duplica)', () => {
    const log = new ExecutionLog()
    const a = make('turn.start', 7)
    const b = make('turn.start', 7)

    expect(log.append(a)).toBe(true)
    expect(log.append(b)).toBe(false)
    expect(log.list()).toHaveLength(1)
  })

  it('acompanha o status da execução', () => {
    const log = new ExecutionLog()
    expect(log.status()).toBe('unknown')

    log.append(make('turn.start', 1))
    expect(log.status()).toBe('running')

    log.append(make('turn.end', 2))
    expect(log.status()).toBe('completed')
  })

  it('marca falha quando turn.error chega', () => {
    const log = new ExecutionLog()
    log.append(mapRuntimeFrame(ctx, { type: 'turn.start' }, 1, fixedNow, fixedRand)!)
    log.append(mapRuntimeFrame(ctx, { type: 'turn.error', error: 'x' }, 2, fixedNow, fixedRand)!)

    expect(log.status()).toBe('failed')
  })
})

import { describe, expect, it } from 'vitest'

import type { ExecutionEvent } from '../protocol/execution'
import { applyEventBatch, cursorFor, emptyCursor, resumePayload } from './cursor'

let counter = 0

function event(executionId: string, sequence: number, type: ExecutionEvent['type'] = 'execution.tool_started'): ExecutionEvent {
  counter += 1

  return {
    event_id: `${executionId}-evt-${counter}`,
    execution_id: executionId,
    correlation_id: 'corr-1',
    sequence,
    type,
    at: 1_700_000_000_000 + sequence
  }
}

/** Estreita o resultado para o ramo "aplicado" — o vitest não ajuda o tsc a narrowar. */
function applied(outcome: ReturnType<typeof applyEventBatch>) {
  if (outcome.kind !== 'applied') {
    throw new Error(`esperava 'applied', veio '${outcome.kind}'`)
  }

  return outcome
}

/** Estreita o resultado para o ramo "duplicado". */
function duplicated(outcome: ReturnType<typeof applyEventBatch>) {
  if (outcome.kind !== 'duplicate') {
    throw new Error(`esperava 'duplicate', veio '${outcome.kind}'`)
  }

  return outcome
}

describe('cursor de reindexação', () => {
  it('aplica um lote em ordem e avança o cursor', () => {
    const outcome = applied(applyEventBatch(emptyCursor(), [event('e1', 1), event('e1', 2)]))

    expect(outcome.events.map(e => e.sequence)).toEqual([1, 2])
    expect(cursorFor(outcome.cursor, 'e1')).toBe(2)
  })

  it('ordena o lote por execução e sequence antes de aplicar', () => {
    const outcome = applied(applyEventBatch(emptyCursor(), [event('e1', 2), event('e1', 1), event('e2', 1)]))

    expect(outcome.events.map(e => `${e.execution_id}:${e.sequence}`)).toEqual(['e1:1', 'e1:2', 'e2:1'])
  })

  it('descarta reenvio já aplicado — reconectar não repete a tela', () => {
    const first = applyEventBatch(emptyCursor(), [event('e1', 1), event('e1', 2)])
    const again = duplicated(applyEventBatch(first.cursor, [event('e1', 1), event('e1', 2)]))

    expect(again.events).toHaveLength(2)
    expect(cursorFor(again.cursor, 'e1')).toBe(2)
  })

  it('descarta evento repetido com o mesmo id mesmo se a sequence for outra', () => {
    const first = applied(applyEventBatch(emptyCursor(), [event('e1', 1)]))
    const seen = first.events[0]

    if (!seen) throw new Error('o lote aplicado deveria conter o evento')
    const replay: ExecutionEvent = {
      event_id: seen.event_id,
      execution_id: seen.execution_id,
      correlation_id: seen.correlation_id,
      type: seen.type,
      at: seen.at,
      sequence: 5
    }
    const outcome = duplicated(applyEventBatch(first.cursor, [replay]))

    expect(cursorFor(outcome.cursor, 'e1')).toBe(1)
  })

  it('recusa o lote inteiro quando encontra buraco: progresso inventado é pior que esperar', () => {
    const start = applyEventBatch(emptyCursor(), [event('e1', 1)]).cursor
    const outcome = applyEventBatch(start, [event('e1', 3)])

    if (outcome.kind !== 'gap') throw new Error(`esperava 'gap', veio '${outcome.kind}'`)

    expect(outcome.missingFrom).toBe(2)
    expect(outcome.executionId).toBe('e1')
    // o cursor fica onde estava: nada do lote incompleto é aplicado
    expect(cursorFor(outcome.cursor, 'e1')).toBe(1)
  })

  it('não muta o cursor recebido', () => {
    const start = emptyCursor()
    const outcome = applyEventBatch(start, [event('e1', 1)])

    expect(start.sequences).toEqual({})
    expect(cursorFor(outcome.cursor, 'e1')).toBe(1)
  })

  it('mantém execuções independentes no mesmo cursor', () => {
    const a = applyEventBatch(emptyCursor(), [event('e1', 1), event('e2', 1)])
    const b = applied(applyEventBatch(a.cursor, [event('e2', 2)]))

    expect(cursorFor(b.cursor, 'e1')).toBe(1)
    expect(cursorFor(b.cursor, 'e2')).toBe(2)
  })

  it('envia ao gateway só o que já viu, em ordem estável', () => {
    const cursor = applyEventBatch(emptyCursor(), [event('e2', 1), event('e1', 3)]).cursor
    const payload = resumePayload({ ...cursor, sequences: { e1: 3, e2: 1 } })

    expect(payload).toEqual([
      { execution_id: 'e1', after_sequence: 3 },
      { execution_id: 'e2', after_sequence: 1 }
    ])
  })

  it('um lote vazio é duplicata, não aplicação', () => {
    duplicated(applyEventBatch(emptyCursor(), []))
  })
})

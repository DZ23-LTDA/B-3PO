/**
 * Reconexão sem replay duplicado.
 *
 * O contrato de execução entrega eventos com `sequence` monotônica por execução. Quando o celular
 * perde a conexão (troca de rede, app em segundo plano) ele reconecta e reenvia o último cursor. O
 * gateway pode repetir eventos já vistos — e repetir um `execution.failed` na tela, ou pior, mandar
 * o cliente reapresentar uma aprovação já decidida, é o defeito que este módulo impede.
 *
 * Regra: o cliente só aplica eventos com `sequence` maior que o cursor, em ordem, e **recusa** o lote
 * inteiro quando encontra um buraco (um evento faltando). Burado é falha de transporte, não motivo
 * para "seguir com o que chegou": a tela mostraria progresso inventado. Quem decide re-sincronizar é
 * a camada de conexão, pedindo o replay completo do gateway.
 */

import type { ExecutionEvent } from '../protocol/execution'

export interface CursorState {
  /** Última `sequence` aplicada, por execução. */
  sequences: Record<string, number>
  /** Ids já aplicados, para descartar reenvio com a mesma sequence trocada. */
  seenEventIds: Record<string, true>
}

export type ApplyOutcome =
  | { kind: 'applied'; events: ExecutionEvent[]; cursor: CursorState }
  | { kind: 'duplicate'; events: ExecutionEvent[]; cursor: CursorState }
  | { kind: 'gap'; missingFrom: number; executionId: string; cursor: CursorState }

export function emptyCursor(): CursorState {
  return { sequences: {}, seenEventIds: {} }
}

export function cursorFor(cursor: CursorState, executionId: string): number {
  return cursor.sequences[executionId] ?? 0
}

/**
 * Aplica um lote recebido sobre o cursor. Devolve o cursor novo (nunca muta o recebido) para que a
 * camada de UI possa descartar um resultado que chegou fora de ordem.
 */
export function applyEventBatch(cursor: CursorState, incoming: readonly ExecutionEvent[]): ApplyOutcome {
  const sequences = { ...cursor.sequences }
  const seenEventIds = { ...cursor.seenEventIds }
  const applied: ExecutionEvent[] = []
  const duplicates: ExecutionEvent[] = []

  // Ordena por execução e sequence: a rede não garante ordem entre execuções concorrentes.
  const sorted = [...incoming].sort((a, b) =>
    a.execution_id === b.execution_id
      ? a.sequence - b.sequence
      : a.execution_id.localeCompare(b.execution_id)
  )

  for (const event of sorted) {
    const executionId = event.execution_id

    if (seenEventIds[event.event_id]) {
      duplicates.push(event)
      continue
    }

    const current = sequences[executionId] ?? 0

    if (event.sequence <= current) {
      duplicates.push(event)
      continue
    }

    if (event.sequence !== current + 1) {
      return { kind: 'gap', missingFrom: current + 1, executionId, cursor: { sequences, seenEventIds } }
    }

    sequences[executionId] = event.sequence
    seenEventIds[event.event_id] = true
    applied.push(event)
  }

  const nextCursor = { sequences, seenEventIds }

  if (applied.length === 0) {
    return { kind: 'duplicate', events: duplicates, cursor: nextCursor }
  }

  return { kind: 'applied', events: applied, cursor: nextCursor }
}

/** O cursor que o cliente envia no `resume` para o gateway. */
export function resumePayload(cursor: CursorState): { execution_id: string; after_sequence: number }[] {
  return Object.entries(cursor.sequences)
    .map(([execution_id, after_sequence]) => ({ execution_id, after_sequence }))
    .sort((a, b) => a.execution_id.localeCompare(b.execution_id))
}

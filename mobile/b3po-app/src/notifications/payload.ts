/**
 * Notificação push NÃO é autorização.
 *
 * Uma notificação pode dizer "o bot está esperando aprovação" e levar a pessoa direto para a tela de
 * aprovação. Ela **não** pode decidir nada: o toque abre a tela, o celular busca o estado real no
 * gateway e a decisão sai de um botão dessa tela, com o token do dispositivo. Se o payload trouxesse
 * algo como `approve: true`, um app comprometido ou um payload forjado aprovaria uma ação perigosa
 * sem ninguém olhar — a classe de falha que o GOAL proíbe explicitamente (§15.4).
 *
 * Este módulo converte o payload em uma INTENÇÃO de navegação e descarta qualquer campo de decisão.
 */

export type NotificationIntent =
  | { kind: 'execution'; executionId: string; sessionId: string | null; focus: 'detail' | 'approval' }
  | { kind: 'message'; sessionId: string }
  | { kind: 'ignore'; reason: string }

/** Campos que um payload hostil pode trazer e que este cliente nunca honra. */
const DECISION_FIELDS = ['approve', 'approved', 'decision', 'action', 'cancel', 'deny', 'confirm'] as const

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function readNotificationIntent(payload: unknown): NotificationIntent {
  if (!payload || typeof payload !== 'object') {
    return { kind: 'ignore', reason: 'payload-not-object' }
  }

  const data = payload as Record<string, unknown>

  // Presença de campo de decisão é rejeitada de propósito, não ignorada em silêncio: o chamador
  // registra isso e o time vê que alguém tentou (ou que o remetente está errado).
  for (const field of DECISION_FIELDS) {
    if (field in data) {
      return { kind: 'ignore', reason: `decision-in-payload:${field}` }
    }
  }

  const executionId = text(data.execution_id ?? data.executionId)
  const sessionId = text(data.session_id ?? data.sessionId)
  const kind = text(data.kind ?? data.type)

  if (kind === 'approval_request' || kind === 'waiting_approval') {
    if (!executionId) {
      return { kind: 'ignore', reason: 'approval-without-execution' }
    }

    return { kind: 'execution', executionId, sessionId: sessionId || null, focus: 'approval' }
  }

  if (executionId) {
    return { kind: 'execution', executionId, sessionId: sessionId || null, focus: 'detail' }
  }

  if (kind === 'message' && sessionId) {
    return { kind: 'message', sessionId }
  }

  return { kind: 'ignore', reason: 'unrecognized-payload' }
}

/**
 * O que o app ENVIA de volta para o gateway ao tocar numa ação de aprovação. Separado do parser de
 * propósito: a decisão vem da tela, com o token do dispositivo, nunca do payload da notificação.
 */
export interface ApprovalDecision {
  execution_id: string
  approve: boolean
  /** Token do cofre seguro; o gateway valida no backend, não no cliente. */
  device_token: string
}

export function approvalDecision(
  executionId: string,
  approve: boolean,
  deviceToken: string
): ApprovalDecision | { error: 'missing-execution' | 'missing-token' } {
  if (!executionId.trim()) {
    return { error: 'missing-execution' }
  }

  if (!deviceToken.trim()) {
    return { error: 'missing-token' }
  }

  return { execution_id: executionId, approve, device_token: deviceToken }
}

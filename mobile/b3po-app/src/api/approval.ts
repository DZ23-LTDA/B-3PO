/**
 * Aprovações vindas do computador.
 *
 * O gateway pode parar um turno e pedir decisão humana (`server_requests`): o aparelho recebe uma
 * requisição JSON-RPC com `method: "approval"` e precisa responder com um *result* no mesmo `id`.
 * Sem isso o turno fica parado até o tempo limite e o usuário nunca vê que algo espera por ele.
 *
 * O que é decidido aqui é só apresentação e forma do frame — quem autoriza é o backend.
 */

export const APPROVAL_METHOD = 'approval'

export interface ApprovalRequest {
  /** `request_id` do backend: identifica o pedido para retirar/settlar. */
  requestId: string
  /** `id` do frame JSON-RPC: é nele que a resposta precisa voltar. */
  wireId: number
  command: string
  description: string
  choices: string[]
}

const CHOICE_LABELS: Record<string, string> = {
  always: 'Sempre permitir',
  deny: 'Negar',
  once: 'Permitir uma vez',
  session: 'Permitir nesta sessão'
}

/** Rótulo em pt-BR; uma escolha desconhecida aparece como veio, sem inventar significado. */
export function choiceLabel(choice: string): string {
  return CHOICE_LABELS[choice] ?? choice
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * Um frame só é aprovação se trouxer `method: "approval"` e um `id` numérico — frames de resposta
 * (`result`/`error`) e notificações sem id passam direto.
 */
export function parseApprovalFrame(frame: Record<string, unknown> | null): ApprovalRequest | null {
  if (!frame || frame['method'] !== APPROVAL_METHOD) {
    return null
  }

  const wireId = frame['id']

  if (typeof wireId !== 'number') {
    return null
  }

  const params = (frame['params'] ?? {}) as Record<string, unknown>
  const raw = Array.isArray(params['choices']) ? params['choices'] : []
  const choices = raw.filter((choice): choice is string => typeof choice === 'string' && choice.length > 0)

  return {
    choices: choices.length > 0 ? choices : ['once', 'deny'],
    command: text(params['command']),
    description: text(params['description']),
    requestId: text(params['request_id']),
    wireId
  }
}

/** Resposta ao pedido: `result` no `id` do frame. `choice` é a decisão; o backend valida. */
export function approvalResponseFrame(wireId: number, choice: string): Record<string, unknown> {
  return { id: wireId, jsonrpc: '2.0', result: { choice } }
}

/** Texto do cartão: a descrição quando existe, senão o comando; nada de rótulo vazio. */
export function approvalSummary(request: ApprovalRequest): string {
  if (request.description.trim()) {
    return request.description.trim()
  }

  return request.command.trim() || 'O computador pediu uma autorização.'
}

/**
 * Pedidos que o servidor deixou abertos e devolveu no snapshot de `session.resume`.
 *
 * Sem isso, um celular que reconecta durante uma aprovação pendente não mostra nada e o turno fica parado
 * até o tempo limite — o usuário nunca sabe que a decisão é dele.
 */
export function approvalsFromOpenRequests(open: unknown): ApprovalRequest[] {
  if (!Array.isArray(open)) {
    return []
  }

  return open
    .map(entry => {
      if (!entry || typeof entry !== 'object') {
        return null
      }

      const record = entry as Record<string, unknown>
      const wireId = record['id']

      return parseApprovalFrame({
        id: typeof wireId === 'number' ? wireId : Number.NaN,
        method: record['method'],
        params: record['params']
      })
    })
    .filter((request): request is ApprovalRequest => request !== null)
}

/** O mais antigo primeiro, como o backend enfileira: uma decisão por vez. */
export function firstPendingApproval(open: unknown): ApprovalRequest | null {
  return approvalsFromOpenRequests(open)[0] ?? null
}

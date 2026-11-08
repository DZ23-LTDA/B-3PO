/**
 * JSON-RPC do gateway pelo WebSocket — o caminho real de **enviar** uma mensagem.
 *
 * O contrato abaixo não veio de documentação: veio de quatro tentativas contra o servidor rodando,
 * com o erro de cada uma (registrado em `docs/b3po/DEVICE-AUTHORIZATION.md` §9.3).
 *
 * O que o servidor aceita:
 *
 * - credencial: `?token=<session token>` no query. Ticket de dispositivo **não** é aceito em
 *   `/api/ws` nesta superfície (`serve`): o ramo sem gate só consome ticket quando a superfície é
 *   `webapp`, e o header `x-hermes-gateway-ticket` é recusado de propósito em socket de núcleo.
 * - `Origin` igual à origem HTTP do servidor. Sem ele o upgrade é recusado (403).
 * - **nenhum subprotocolo**: pedir `hermes-gateway-v1` faz o cliente falhar com
 *   "Server sent no subprotocol", porque o servidor não o devolve nesse ramo.
 * - `session.resume` com o id **canônico** (`stored_session_id`, ex. `20261103_140104_f5df78`); o id
 *   curto devolvido por `session.create` dá `4007 session not found`.
 * - `prompt.submit` com **apenas** `session_id` e `text`. `submission_id` e `input_id` são recusados
 *   como "Extra inputs are not permitted" — o schema de params é fechado.
 *
 * Resultado observado: `{"status":"streaming","user_row_id":1}`.
 */

export const GATEWAY_WS_PATH = '/api/ws'

/** Chaves que `prompt.submit` aceita nesta versão do backend. Mais que isto é recusado. */
export const PROMPT_SUBMIT_KEYS = ['session_id', 'text'] as const

export interface GatewayCredential {
  /** Token de sessão do pareamento. É a credencial que o ramo sem gate aceita em `/api/ws`. */
  kind: 'session-token'
  token: string
}

export type GatewayError = 'no_credential' | 'socket_failed' | 'rpc_error'

export interface RpcFrame {
  jsonrpc: '2.0'
  id: number
  method: string
  params: Record<string, unknown>
}

/** URL do socket: credencial no query, como o servidor espera. */
export function gatewayWsUrl(origin: string, credential: GatewayCredential): string {
  const base = origin.replace(/^http/, 'ws').replace(/\/+$/, '')

  return `${base}${GATEWAY_WS_PATH}?token=${encodeURIComponent(credential.token)}`
}

/**
 * Subprotocolos a pedir — nenhum, de propósito.
 *
 * O servidor não devolve `hermes-gateway-v1` neste ramo; pedir faz o cliente abortar com
 * "Server sent no subprotocol" (visto ao vivo). Vazio = handshake sem exigência.
 */
export function gatewayProtocols(_credential: GatewayCredential): string[] {
  return []
}

/** Cabeçalho que o upgrade exige; sem `Origin` a resposta é 403. */
export function gatewayHeaders(origin: string): Record<string, string> {
  return { Origin: origin.replace(/\/+$/, '') }
}

export function buildRpc(id: number, method: string, params: Record<string, unknown>): RpcFrame {
  return { jsonrpc: '2.0', id, method, params }
}

/** `prompt.submit` com validação local: falhar aqui é melhor que o servidor recusar depois. */
export function buildPromptSubmit(id: number, sessionId: string, text: string): RpcFrame | { error: GatewayError } {
  if (!sessionId.trim() || !text.trim()) {
    return { error: 'rpc_error' }
  }

  return buildRpc(id, 'prompt.submit', { session_id: sessionId, text })
}

/** `session.resume` precisa do id canônico, não do id curto de `session.create`. */
export function buildSessionResume(id: number, canonicalSessionId: string): RpcFrame | { error: GatewayError } {
  if (!canonicalSessionId.trim()) {
    return { error: 'rpc_error' }
  }

  return buildRpc(id, 'session.resume', { session_id: canonicalSessionId })
}

/** Id curto de `session.create` não serve para resume; o canônico é `stored_session_id`. */
export function canonicalSessionId(createResult: { session_id?: unknown; stored_session_id?: unknown }): string {
  const stored = createResult.stored_session_id
  const short = createResult.session_id

  if (typeof stored === 'string' && stored.trim()) {
    return stored.trim()
  }

  return typeof short === 'string' ? short.trim() : ''
}

export interface RpcTransport {
  send(frame: string): void
}

export interface SendPromptOptions {
  /** Id canônico da conversa (ver `canonicalSessionId`). */
  canonicalSessionId: string
  text: string
}

/**
 * Envia um prompt: `session.resume` e depois `prompt.submit`.
 *
 * O socket é injetado para o teste poder observar exatamente os frames — o que garante a ordem e a
 * ausência de chaves que o servidor recusa.
 */
export function sendPromptOverGateway(
  transport: RpcTransport,
  options: SendPromptOptions
): { ok: true; frames: RpcFrame[] } | { ok: false; error: GatewayError } {
  const resume = buildSessionResume(1, options.canonicalSessionId)
  const submit = buildPromptSubmit(2, options.canonicalSessionId, options.text)

  if ('error' in resume) {
    return { ok: false, error: resume.error }
  }

  if ('error' in submit) {
    return { ok: false, error: submit.error }
  }

  try {
    transport.send(JSON.stringify(resume))
    transport.send(JSON.stringify(submit))
  } catch {
    return { ok: false, error: 'socket_failed' }
  }

  return { ok: true, frames: [resume, submit] }
}

/** Interpreta a resposta de `prompt.submit`; `streaming` é o aceite. */
export function promptAccepted(result: unknown): boolean {
  if (!result || typeof result !== 'object') {
    return false
  }

  const status = (result as { status?: unknown }).status

  return typeof status === 'string' && status.length > 0
}

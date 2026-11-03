/**
 * JSON-RPC do gateway pelo WebSocket — o caminho real de **enviar** uma mensagem.
 *
 * Descoberto lendo o código do servidor, não por tentativa e erro:
 *
 * - `gateway/session_controls.py` registra os métodos `session.resume` e `prompt.submit`;
 * - `prompt.submit` exige `submission_id` não vazio e só aceita uma lista fechada de chaves;
 * - o socket precisa estar **subscrito** à sessão antes (daí o `session.resume`);
 * - o upgrade do WS aceita **ticket** (`hermes-gateway-ticket.<t>` ou `?ticket=`) ou a credencial
 *   interna do processo (`?internal=`). `?token=` **não** é aceito — foi o que causou o close 1006
 *   na sonda anterior.
 *
 * Esta classe não escolhe de onde vem a credencial: recebe uma `GatewayCredential` pronta. Sem
 * credencial válida ela não tenta abrir socket — devolve erro explícito em vez de falhar em silêncio.
 */

export const GATEWAY_PROTOCOL = 'hermes-gateway-v1'
export const TICKET_PROTOCOL_PREFIX = 'hermes-gateway-ticket.'
export const GATEWAY_WS_PATH = '/api/ws'

/** Chaves que `prompt.submit` aceita; qualquer outra faz o servidor recusar com `invalid_params`. */
export const PROMPT_SUBMIT_KEYS = [
  'session_id',
  'text',
  'submission_id',
  'input_id',
  'queued',
  'attachments',
  'finite',
  'unattended',
  'surface',
  'voice_context',
  'interrupted',
  'voice_turn',
  'display_kind',
  'title_preview',
  'turn_author',
  'api_text',
  'model_override',
  'clarify_batch'
] as const

export type GatewayCredential =
  | { kind: 'ticket'; ticket: string }
  | { kind: 'internal'; value: string }

export type GatewayError =
  | 'no_credential'
  | 'socket_failed'
  | 'rpc_error'
  | 'timeout'

export interface RpcFrame {
  jsonrpc: '2.0'
  id: number
  method: string
  params: Record<string, unknown>
}

/** URL com a credencial no lugar que o servidor aceita. */
export function gatewayWsUrl(origin: string, credential: GatewayCredential): string {
  const base = origin.replace(/^http/, 'ws').replace(/\/+$/, '')
  const query =
    credential.kind === 'ticket'
      ? `ticket=${encodeURIComponent(credential.ticket)}`
      : `internal=${encodeURIComponent(credential.value)}`

  return `${base}${GATEWAY_WS_PATH}?${query}`
}

/** Subprotocolos do upgrade; o ticket vai no subprotocolo quando existe. */
export function gatewayProtocols(credential: GatewayCredential): string[] {
  if (credential.kind === 'ticket') {
    return [GATEWAY_PROTOCOL, `${TICKET_PROTOCOL_PREFIX}${credential.ticket}`]
  }

  return [GATEWAY_PROTOCOL]
}

export function buildRpc(id: number, method: string, params: Record<string, unknown>): RpcFrame {
  return { jsonrpc: '2.0', id, method, params }
}

/** `prompt.submit` com validação local: falhar aqui é melhor que o servidor recusar depois. */
export function buildPromptSubmit(
  id: number,
  sessionId: string,
  text: string,
  submissionId: string
): RpcFrame | { error: GatewayError } {
  if (!sessionId.trim() || !text.trim() || !submissionId.trim()) {
    return { error: 'rpc_error' }
  }

  return buildRpc(id, 'prompt.submit', {
    session_id: sessionId,
    text,
    submission_id: submissionId
  })
}

/** Identificador de submissão estável e único por envio (sem depender de crypto do RN). */
export function newSubmissionId(seed: number, random: number): string {
  return `sub-${seed.toString(36)}-${Math.floor(random * 1e9).toString(36)}`
}

export interface RpcTransport {
  send(frame: string): void
  close(): void
}

export interface SendPromptOptions {
  sessionId: string
  text: string
  submissionId: string
  /** Espera o `session.resume` antes de enviar (o servidor exige socket subscrito). */
  resumeParams?: Record<string, unknown>
}

/**
 * Envia um prompt pelo gateway: `session.resume` → `prompt.submit`.
 *
 * Devolve erro tipado; nunca engole falha. O socket é injetado para o teste poder observar os frames.
 */
export function sendPromptOverGateway(
  transport: RpcTransport,
  options: SendPromptOptions
): { ok: true; frames: RpcFrame[] } | { ok: false; error: GatewayError } {
  const resume = buildRpc(1, 'session.resume', {
    session_id: options.sessionId,
    ...(options.resumeParams ?? {})
  })

  const submit = buildPromptSubmit(2, options.sessionId, options.text, options.submissionId)

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

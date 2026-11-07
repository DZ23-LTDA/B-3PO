/**
 * Socket de conversa: abre o WS do gateway com o contrato provado contra o servidor real e envia
 * prompts.
 *
 * Contrato (ver `gateway-rpc.ts` para a evidência de cada ponto):
 * - URL `ws://host/api/ws?token=<session token>`
 * - header `Origin` obrigatório (sem ele o upgrade é 403)
 * - **nenhum** subprotocolo (pedir `hermes-gateway-v1` falha com "Server sent no subprotocol")
 * - `session.resume` com id canônico; `session.create` se ainda não houver conversa
 * - `prompt.submit` só com `session_id` + `text`
 *
 * O WebSocket é injetado para o teste poder simular o servidor sem rede.
 */

import {
  canonicalSessionId,
  gatewayHeaders,
  gatewayProtocols,
  gatewayWsUrl,
  promptAccepted
} from './gateway-rpc'

export interface SocketLike {
  send(data: string): void
  close(): void
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onerror: ((event: unknown) => void) | null
  onclose: ((event: unknown) => void) | null
}

import {
  approvalResponseFrame,
  firstPendingApproval,
  parseApprovalFrame,
  type ApprovalRequest
} from './approval'

export type SocketFactory = (url: string, options: { headers: Record<string, string> }) => SocketLike

export type ChatSocketState = 'idle' | 'connecting' | 'ready' | 'error' | 'closed'

export interface ChatSocketCallbacks {
  onState?: (state: ChatSocketState) => void
  /** Chamado quando o servidor aceita o prompt (`status` presente). */
  onAccepted?: (text: string) => void
  /** Erro de RPC com código e mensagem do servidor, para a tela poder explicar. */
  onError?: (code: number | null, message: string) => void
  /** Pedido de aprovação do computador (ou `null` quando ele foi resolvido/retirado). */
  onApproval?: (request: ApprovalRequest | null) => void
}

interface Pending {
  id: number
  method: string
  resolve: (result: Record<string, unknown>) => void
  reject: (error: { code: number | null; message: string }) => void
}

/**
 * Cliente de conversa. Uma instância por bot/conversa; `connect()` é idempotente enquanto conecta.
 */
export class GatewayChatSocket {
  private socket: SocketLike | null = null
  private nextId = 1
  private pending = new Map<number, Pending>()
  private state: ChatSocketState = 'idle'
  /** Id canônico: o que `session.resume` reconhece (ex.: 20261103_140104_f5df78). */
  private canonicalId: string | null = null
  /** Id do socket para `prompt.submit`: o curto devolvido por `session.create` (ex.: d26bcd90). */
  private promptId: string | null = null
  /** Aprovação aguardando decisão humana; uma por vez, como o backend enfileira. */
  private approval: ApprovalRequest | null = null

  constructor(
    private readonly origin: string,
    private readonly token: string,
    private readonly createSocket: SocketFactory,
    private readonly callbacks: ChatSocketCallbacks = {}
  ) {}

  getState(): ChatSocketState {
    return this.state
  }

  /** Id canônico da conversa em uso (o que `session.list`/`resume` reconhecem). */
  getSessionId(): string | null {
    return this.canonicalId
  }

  /** Id que `prompt.submit` aceita nesta versão (o curto de `session.create`). */
  getPromptId(): string | null {
    return this.promptId
  }

  /** Pedido de aprovação em aberto, se houver. */
  getPendingApproval(): ApprovalRequest | null {
    return this.approval
  }

  /**
   * Responde o pedido de aprovação no `id` do frame. Devolve `false` quando não há pedido aberto —
   * a tela usa isso para não fingir que decidiu algo que já foi retirado.
   */
  respondApproval(choice: string): boolean {
    const open = this.approval

    if (!open) {
      return false
    }

    this.approval = null
    this.socket?.send(JSON.stringify(approvalResponseFrame(open.wireId, choice)))
    this.callbacks.onApproval?.(null)

    return true
  }

  private setState(state: ChatSocketState): void {
    this.state = state
    this.callbacks.onState?.(state)
  }

  connect(): Promise<void> {
    if (this.state === 'ready' && this.socket) {
      return Promise.resolve()
    }

    this.setState('connecting')

    return new Promise((resolve, reject) => {
      let settled = false

      try {
        this.socket = this.createSocket(gatewayWsUrl(this.origin, { kind: 'session-token', token: this.token }), {
          headers: gatewayHeaders(this.origin)
        })
      } catch (error) {
        this.setState('error')
        reject(error)

        return
      }

      this.socket.onopen = () => {
        this.setState('ready')
        settled = true
        resolve()
        // Sem isto o gateway falha rápido todo pedido de aprovação e o turno fica sem decisão.
        void this.request('client.capabilities', { server_requests: true }).catch(() => undefined)
      }

      this.socket.onmessage = event => {
        this.handleFrame(event?.data)
      }

      this.socket.onerror = () => {
        if (!settled) {
          settled = true
          this.setState('error')
          reject(new Error('socket_failed'))
        }
      }

      this.socket.onclose = () => {
        this.setState('closed')
        this.failAll({ code: null, message: 'socket fechado' })
      }
    })
  }

  private handleFrame(raw: unknown): void {
    let frame: Record<string, unknown> | null = null

    try {
      frame = JSON.parse(typeof raw === 'string' ? raw : String(raw)) as Record<string, unknown>
    } catch {
      return
    }

    const approval = parseApprovalFrame(frame)

    if (approval) {
      this.approval = approval
      this.callbacks.onApproval?.(approval)

      return
    }

    const id = typeof frame['id'] === 'number' ? frame['id'] : null

    if (id === null) {
      return
    }

    const call = this.pending.get(id)

    if (!call) {
      return
    }

    this.pending.delete(id)

    const error = frame['error'] as { code?: unknown; message?: unknown } | undefined

    if (error) {
      call.reject({
        code: typeof error.code === 'number' ? error.code : null,
        message: typeof error.message === 'string' ? error.message : 'erro do gateway'
      })

      return
    }

    call.resolve((frame['result'] as Record<string, unknown>) ?? {})
  }

  private failAll(error: { code: number | null; message: string }): void {
    for (const call of this.pending.values()) {
      call.reject(error)
    }

    this.pending.clear()
  }

  private request(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.socket || this.state !== 'ready') {
      return Promise.reject({ code: null, message: 'sem conexão com o computador' })
    }

    const id = this.nextId++

    return new Promise((resolve, reject) => {
      this.pending.set(id, { id, method, resolve, reject })

      try {
        this.socket?.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
      } catch {
        this.pending.delete(id)
        reject({ code: null, message: 'falha ao enviar' })
      }
    })
  }

  /**
   * Garante uma conversa: retoma a que existe ou cria uma nova.
   * Devolve o id **canônico** — o curto de `session.create` não serve para `resume`.
   */
  async ensureSession(existingSessionId?: string | null): Promise<string> {
    if (this.canonicalId) {
      return this.canonicalId
    }

    if (existingSessionId) {
      try {
        const resumed = await this.request('session.resume', { session_id: existingSessionId })
        this.canonicalId = existingSessionId
        // O snapshot traz o que ficou aberto: sem isso, reconectar durante uma aprovacao
        // esconde a decisao do usuario e o turno espera ate o tempo limite.
        const pending = firstPendingApproval(resumed['open_requests'])

        if (pending) {
          this.approval = pending
          this.callbacks.onApproval?.(pending)
        }

        // retomada não devolve id curto: o próprio id retomado serve para o submit
        this.promptId = existingSessionId

        return existingSessionId
      } catch {
        // conversa antiga não existe mais no perfil do socket: cai para criar
      }
    }

    const created = await this.request('session.create', { title: 'Do celular' })
    const canonical = canonicalSessionId(created)
    const shortId = typeof created['session_id'] === 'string' ? created['session_id'] : canonical

    if (!canonical) {
      throw { code: null, message: 'servidor não devolveu id de sessão' }
    }

    this.canonicalId = canonical
    this.promptId = shortId || canonical

    return canonical
  }

  /** Envia o texto: resume (se preciso) e depois `prompt.submit`. */
  async sendPrompt(text: string, existingSessionId?: string | null): Promise<{ accepted: boolean }> {
    const trimmed = text.trim()

    if (!trimmed) {
      return { accepted: false }
    }

    await this.ensureSession(existingSessionId)

    // `session.resume` quer o canônico; `prompt.submit` desta versão quer o id do socket.
    const submitId = this.promptId ?? this.canonicalId

    if (!submitId) {
      throw { code: null, message: 'sem id de conversa' }
    }

    const result = await this.request('prompt.submit', { session_id: submitId, text: trimmed })
    const accepted = promptAccepted(result)

    if (accepted) {
      this.callbacks.onAccepted?.(trimmed)
    } else {
      this.callbacks.onError?.(null, 'o gateway não confirmou o envio')
    }

    return { accepted }
  }

  close(): void {
    try {
      this.socket?.close()
    } catch {
      // fechar um socket já morto não é erro de produto
    }

    this.socket = null
    this.setState('closed')
  }
}

/** Opções de WebSocket para React Native / browser: sem subprotocolo, com header. */
export function socketOptions(origin: string): { headers: Record<string, string> } {
  return { headers: gatewayHeaders(origin) }
}

/** Reexportado para a tela não precisar saber do detalhe. */
export { gatewayProtocols }

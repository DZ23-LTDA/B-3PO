/**
 * Cliente de API do mobile: JSON-RPC sobre WebSocket para o gateway B-3PO/Hermes.
 *
 * Regras que valem aqui:
 * - o mobile é CLIENTE: este módulo fala com o gateway, nunca inicia um runtime;
 * - token nunca vai em log nem em URL — viaja no handshake, como subprotocolo/header do transporte;
 * - reconexão não duplica execução: cada pedido leva `request_id`, resposta repetida é ignorada;
 * - erro do gateway vira rejeição com código, nunca sucesso silencioso.
 */

export interface RpcRequest {
  id: string
  method: string
  params?: Record<string, unknown>
}

export interface RpcResponse {
  id: string
  result?: unknown
  error?: { code: number | string; message: string }
}

/** Transporte mínimo — injetado para permitir teste em Node sem WebSocket real. */
export interface Transport {
  send: (payload: string) => void
  close: () => void
  onMessage: (handler: (raw: string) => void) => void
  onClose: (handler: () => void) => void
}

export interface GatewayOptions {
  /** URL do gateway (ws:// ou wss://). Nunca inclui token em query string. */
  url: string
  /** Token de sessão; enviado no handshake pelo transporte, não em cada frame. */
  token?: string
  /** Cria o transporte; em produção é o WebSocket do React Native. */
  connect: (url: string, token?: string) => Transport
  /** Gerador de id de pedido (injetável para teste determinístico). */
  newId?: () => string
  now?: () => number
}

export class GatewayError extends Error {
  readonly code: number | string

  constructor(code: number | string, message: string) {
    super(message)
    this.name = 'GatewayError'
    this.code = code
  }
}

type Pending = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  sentAt: number
}

/**
 * Conexão JSON-RPC com o gateway. Responsabilidades: correlacionar pedido/resposta,
 * rejeitar pendentes quando a conexão cai, e nunca reaproveitar id.
 */
export class GatewayClient {
  private transport: Transport | null = null
  private readonly pending = new Map<string, Pending>()
  private readonly seenResponses = new Set<string>()
  private readonly newId: () => string
  private readonly now: () => number
  private closed = false

  constructor(private readonly options: GatewayOptions) {
    this.newId = options.newId ?? (() => `req-${Math.random().toString(36).slice(2)}-${Date.now()}`)
    this.now = options.now ?? (() => Date.now())
  }

  connect(): void {
    if (this.transport) {
      return
    }

    this.closed = false
    const transport = this.options.connect(this.options.url, this.options.token)
    this.transport = transport
    transport.onMessage(raw => this.handleMessage(raw))
    transport.onClose(() => this.handleClose())
  }

  /** Fecha a conexão e rejeita o que estava pendente (o chamador vê erro, não travamento). */
  close(reason = 'client closed'): void {
    this.closed = true
    this.rejectAll(new GatewayError('closed', reason))
    this.transport?.close()
    this.transport = null
  }

  call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    if (!this.transport || this.closed) {
      return Promise.reject(new GatewayError('not_connected', 'conexão com o gateway não está aberta'))
    }

    const id = this.newId()
    const request: RpcRequest = { id, method, params }

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { reject, resolve: resolve as (value: unknown) => void, sentAt: this.now() })
      try {
        this.transport?.send(JSON.stringify(request))
      } catch (error) {
        this.pending.delete(id)
        reject(new GatewayError('send_failed', error instanceof Error ? error.message : 'falha ao enviar'))
      }
    })
  }

  /** Pedidos ainda sem resposta — usado pela UI para mostrar "aguardando" em vez de spinner infinito. */
  pendingCount(): number {
    return this.pending.size
  }

  private handleMessage(raw: string): void {
    let parsed: unknown

    try {
      parsed = JSON.parse(raw)
    } catch {
      return // frame inválido não derruba a conexão
    }

    const response = parsed as RpcResponse

    if (!response || typeof response.id !== 'string') {
      return // notificação/evento: tratado pelo canal de eventos, não aqui
    }

    if (this.seenResponses.has(response.id)) {
      return // resposta repetida (reconexão): ignora, não resolve duas vezes
    }

    this.seenResponses.add(response.id)
    const pending = this.pending.get(response.id)

    if (!pending) {
      return // resposta de pedido que já expirou
    }

    this.pending.delete(response.id)

    if (response.error) {
      pending.reject(new GatewayError(response.error.code, response.error.message))
      return
    }

    pending.resolve(response.result)
  }

  private handleClose(): void {
    this.transport = null
    this.rejectAll(new GatewayError('connection_lost', 'conexão com o gateway caiu'))
  }

  private rejectAll(error: Error): void {
    for (const [, pending] of this.pending) {
      pending.reject(error)
    }

    this.pending.clear()
  }
}

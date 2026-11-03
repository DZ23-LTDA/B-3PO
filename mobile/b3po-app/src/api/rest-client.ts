/**
 * Cliente REST do B-3PO/Hermes para o mobile.
 *
 * O Desktop não fala JSON-RPC com o runtime: fala **REST** (`/api/*`) e usa WebSocket só em
 * `/api/ws`. Descoberto lendo `apps/desktop/electron` (chamadas `/api/health`, `/api/status`,
 * `/api/agents`, `/api/sessions/…`) e confirmado contra o servidor rodando:
 *
 *   GET /api/health -> 200 {"ok":true,…,"auth_required":false}
 *   GET /api/status -> 200 {"gateway_running":true,…}
 *   GET /api/agents -> 401 sem token
 *
 * Autenticação dos endpoints protegidos: header `X-Hermes-Session-Token` (ou `Authorization: Bearer`
 * no modo token). O token NUNCA vai em query string — vira log de proxy e histórico.
 */

export interface RestOptions {
  /** Origem do servidor, ex.: `http://127.0.0.1:54686`. */
  origin: string
  /** Token de sessão/ticket, quando o servidor exigir. */
  token?: string
  /** `fetch` injetável para teste. */
  fetchImpl?: typeof fetch
  /** Tempo máximo por pedido, em ms. */
  timeoutMs?: number
}

export interface HealthInfo {
  ok: boolean
  commit: string | null
  authRequired: boolean
}

/** Um bot = um perfil do runtime. Vem de `/api/profiles` (contrato real do backend local). */
export interface BotProfile {
  name: string
  title: string
  description: string
  model: string | null
  provider: string | null
  gatewayRunning: boolean
  isDefault: boolean
}

export interface StatusInfo {
  gatewayRunning: boolean
  gatewayState: string | null
  configVersion: number | null
}

export type RestFailure = 'unauthorized' | 'unreachable' | 'timeout' | 'bad-response'

export class RestError extends Error {
  readonly failure: RestFailure
  readonly status: number | null

  constructor(failure: RestFailure, message: string, status: number | null = null) {
    super(message)
    this.name = 'RestError'
    this.failure = failure
    this.status = status
  }
}

export const SESSION_HEADER = 'X-Hermes-Session-Token'
export const DEFAULT_TIMEOUT_MS = 8_000

function joinUrl(origin: string, path: string): string {
  return `${origin.trim().replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

export class RestClient {
  private readonly origin: string
  private readonly token: string | undefined
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number

  constructor(options: RestOptions) {
    this.origin = options.origin
    this.token = (options.token ?? '').trim() || undefined
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as typeof fetch)
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  /** GET tipado: devolve JSON ou lança `RestError` com o motivo legível. */
  async get<T>(path: string): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json' }

    if (this.token) {
      headers[SESSION_HEADER] = this.token
      headers.authorization = `Bearer ${this.token}`
    }

    let response: Response
    // `AbortSignal.timeout` não existe em todo runtime JavaScript (o Hermes/React Native pode não ter).
    // Um AbortController com timer próprio faz o mesmo e funciona em qualquer lugar — e sempre limpa o
    // timer, senão o app acumula timeout pendente a cada pedido.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    let timedOut = false
    const onAbort = () => {
      timedOut = true
    }

    controller.signal.addEventListener?.('abort', onAbort)

    try {
      // O tipo de AbortSignal do React Native diverge do `global.AbortSignal` do lib.dom; o cast fica
      // só nesta fronteira (o objeto é o mesmo em runtime).
      const init = { headers, signal: controller.signal } as unknown as RequestInit

      response = await this.fetchImpl(joinUrl(this.origin, path), init)
    } catch (error) {
      const isTimeout =
        timedOut || (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'))

      throw new RestError(
        isTimeout ? 'timeout' : 'unreachable',
        isTimeout
          ? 'o servidor não respondeu a tempo'
          : `não foi possível falar com o servidor (${error instanceof Error ? error.message : 'erro de rede'})`
      )
    } finally {
      clearTimeout(timer)
    }

    if (response.status === 401 || response.status === 403) {
      throw new RestError('unauthorized', 'o servidor recusou o acesso: token ausente ou inválido', response.status)
    }

    if (!response.ok) {
      throw new RestError('bad-response', `o servidor respondeu ${response.status}`, response.status)
    }

    try {
      return (await response.json()) as T
    } catch {
      throw new RestError('bad-response', 'a resposta não era JSON', response.status)
    }
  }

  /** `/api/health` — público; serve para descobrir se o servidor está de pé. */
  async health(): Promise<HealthInfo> {
    const raw = await this.get<Record<string, unknown>>('/api/health')

    return {
      ok: raw['ok'] === true,
      commit: typeof raw['commit'] === 'string' ? raw['commit'] : null,
      authRequired: raw['auth_required'] === true
    }
  }

  /**
   * `/api/profiles` — a lista de bots.
   *
   * Descoberto na prática: `/api/agents` é do portal cloud (dá 404 no backend local); o backend local
   * publica os perfis em `/api/profiles`, autenticado por `x-hermes-session-token`.
   */
  async profiles(): Promise<BotProfile[]> {
    const raw = await this.get<{ profiles?: unknown }>('/api/profiles')
    const list = Array.isArray(raw.profiles) ? raw.profiles : []

    return list.flatMap(item => {
      if (!item || typeof item !== 'object') {
        return []
      }

      const profile = item as Record<string, unknown>
      const name = typeof profile['name'] === 'string' ? profile['name'] : ''

      if (!name) {
        return []
      }

      const title = typeof profile['bot_title'] === 'string' && profile['bot_title'].trim()
        ? profile['bot_title'].trim()
        : typeof profile['display_name'] === 'string' && profile['display_name'].trim()
          ? profile['display_name'].trim()
          : name

      return [
        {
          name,
          title,
          description: typeof profile['description'] === 'string' ? profile['description'] : '',
          model: typeof profile['model'] === 'string' ? profile['model'] : null,
          provider: typeof profile['provider'] === 'string' ? profile['provider'] : null,
          gatewayRunning: profile['gateway_running'] === true,
          isDefault: profile['is_default'] === true
        }
      ]
    })
  }

  /**
   * Conversas de um bot. O backend local filtra por perfil: `/api/sessions?profile=<bot>`.
   * Sem `profile`, o servidor devolve apenas o perfil padrão — por isso o parâmetro é obrigatório aqui.
   */
  async sessions(profile: string): Promise<Array<Record<string, unknown>>> {
    const raw = await this.get<{ sessions?: unknown }>(`/api/sessions?profile=${encodeURIComponent(profile)}`)

    return Array.isArray(raw.sessions) ? (raw.sessions as Array<Record<string, unknown>>) : []
  }

  /** Mensagens de uma conversa: `/api/sessions/{id}/messages?limit=N&profile=<bot>`. */
  async messages(profile: string, sessionId: string, limit = 50): Promise<Array<Record<string, unknown>>> {
    const query = `limit=${limit}&profile=${encodeURIComponent(profile)}`
    const raw = await this.get<{ messages?: unknown }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/messages?${query}`
    )

    return Array.isArray(raw.messages) ? (raw.messages as Array<Record<string, unknown>>) : []
  }

  /** `/api/status` — estado do gateway. */
  async status(): Promise<StatusInfo> {
    const raw = await this.get<Record<string, unknown>>('/api/status')

    return {
      gatewayRunning: raw['gateway_running'] === true,
      gatewayState: typeof raw['gateway_state'] === 'string' ? raw['gateway_state'] : null,
      configVersion: typeof raw['config_version'] === 'number' ? raw['config_version'] : null
    }
  }
}

/** Mensagem para a tela, sem jargão. */
export function restFailureMessage(error: unknown): string {
  if (error instanceof RestError) {
    switch (error.failure) {
      case 'unauthorized':
        return 'O computador recusou o acesso. Pareie o aparelho novamente.'
      case 'timeout':
        return 'O computador demorou demais para responder. Verifique se o B-3PO está aberto.'
      case 'unreachable':
        return 'Não foi possível falar com o computador. Confira a rede e o endereço.'
      default:
        return 'O computador respondeu algo inesperado. Tente de novo em instantes.'
    }
  }

  return 'Não foi possível falar com o computador.'
}

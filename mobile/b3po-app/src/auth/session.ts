/**
 * Armazenamento de credencial do mobile.
 *
 * O token nunca fica em memória além do necessário, nunca vai para log e nunca é gravado em
 * AsyncStorage (texto claro). Em produção o cofre é Keychain (iOS) / Keystore (Android) via
 * react-native-keychain; aqui a interface é injetável para o teste rodar em Node.
 */

/** Cofre do sistema. Implementações reais: Keychain/Keystore. */
export interface SecureStorage {
  get: (key: string) => Promise<null | string>
  remove: (key: string) => Promise<void>
  set: (key: string, value: string) => Promise<void>
}

export interface SessionCredentials {
  /** Token de sessão usado no handshake do WebSocket. */
  token: string
  /** Identificador público do dispositivo (revogável no gateway). */
  deviceId: string
  /** URL do gateway que emitiu a sessão. */
  gatewayUrl: string
}

const SESSION_KEY = 'b3po.session'

/** Memória volátil para teste e para o caso de cofre indisponível. */
export function memoryStorage(): SecureStorage & { dump: () => Record<string, string> } {
  const data = new Map<string, string>()

  return {
    dump: () => Object.fromEntries(data),
    get: async key => data.get(key) ?? null,
    remove: async key => {
      data.delete(key)
    },
    set: async (key, value) => {
      data.set(key, value)
    }
  }
}

/**
 * Guarda/recupera a sessão. JSON com os três campos — nada além disso.
 * `save` valida antes de gravar; credencial incompleta é rejeitada em vez de virar sessão quebrada.
 */
export class SessionStore {
  constructor(private readonly storage: SecureStorage) {}

  async save(credentials: SessionCredentials): Promise<void> {
    if (!credentials.token || !credentials.deviceId || !credentials.gatewayUrl) {
      throw new Error('credencial incompleta: token, deviceId e gatewayUrl são obrigatórios')
    }

    if (!/^wss?:\/\//.test(credentials.gatewayUrl)) {
      throw new Error('gatewayUrl deve começar com ws:// ou wss://')
    }

    await this.storage.set(SESSION_KEY, JSON.stringify(credentials))
  }

  async load(): Promise<null | SessionCredentials> {
    const raw = await this.storage.get(SESSION_KEY)
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SessionCredentials>
      if (!parsed.token || !parsed.deviceId || !parsed.gatewayUrl) {
        return null // registro corrompido não vira sessão
      }

      return { deviceId: parsed.deviceId, gatewayUrl: parsed.gatewayUrl, token: parsed.token }
    } catch {
      return null
    }
  }

  /**
   * Logout local: apaga a credencial. Não é revogação — para revogar o dispositivo no gateway,
   * chame `revoke` com o cliente de API ANTES (ou depois) de limpar.
   */
  async logout(): Promise<void> {
    await this.storage.remove(SESSION_KEY)
  }
}

/** Resultado de um logout/revogação, para a UI dizer a verdade sobre o que aconteceu. */
export interface RevocationOutcome {
  localCleared: boolean
  /** `true` só quando o gateway confirmou; falha de rede deixa a revogação pendente. */
  remoteRevoked: boolean
}

/**
 * Revoga o dispositivo no gateway e limpa o cofre local.
 *
 * Ordem importa: tentamos revogar primeiro (com o token ainda válido); se a rede falhar, limpamos
 * o local mesmo assim e reportamos `remoteRevoked: false` — o usuário não fica preso logado, e a
 * UI pode oferecer "tentar revogar novamente".
 */
export async function revokeAndLogout(
  store: SessionStore,
  revoke: (credentials: SessionCredentials) => Promise<void>
): Promise<RevocationOutcome> {
  const credentials = await store.load()
  let remoteRevoked = false

  if (credentials) {
    try {
      await revoke(credentials)
      remoteRevoked = true
    } catch {
      remoteRevoked = false
    }
  }

  await store.logout()

  return { localCleared: (await store.load()) === null, remoteRevoked }
}

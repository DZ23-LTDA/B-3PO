/**
 * Pareamento de dispositivo (Android/iOS) com um gateway B-3PO.
 *
 * O pareamento chega como link profundo ou QR: `b3po://pair?url=…&token=…&device=…`. O cliente NÃO
 * inventa endereço nem credencial — ele valida o payload, guarda o token no cofre do sistema
 * (Keychain/Keystore, ver `src/auth/session.ts`) e usa o `url` como origem do gateway.
 *
 * Regras de segurança que este módulo garante (e que os testes provam):
 *
 * - só `ws://`/`wss://` e `http://`/`https://`; nada de `file:`, `javascript:` ou esquema exótico;
 * - `ws://`/`http://` (sem TLS) só é aceito para host local (`localhost`, `127.0.0.1`, `::1`) — parear
 *   com um servidor remoto sem TLS significaria token em texto claro na rede;
 * - token obrigatório e com tamanho mínimo; um link sem token pareceria funcionar e falharia no
 *   primeiro RPC com uma mensagem confusa;
 * - o dispositivo recebe um id estável: o payload pode trazê-lo, e o cliente gera um quando falta,
 *   para que revogação por dispositivo seja possível do lado do gateway (§16);
 * - convite expirado é recusado quando o link informa `expires_at`.
 *
 * ATENÇÃO (revisão independente): `device` é IDENTIFICADOR, não credencial. Quem pareia depois deve
 * provar posse de uma chave privada guardada no Keychain/Keystore; o `device_id` sozinho nunca pode
 * autorizar nada no gateway. Exigir essa prova é trabalho de backend, registrado em MOBILE-REPORT.
 */

export type PairingFailure =
  | 'not-a-pair-link'
  | 'missing-url'
  | 'unsupported-scheme'
  | 'insecure-remote-url'
  | 'missing-token'
  | 'token-too-short'
  | 'invite-expired'
  | 'malformed-url'

export interface PairingRequest {
  /** Origem do gateway, já normalizada (sem barra final). */
  gatewayUrl: string
  /** Token de pareamento — vai para o cofre seguro, nunca para o log. */
  token: string
  /** Identificador estável deste dispositivo perante o gateway. */
  deviceId: string
  /** Rótulo legível do dispositivo, quando o link trouxer um. */
  deviceLabel: string | null
}

export type PairingResult =
  | { ok: true; request: PairingRequest }
  | { ok: false; reason: PairingFailure }

export const PAIR_SCHEME = 'b3po'
export const PAIR_HOST = 'pair'
export const MIN_TOKEN_LENGTH = 16

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

function isLocalHost(host: string): boolean {
  return LOCAL_HOSTS.has(host.toLowerCase())
}

/** Esquema de transporte aceito para o gateway: WebSocket ou HTTP(S). */
function normalizeTransport(raw: string): { url: string; scheme: string; host: string } | null {
  let parsed: URL

  try {
    parsed = new URL(raw)
  } catch {
    return null
  }

  const scheme = parsed.protocol.replace(/:$/, '').toLowerCase()
  const allowed = scheme === 'ws' || scheme === 'wss' || scheme === 'http' || scheme === 'https'

  if (!allowed || !parsed.hostname) {
    return null
  }

  const url = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`

  return { url, scheme, host: parsed.hostname }
}

/** Gera um id de dispositivo estável quando o link não traz um (o cofre guarda o primeiro). */
export function newDeviceId(random: () => string = () => Math.random().toString(36).slice(2)): string {
  return `dev-${random()}${random()}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
}

/**
 * Traduz um link de pareamento em pedido de conexão. `existingDeviceId` mantém o id já guardado
 * neste aparelho: reparear o mesmo celular não deve criar um dispositivo novo no gateway.
 */
export function parsePairingLink(link: string, existingDeviceId?: string | null): PairingResult {
  let url: URL

  try {
    url = new URL(link)
  } catch {
    return { ok: false, reason: 'malformed-url' }
  }

  if (url.protocol.replace(/:$/, '').toLowerCase() !== PAIR_SCHEME || url.host.toLowerCase() !== PAIR_HOST) {
    return { ok: false, reason: 'not-a-pair-link' }
  }

  const rawGateway = (url.searchParams.get('url') ?? '').trim()

  if (!rawGateway) {
    return { ok: false, reason: 'missing-url' }
  }

  const transport = normalizeTransport(rawGateway)

  if (!transport) {
    return { ok: false, reason: 'unsupported-scheme' }
  }

  const plaintext = transport.scheme === 'ws' || transport.scheme === 'http'

  if (plaintext && !isLocalHost(transport.host)) {
    return { ok: false, reason: 'insecure-remote-url' }
  }

  const token = (url.searchParams.get('token') ?? '').trim()

  if (!token) {
    return { ok: false, reason: 'missing-token' }
  }

  if (token.length < MIN_TOKEN_LENGTH) {
    return { ok: false, reason: 'token-too-short' }
  }

  // Convite com prazo: um QR fotografado ontem não pode parear hoje (revisão independente).
  const expiresAt = Number(url.searchParams.get('expires_at') ?? '')
  const now = Date.now()

  if (Number.isFinite(expiresAt) && expiresAt > 0) {
    const expiresAtMs = expiresAt > 1e12 ? expiresAt : expiresAt * 1000

    if (now > expiresAtMs) {
      return { ok: false, reason: 'invite-expired' }
    }
  }

  const deviceId = (existingDeviceId ?? '').trim() || (url.searchParams.get('device') ?? '').trim() || newDeviceId()
  const label = (url.searchParams.get('name') ?? '').trim()

  return {
    ok: true,
    request: {
      gatewayUrl: transport.url,
      token,
      deviceId,
      deviceLabel: label || null
    }
  }
}

/** Mensagem para a tela de pareamento. Nunca inclui o token. */
export function pairingFailureMessage(reason: PairingFailure): string {
  switch (reason) {
    case 'not-a-pair-link':
      return 'Este QR não é um convite do B-3PO. Peça um novo link ao computador.'
    case 'missing-url':
      return 'O convite não traz o endereço do computador.'
    case 'unsupported-scheme':
      return 'O endereço do computador usa um tipo de conexão que este aplicativo não aceita.'
    case 'insecure-remote-url':
      return 'Conexão sem criptografia para um computador na rede. Use o endereço https/wss.'
    case 'missing-token':
      return 'O convite não traz a chave de pareamento.'
    case 'token-too-short':
      return 'A chave de pareamento do convite está incompleta. Gere o QR novamente.'
    case 'invite-expired':
      return 'Este convite expirou. Gere um novo QR no computador.'
    default:
      return 'Não foi possível ler o convite. Gere o QR novamente no computador.'
  }
}

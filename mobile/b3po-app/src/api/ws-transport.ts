/**
 * Transporte WebSocket real do cliente mobile.
 *
 * `GatewayClient` recebe o transporte por injeção (para o teste de contrato rodar sem socket); este
 * arquivo é a implementação de produção: usa o `WebSocket` global — que existe tanto no React Native
 * quanto no Node 22+ — e passa o token de pareamento **no handshake**, como subprotocolo, nunca na
 * query string (query string vai para log de proxy, histórico e crash report).
 *
 * Protocolo de subprotocolo: `["b3po.v1", "token.<token>"]`. O servidor escolhe `b3po.v1` como
 * protocolo da sessão e lê o token do segundo item. O token no subprotocolo é aceito pelo
 * `Sec-WebSocket-Protocol` do RFC 6455 e não aparece em URL.
 */

import type { Transport } from './gateway'

export const GATEWAY_PROTOCOL = 'b3po.v1'
export const TOKEN_PROTOCOL_PREFIX = 'token.'

/** Lista de subprotocolos para o handshake, com o token quando houver. */
export function protocolList(token?: string): string[] {
  const trimmed = (token ?? '').trim()

  return trimmed ? [GATEWAY_PROTOCOL, `${TOKEN_PROTOCOL_PREFIX}${trimmed}`] : [GATEWAY_PROTOCOL]
}

/** O que o transporte precisa do `WebSocket`; tipado aqui para não depender de lib.dom no RN. */
interface MinimalSocket {
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
  send: (data: string) => void
  close: () => void
  readyState: number
}

export interface OpenSocket {
  (url: string, protocols: string[]): MinimalSocket
}

/**
 * Cria o transporte sobre um `WebSocket`. `openSocket` é injetável: no app é o global; no teste é a
 * mesma função com o servidor local, para provar o contrato sobre socket de verdade.
 */
export function createWebSocketTransport(
  url: string,
  token: string | undefined,
  openSocket: OpenSocket = (target, protocols) =>
    new (globalThis as unknown as { WebSocket: new (u: string, p: string[]) => MinimalSocket }).WebSocket(
      target,
      protocols
    )
): Transport {
  const socket = openSocket(url, protocolList(token))
  let onMessage: ((raw: string) => void) | null = null
  let onClose: (() => void) | null = null
  const queued: string[] = []
  let opened = false

  socket.onopen = () => {
    opened = true

    for (const frame of queued.splice(0)) {
      socket.send(frame)
    }
  }

  socket.onmessage = event => {
    if (typeof event.data === 'string') {
      onMessage?.(event.data)
    }
  }

  socket.onclose = () => onClose?.()
  socket.onerror = () => {
    // erro de socket sempre precede (ou substitui) o close; o close é quem avisa o cliente
  }

  return {
    send: payload => {
      // Enviar antes do open perde o frame, então enfileira: o chamador não precisa saber do estado.
      if (opened) {
        socket.send(payload)
      } else {
        queued.push(payload)
      }
    },
    close: () => socket.close(),
    onMessage: handler => {
      onMessage = handler
    },
    onClose: handler => {
      onClose = handler
    }
  }
}

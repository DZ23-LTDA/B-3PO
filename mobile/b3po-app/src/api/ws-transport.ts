/**
 * Transporte WebSocket real do cliente mobile.
 *
 * `GatewayClient` recebe o transporte por injeção (para o teste de contrato rodar sem socket); este
 * arquivo é a implementação de produção: usa o `WebSocket` global — que existe tanto no React Native
 * quanto no Node 22+ — e passa o ticket **no handshake**, como subprotocolo, nunca na query string
 * (query string vaza em log de proxy, histórico e relatório de crash).
 *
 * O contrato NÃO é inventado: são os nomes que o servidor do B-3PO/Hermes aceita de fato, lidos em
 * `hermes_cli/web_server_boundary.py`:
 *
 *   _GATEWAY_WS_PROTOCOL              = "hermes-gateway-v1"
 *   _GATEWAY_WS_TICKET_PROTOCOL_PREFIX = "hermes-gateway-ticket."
 *
 * Antes desta rodada o cliente mandava `b3po.v1` / `token.…`, que o servidor não reconhece — o
 * handshake seria recusado. Nome próprio de protocolo só quando o servidor também o aceita.
 */

import type { Transport } from './gateway'

/** Protocolo de sessão aceito pelo servidor (`_GATEWAY_WS_PROTOCOL`). */
export const GATEWAY_PROTOCOL = 'hermes-gateway-v1'
/** Prefixo do subprotocolo que carrega o ticket (`_GATEWAY_WS_TICKET_PROTOCOL_PREFIX`). */
export const TICKET_PROTOCOL_PREFIX = 'hermes-gateway-ticket.'

/** Caminho do WebSocket usado pelo Desktop/dashboard. */
export const GATEWAY_WS_PATH = '/api/ws'

/** Lista de subprotocolos para o handshake, com o ticket quando houver. */
export function protocolList(ticket?: string): string[] {
  const trimmed = (ticket ?? '').trim()

  return trimmed ? [GATEWAY_PROTOCOL, `${TICKET_PROTOCOL_PREFIX}${trimmed}`] : [GATEWAY_PROTOCOL]
}

/** Junta origem + caminho do WS, sem duplicar barra. */
export function gatewayWsUrl(origin: string, path: string = GATEWAY_WS_PATH): string {
  const base = origin.trim().replace(/\/+$/, '')
  const ws = base.replace(/^http(s?):\/\//i, (_all, secure: string) => (secure ? 'wss://' : 'ws://'))

  return `${ws}${path.startsWith('/') ? path : `/${path}`}`
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
  ticket: string | undefined,
  openSocket: OpenSocket = (target, protocols) =>
    new (globalThis as unknown as { WebSocket: new (u: string, p: string[]) => MinimalSocket }).WebSocket(
      target,
      protocols
    )
): Transport {
  const socket = openSocket(url, protocolList(ticket))
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

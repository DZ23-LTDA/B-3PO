/**
 * Teste de contrato sobre socket REAL.
 *
 * Os testes de `gateway.test.ts` usam transporte em memória (rápido, determinístico). Aqui a prova é
 * outra: sobe um servidor WebSocket de verdade, fisicamente em 127.0.0.1, e o cliente do app fala com
 * ele pelo `WebSocket` global — o mesmo objeto que o React Native usa. Se o handshake, o enquadramento
 * JSON-RPC ou o fechamento estiverem errados, este teste falha; um mock não pegaria isso.
 *
 * O servidor é mínimo de propósito: ele não é o gateway, é o **contrato** do gateway (id, method,
 * params → id, result | error).
 */

import { createServer } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { WebSocketServer } from 'ws'
import type { WebSocket } from 'ws'

import { GatewayClient, GatewayError } from './gateway'
import { createWebSocketTransport, GATEWAY_PROTOCOL, protocolList } from './ws-transport'

interface RpcFrame {
  id?: string
  method?: string
  params?: Record<string, unknown>
}

let server: WebSocketServer
let port = 0
const handshakes: { protocols: string[] }[] = []

beforeAll(async () => {
  server = new WebSocketServer({ host: '127.0.0.1', port: 0 })

  server.on('connection', (socket: WebSocket, request) => {
    const header = request.headers['sec-websocket-protocol']
    handshakes.push({ protocols: typeof header === 'string' ? header.split(',').map(p => p.trim()) : [] })

    socket.on('message', raw => {
      const frame = JSON.parse(String(raw)) as RpcFrame

      if (!frame.id) {
        return
      }

      if (frame.method === 'status') {
        socket.send(JSON.stringify({ id: frame.id, result: { ok: true, profile: frame.params?.['profile'] } }))

        return
      }

      if (frame.method === 'hang') {
        return // nunca responde: simula operação longa em execução no gateway
      }

      if (frame.method === 'echo') {
        socket.send(JSON.stringify({ id: frame.id, result: frame.params }))

        return
      }

      socket.send(JSON.stringify({ id: frame.id, error: { code: -32601, message: `método desconhecido: ${frame.method}` } }))
    })
  })

  await new Promise<void>(resolve => server.once('listening', () => resolve()))
  const address = server.address()

  port = typeof address === 'object' && address ? address.port : 0
})

afterAll(async () => {
  // terminate antes do close: um close educado esperaria sockets pendentes e travaria o hook
  for (const socket of server.clients) {
    socket.terminate()
  }

  await new Promise<void>(resolve => server.close(() => resolve()))
})

function connectClient(token?: string): GatewayClient {
  const client = new GatewayClient({
    url: `ws://127.0.0.1:${port}`,
    token,
    connect: (url, currentToken) => createWebSocketTransport(url, currentToken)
  })

  client.connect()

  return client
}

describe('cliente sobre WebSocket real', () => {
  it('faz o pedido e recebe o resultado pelo socket', async () => {
    const client = connectClient()

    await expect(client.call('status', { profile: 'revisor-codigo' })).resolves.toEqual({
      ok: true,
      profile: 'revisor-codigo'
    })

    client.close()
  })

  it('leva o token no handshake (subprotocolo), nunca na URL', async () => {
    handshakes.length = 0
    const client = connectClient('tok_abcdefghijklmnop')

    await client.call('status', {})
    client.close()

    expect(handshakes[0]?.protocols).toContain(GATEWAY_PROTOCOL)
    expect(handshakes[0]?.protocols).toContain('token.tok_abcdefghijklmnop')
    expect(protocolList('tok_abcdefghijklmnop').join(',')).not.toContain('ws://')
  })

  it('erro do servidor vira GatewayError com o código', async () => {
    const client = connectClient()

    await expect(client.call('nao-existe')).rejects.toBeInstanceOf(GatewayError)

    try {
      await client.call('nao-existe')
    } catch (error) {
      expect((error as GatewayError).code).toBe(-32601)
    }

    client.close()
  })

  it('correlaciona dois pedidos simultâneos sem trocar as respostas', async () => {
    const client = connectClient()
    const [a, b] = await Promise.all([
      client.call('echo', { n: 1 }),
      client.call('echo', { n: 2 })
    ])

    expect(a).toEqual({ n: 1 })
    expect(b).toEqual({ n: 2 })
    expect(client.pendingCount()).toBe(0)

    client.close()
  })

  it('pedido pendente é rejeitado quando a conexão cai — nada fica travado', async () => {
    const client = connectClient()
    // 'hang' fica pendente de propósito (é a execução longa do gateway); então a conexão cai
    const pending = client.call('hang', { n: 1 })

    await new Promise(resolve => setTimeout(resolve, 150))

    for (const socket of server.clients) {
      socket.terminate()
    }

    await expect(pending).rejects.toMatchObject({ code: 'connection_lost' })
    expect(client.pendingCount()).toBe(0)
  })
})

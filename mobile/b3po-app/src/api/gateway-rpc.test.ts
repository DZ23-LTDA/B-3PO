import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WebSocketServer } from 'ws'
import type { AddressInfo } from 'node:net'

import {
  GATEWAY_PROTOCOL,
  TICKET_PROTOCOL_PREFIX,
  buildPromptSubmit,
  buildRpc,
  gatewayProtocols,
  gatewayWsUrl,
  newSubmissionId,
  sendPromptOverGateway
} from './gateway-rpc'

describe('URL e subprotocolos do gateway', () => {
  it('ticket vai no query e no subprotocolo', () => {
    const credential = { kind: 'ticket' as const, ticket: 'abc123' }

    expect(gatewayWsUrl('http://127.0.0.1:9119', credential)).toBe('ws://127.0.0.1:9119/api/ws?ticket=abc123')
    expect(gatewayProtocols(credential)).toEqual([GATEWAY_PROTOCOL, `${TICKET_PROTOCOL_PREFIX}abc123`])
  })

  it('credencial interna vai como ?internal= e sem subprotocolo de ticket', () => {
    const credential = { kind: 'internal' as const, value: 'segredo' }

    expect(gatewayWsUrl('http://127.0.0.1:9119/', credential)).toBe('ws://127.0.0.1:9119/api/ws?internal=segredo')
    expect(gatewayProtocols(credential)).toEqual([GATEWAY_PROTOCOL])
  })

  it('não inventa caminho: token de sessão não vira credencial de WS', () => {
    const url = gatewayWsUrl('http://127.0.0.1:9119', { kind: 'ticket', ticket: 'x' })

    expect(url).not.toContain('token=')
  })
})

describe('frames JSON-RPC', () => {
  it('prompt.submit exige session_id, texto e submission_id', () => {
    expect(buildPromptSubmit(2, '', 'oi', 's1')).toEqual({ error: 'rpc_error' })
    expect(buildPromptSubmit(2, 's1', '   ', 's1')).toEqual({ error: 'rpc_error' })
    expect(buildPromptSubmit(2, 's1', 'oi', '')).toEqual({ error: 'rpc_error' })
  })

  it('prompt.submit só usa chaves que o servidor aceita', () => {
    const frame = buildPromptSubmit(2, 's1', 'oi', 'sub-1')

    expect('error' in frame).toBe(false)

    if (!('error' in frame)) {
      expect(Object.keys(frame.params).sort()).toEqual(['session_id', 'submission_id', 'text'])
      expect(frame.method).toBe('prompt.submit')
      expect(frame.jsonrpc).toBe('2.0')
    }
  })

  it('identificador de submissão é único e legível', () => {
    const a = newSubmissionId(1_700_000_000_000, 0.123456)
    const b = newSubmissionId(1_700_000_000_001, 0.999999)

    expect(a).not.toBe(b)
    expect(a.startsWith('sub-')).toBe(true)
    expect(a).toMatch(/^sub-[a-z0-9]+-[a-z0-9]+$/)
  })
})

describe('ordem do envio: resume antes de submit', () => {
  it('empurra session.resume e depois prompt.submit', () => {
    const sent: string[] = []
    const result = sendPromptOverGateway(
      { send: frame => sent.push(frame), close: () => undefined },
      { sessionId: 'local-abc', text: 'olá', submissionId: 'sub-1' }
    )

    expect(result.ok).toBe(true)
    expect(sent).toHaveLength(2)

    const first = JSON.parse(sent[0]!) as { method: string }
    const second = JSON.parse(sent[1]!) as { method: string; params: Record<string, unknown> }

    expect(first.method).toBe('session.resume')
    expect(second.method).toBe('prompt.submit')
    expect(second.params['text']).toBe('olá')
  })

  it('socket que falha devolve erro, não sucesso', () => {
    const result = sendPromptOverGateway(
      {
        send: () => {
          throw new Error('socket morto')
        },
        close: () => undefined
      },
      { sessionId: 'local-abc', text: 'olá', submissionId: 'sub-1' }
    )

    expect(result).toEqual({ ok: false, error: 'socket_failed' })
  })

  it('id de RPC é sequencial a partir de 1', () => {
    expect(buildRpc(1, 'x', {}).id).toBe(1)
    expect(buildRpc(2, 'x', {}).id).toBe(2)
  })
})

describe('integração com um servidor WS que aplica o contrato', () => {
  let server: WebSocketServer
  let origin: string

  beforeEach(async () => {
    server = new WebSocketServer({ port: 0, handleProtocols: () => GATEWAY_PROTOCOL })
    await new Promise<void>(resolve => server.once('listening', () => resolve()))
    const { port } = server.address() as AddressInfo
    origin = `http://127.0.0.1:${port}`
  })

  afterEach(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()))
  })

  it('recebe resume e submit na ordem e responde aos dois', async () => {
    const received: Array<{ method: string; params: Record<string, unknown> }> = []

    server.on('connection', socket => {
      socket.on('message', raw => {
        const frame = JSON.parse(String(raw)) as { id: number; method: string; params: Record<string, unknown> }
        received.push({ method: frame.method, params: frame.params })

        if (frame.method === 'session.resume') {
          socket.send(JSON.stringify({ jsonrpc: '2.0', id: frame.id, result: { session_id: frame.params['session_id'] } }))
        } else {
          socket.send(JSON.stringify({ jsonrpc: '2.0', id: frame.id, result: { receipt: 'queued' } }))
        }
      })
    })

    const replies: Array<{ id: number }> = []
    const ws = new WebSocket(gatewayWsUrl(origin, { kind: 'internal', value: 'teste' }), gatewayProtocols({
      kind: 'internal',
      value: 'teste'
    }))

    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve())
      ws.addEventListener('error', () => reject(new Error('socket não abriu')))
    })

    ws.addEventListener('message', event => {
      replies.push(JSON.parse(String(event.data)) as { id: number })
    })

    sendPromptOverGateway(
      { send: frame => ws.send(frame), close: () => ws.close() },
      { sessionId: 'local-abc', text: 'olá', submissionId: 'sub-1' }
    )

    await new Promise(resolve => setTimeout(resolve, 250))

    expect(received.map(frame => frame.method)).toEqual(['session.resume', 'prompt.submit'])
    expect(received[0]?.params['session_id']).toBe('local-abc')
    expect(received[1]?.params['submission_id']).toBe('sub-1')
    expect(replies.map(reply => reply.id)).toEqual([1, 2])

    ws.close()
  })
})

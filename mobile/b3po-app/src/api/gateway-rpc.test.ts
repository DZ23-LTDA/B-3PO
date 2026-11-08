import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WebSocketServer } from 'ws'
import type { AddressInfo } from 'node:net'

import {
  buildPromptSubmit,
  buildSessionResume,
  canonicalSessionId,
  gatewayHeaders,
  gatewayProtocols,
  gatewayWsUrl,
  promptAccepted,
  sendPromptOverGateway
} from './gateway-rpc'

const credential = { kind: 'session-token' as const, token: 'tok-de-teste' }

describe('URL, headers e subprotocolos (contrato descoberto ao vivo)', () => {
  it('credencial vai no query como ?token=', () => {
    expect(gatewayWsUrl('http://127.0.0.1:9119', credential)).toBe('ws://127.0.0.1:9119/api/ws?token=tok-de-teste')
    expect(gatewayWsUrl('http://127.0.0.1:9119/', credential)).toContain('/api/ws?token=')
  })

  it('nada de subprotocolo: o servidor não devolve e o cliente abortaria', () => {
    expect(gatewayProtocols(credential)).toEqual([])
  })

  it('Origin é obrigatório e espelha a origem HTTP', () => {
    expect(gatewayHeaders('http://127.0.0.1:9119/')).toEqual({ Origin: 'http://127.0.0.1:9119' })
  })

  it('não inventa caminho nem credencial alternativa', () => {
    const url = gatewayWsUrl('http://127.0.0.1:9119', credential)

    expect(url).not.toContain('ticket=')
    expect(url).not.toContain('internal=')
  })
})

describe('frames', () => {
  it('prompt.submit usa SÓ session_id e text (extras são recusados pelo servidor)', () => {
    const frame = buildPromptSubmit(2, '20261103_140104_f5df78', 'olá')

    expect('error' in frame).toBe(false)

    if (!('error' in frame)) {
      expect(Object.keys(frame.params).sort()).toEqual(['session_id', 'text'])
      expect(frame.method).toBe('prompt.submit')
      expect(frame.jsonrpc).toBe('2.0')
    }
  })

  it('prompt.submit recusa localmente texto ou sessão vazios', () => {
    expect(buildPromptSubmit(2, '', 'oi')).toEqual({ error: 'rpc_error' })
    expect(buildPromptSubmit(2, 'sessao', '   ')).toEqual({ error: 'rpc_error' })
  })

  it('session.resume usa o id canônico', () => {
    const frame = buildSessionResume(1, '20261103_140104_f5df78')

    expect('error' in frame).toBe(false)

    if (!('error' in frame)) {
      expect(frame.method).toBe('session.resume')
      expect(frame.params['session_id']).toBe('20261103_140104_f5df78')
    }
  })

  it('id curto de session.create não serve: o canônico é stored_session_id', () => {
    expect(canonicalSessionId({ session_id: 'd26bcd90', stored_session_id: '20261103_140104_f5df78' })).toBe(
      '20261103_140104_f5df78'
    )
    expect(canonicalSessionId({ session_id: 'd26bcd90' })).toBe('d26bcd90')
    expect(canonicalSessionId({})).toBe('')
  })

  it('resposta de aceite é a que traz status', () => {
    expect(promptAccepted({ status: 'streaming', user_row_id: 1 })).toBe(true)
    expect(promptAccepted({ code: 4000, message: 'invalid params' })).toBe(false)
    expect(promptAccepted(null)).toBe(false)
  })
})

describe('ordem do envio', () => {
  it('empurra session.resume e depois prompt.submit', () => {
    const sent: string[] = []
    const result = sendPromptOverGateway(
      { send: frame => sent.push(frame) },
      { canonicalSessionId: '20261103_140104_f5df78', text: 'olá' }
    )

    expect(result.ok).toBe(true)
    expect(sent.map(frame => (JSON.parse(frame) as { method: string }).method)).toEqual([
      'session.resume',
      'prompt.submit'
    ])
  })

  it('socket que falha devolve erro, não sucesso', () => {
    const result = sendPromptOverGateway(
      {
        send: () => {
          throw new Error('socket morto')
        }
      },
      { canonicalSessionId: '2026', text: 'olá' }
    )

    expect(result).toEqual({ ok: false, error: 'socket_failed' })
  })
})

describe('integração com servidor WS que aplica o contrato', () => {
  let server: WebSocketServer
  let origin: string

  beforeEach(async () => {
    // O servidor real NÃO seleciona subprotocolo neste ramo; o fake imita isso.
    server = new WebSocketServer({ port: 0 })
    await new Promise<void>(resolve => server.once('listening', () => resolve()))
    const { port } = server.address() as AddressInfo
    origin = `http://127.0.0.1:${port}`
  })

  afterEach(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()))
  })

  it('abre sem subprotocolo e recebe resume + submit na ordem', async () => {
    const received: Array<{ method: string; params: Record<string, unknown> }> = []

    server.on('connection', socket => {
      socket.on('message', raw => {
        const frame = JSON.parse(String(raw)) as { id: number; method: string; params: Record<string, unknown> }
        received.push({ method: frame.method, params: frame.params })
        socket.send(JSON.stringify({ jsonrpc: '2.0', id: frame.id, result: { status: 'streaming' } }))
      })
    })

    const ws = new WebSocket(gatewayWsUrl(origin, credential))

    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve())
      ws.addEventListener('error', () => reject(new Error('socket não abriu')))
    })

    sendPromptOverGateway({ send: frame => ws.send(frame) }, { canonicalSessionId: '2026', text: 'olá' })

    await new Promise(resolve => setTimeout(resolve, 250))

    expect(received.map(frame => frame.method)).toEqual(['session.resume', 'prompt.submit'])
    expect(received[1]?.params['text']).toBe('olá')
    expect(Object.keys(received[1]?.params ?? {}).sort()).toEqual(['session_id', 'text'])

    ws.close()
  })
})

import { describe, expect, it } from 'vitest'

import { GatewayChatSocket } from './gateway-chat-socket'
import type { SocketLike } from './gateway-chat-socket'

const ORIGIN = 'http://127.0.0.1:9119'
const TOKEN = 'tok-de-teste'

interface Harness {
  socket: GatewayChatSocket
  sent: Array<{ id: number; method: string; params: Record<string, unknown> }>
  urls: string[]
  options: Array<{ headers: Record<string, string> }>
  reply: (id: number, result: unknown) => void
  replyError: (id: number, code: number, message: string) => void
  fireOpen: () => void
  fake: SocketLike
}

function harness(): Harness {
  const sent: Harness['sent'] = []
  const urls: string[] = []
  const options: Harness['options'] = []
  const fake: SocketLike = {
    send: data => sent.push(JSON.parse(data) as Harness['sent'][number]),
    close: () => undefined,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null
  }

  const socket = new GatewayChatSocket(
    ORIGIN,
    TOKEN,
    (url, opts) => {
      urls.push(url)
      options.push(opts)

      return fake
    },
    {}
  )

  const reply = (id: number, result: unknown) => fake.onmessage?.({ data: JSON.stringify({ jsonrpc: '2.0', id, result }) })
  const replyError = (id: number, code: number, message: string) =>
    fake.onmessage?.({ data: JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) })

  return { socket, sent, urls, options, reply, replyError, fireOpen: () => fake.onopen?.({}), fake }
}

describe('abertura do socket', () => {
  it('usa ?token= e manda Origin, sem subprotocolo', async () => {
    const h = harness()
    const opening = h.socket.connect()
    h.fireOpen()
    await opening

    expect(h.urls[0]).toBe('ws://127.0.0.1:9119/api/ws?token=tok-de-teste')
    expect(h.options[0]?.headers).toEqual({ Origin: ORIGIN })
    expect(h.socket.getState()).toBe('ready')
  })

  it('conectar duas vezes não reabre socket', async () => {
    const h = harness()
    const opening = h.socket.connect()
    h.fireOpen()
    await opening
    await h.socket.connect()

    expect(h.urls).toHaveLength(1)
  })
})

describe('conversa', () => {
  it('cria sessão quando não há e usa o id canônico (stored)', async () => {
    const h = harness()
    const opening = h.socket.connect()
    h.fireOpen()
    await opening

    const ensuring = h.socket.ensureSession(null)
    const createFrame = h.sent.at(-1)

    expect(createFrame?.method).toBe('session.create')
    h.reply(createFrame!.id, { session_id: 'curto123', stored_session_id: '20261103_140104_f5df78' })

    await expect(ensuring).resolves.toBe('20261103_140104_f5df78')
    expect(h.socket.getSessionId()).toBe('20261103_140104_f5df78')
  })

  it('retoma sessão existente quando o servidor aceita', async () => {
    const h = harness()
    const opening = h.socket.connect()
    h.fireOpen()
    await opening

    const ensuring = h.socket.ensureSession('20261103_140104_f5df78')
    const resumeFrame = h.sent.at(-1)

    expect(resumeFrame?.method).toBe('session.resume')
    h.reply(resumeFrame!.id, { ok: true })

    await expect(ensuring).resolves.toBe('20261103_140104_f5df78')
  })

  it('sessão que sumiu cai para criação em vez de falhar', async () => {
    const h = harness()
    const opening = h.socket.connect()
    h.fireOpen()
    await opening

    const ensuring = h.socket.ensureSession('20260101_antiga')
    const resumeFrame = h.sent.at(-1)

    h.replyError(resumeFrame!.id, 4007, 'session not found')
    await new Promise(resolve => setTimeout(resolve, 0))

    const createFrame = h.sent.at(-1)
    expect(createFrame?.method).toBe('session.create')
    h.reply(createFrame!.id, { session_id: 'novo', stored_session_id: '20261103_novo' })

    await expect(ensuring).resolves.toBe('20261103_novo')
  })

  it('envia prompt só com session_id e text, e reporta aceite', async () => {
    const accepted: string[] = []
    const sent: Array<{ id: number; method: string; params: Record<string, unknown> }> = []
    const fake: SocketLike = {
      send: data => sent.push(JSON.parse(data) as (typeof sent)[number]),
      close: () => undefined,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null
    }

    const socket = new GatewayChatSocket(ORIGIN, TOKEN, () => fake, { onAccepted: text => accepted.push(text) })
    const opening = socket.connect()
    fake.onopen?.({})
    await opening

    const sending = socket.sendPrompt('  olá B-3PO  ')
    const createFrame = sent.at(-1)!

    expect(createFrame.method).toBe('session.create')
    fake.onmessage?.({ data: JSON.stringify({ jsonrpc: '2.0', id: createFrame.id, result: { session_id: 's', stored_session_id: '20261103_x' } }) })

    await new Promise(resolve => setTimeout(resolve, 0))

    const submitFrame = sent.at(-1)!
    expect(submitFrame.method).toBe('prompt.submit')
    expect(Object.keys(submitFrame.params).sort()).toEqual(['session_id', 'text'])
    expect(submitFrame.params['text']).toBe('olá B-3PO')

    fake.onmessage?.({ data: JSON.stringify({ jsonrpc: '2.0', id: submitFrame.id, result: { status: 'streaming', user_row_id: 1 } }) })

    await expect(sending).resolves.toEqual({ accepted: true })
    expect(accepted).toEqual(['olá B-3PO'])
  })

  it('texto vazio não vira pedido', async () => {
    const h = harness()
    const opening = h.socket.connect()
    h.fireOpen()
    await opening

    await expect(h.socket.sendPrompt('   ')).resolves.toEqual({ accepted: false })
    expect(h.sent).toHaveLength(0)
  })

  it('erro do servidor vira rejeição tipada', async () => {
    const h = harness()
    const opening = h.socket.connect()
    h.fireOpen()
    await opening

    const sending = h.socket.sendPrompt('oi')
    const createFrame = h.sent.at(-1)
    h.replyError(createFrame!.id, 4000, 'invalid params')

    await expect(sending).rejects.toMatchObject({ code: 4000 })
  })

  it('sem conexão, enviar falha com mensagem clara em vez de sumir', async () => {
    const h = harness()

    await expect(h.socket.sendPrompt('oi')).rejects.toMatchObject({ message: 'sem conexão com o computador' })
  })
})

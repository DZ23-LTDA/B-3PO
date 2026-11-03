import { describe, expect, it, vi } from 'vitest'

import type { ChatSocketCallbacks } from './gateway-chat-socket'
import { GatewayChatSocket, type SocketLike } from './gateway-chat-socket'

/** Socket falso: guarda o que o cliente enviou e deixa o teste injetar frames do servidor. */
class FakeSocket implements SocketLike {
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onopen: (() => void) | null = null
  sent: string[] = []

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.onclose?.()
  }

  /** Frames JSON que o cliente mandou, já parseados. */
  frames(): Record<string, unknown>[] {
    return this.sent.map(raw => JSON.parse(raw) as Record<string, unknown>)
  }

  /** Injeta um frame como se viesse do gateway. */
  deliver(frame: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(frame) })
  }

  open(): void {
    this.onopen?.()
  }
}

function socketWithCallbacks(callbacks: ChatSocketCallbacks = {}) {
  let fake: FakeSocket | null = null

  const socket = new GatewayChatSocket(
    'http://127.0.0.1:9119',
    'tok',
    () => {
      fake = new FakeSocket()

      return fake
    },
    callbacks
  )

  return { fake: () => fake!, socket }
}

const approvalFrame = {
  id: 41,
  jsonrpc: '2.0',
  method: 'approval',
  params: {
    choices: ['once', 'deny'],
    command: 'git push origin b3po-brand',
    description: 'Enviar commits para o GitHub',
    request_id: 'req-9'
  }
}

describe('aprovação pelo celular', () => {
  it('anuncia ao gateway que responde pedidos do servidor', async () => {
    const { fake, socket } = socketWithCallbacks()
    const connecting = socket.connect()
    fake().open()
    await connecting

    const capabilities = fake().frames().find(frame => frame['method'] === 'client.capabilities')

    expect(capabilities?.['params']).toEqual({ server_requests: true })
  })

  it('um pedido do servidor vira callback e não é tratado como resposta de RPC', async () => {
    const onApproval = vi.fn()
    const { fake, socket } = socketWithCallbacks({ onApproval })
    const connecting = socket.connect()
    fake().open()
    await connecting

    fake().deliver(approvalFrame)

    expect(onApproval).toHaveBeenCalledWith({
      choices: ['once', 'deny'],
      command: 'git push origin b3po-brand',
      description: 'Enviar commits para o GitHub',
      requestId: 'req-9',
      wireId: 41
    })
    expect(socket.getPendingApproval()?.requestId).toBe('req-9')
  })

  it('responder manda o result no id do frame e limpa o pendente', async () => {
    const onApproval = vi.fn()
    const { fake, socket } = socketWithCallbacks({ onApproval })
    const connecting = socket.connect()
    fake().open()
    await connecting
    fake().deliver(approvalFrame)

    expect(socket.respondApproval('deny')).toBe(true)

    const answer = fake()
      .frames()
      .find(frame => frame['id'] === 41 && 'result' in frame)

    expect(answer).toEqual({ id: 41, jsonrpc: '2.0', result: { choice: 'deny' } })
    expect(socket.getPendingApproval()).toBeNull()
    expect(onApproval).toHaveBeenLastCalledWith(null)
  })

  it('sem pedido aberto, responder devolve false e não envia nada', async () => {
    const { fake, socket } = socketWithCallbacks()
    const connecting = socket.connect()
    fake().open()
    await connecting
    const sentBefore = fake().sent.length

    expect(socket.respondApproval('once')).toBe(false)
    expect(fake().sent.length).toBe(sentBefore)
  })
})

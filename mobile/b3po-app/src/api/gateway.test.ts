/**
 * Cliente JSON-RPC do mobile: correlaciona pedido/resposta, não duplica resposta e falha fechado.
 */
import { describe, expect, it } from 'vitest'

import { GatewayClient, GatewayError, type Transport } from './gateway'

function fakeTransport(): Transport & {
  sent: string[]
  emit: (raw: string) => void
  drop: () => void
  closed: boolean
} {
  let onMessage: (raw: string) => void = () => undefined
  let onClose: () => void = () => undefined
  const sent: string[] = []

  const transport = {
    closed: false,
    close: () => {
      transport.closed = true
    },
    drop: () => onClose(),
    emit: (raw: string) => onMessage(raw),
    onClose: (handler: () => void) => {
      onClose = handler
    },
    onMessage: (handler: (raw: string) => void) => {
      onMessage = handler
    },
    send: (payload: string) => {
      sent.push(payload)
    },
    sent
  }

  return transport
}

function client(transport: Transport, ids: string[] = []) {
  let seq = 0

  return new GatewayClient({
    connect: () => transport,
    newId: () => ids[seq++] ?? `req-${seq}`,
    now: () => 0,
    token: 'tok-123',
    url: 'wss://gateway.example/hermes'
  })
}

describe('GatewayClient', () => {
  it('resolve a chamada com o result do gateway', async () => {
    const transport = fakeTransport()
    const gateway = client(transport, ['req-1'])
    gateway.connect()

    const promise = gateway.call('profiles.list', { include_hidden: false })
    expect(transport.sent).toHaveLength(1)
    expect(JSON.parse(transport.sent[0] as string)).toEqual({
      id: 'req-1',
      method: 'profiles.list',
      params: { include_hidden: false }
    })

    transport.emit(JSON.stringify({ id: 'req-1', result: [{ name: 'ops' }] }))
    await expect(promise).resolves.toEqual([{ name: 'ops' }])
    expect(gateway.pendingCount()).toBe(0)
  })

  it('erro do gateway vira GatewayError com code, não sucesso', async () => {
    const transport = fakeTransport()
    const gateway = client(transport, ['req-1'])
    gateway.connect()

    const promise = gateway.call('profiles.list')
    transport.emit(JSON.stringify({ error: { code: 'unauthorized', message: 'token inválido' }, id: 'req-1' }))

    await expect(promise).rejects.toBeInstanceOf(GatewayError)
    await expect(promise).rejects.toMatchObject({ code: 'unauthorized', message: 'token inválido' })
  })

  it('ignora resposta repetida do mesmo id (reconexão não resolve duas vezes)', async () => {
    const transport = fakeTransport()
    const gateway = client(transport, ['req-1'])
    gateway.connect()

    const promise = gateway.call('session.list')
    transport.emit(JSON.stringify({ id: 'req-1', result: 'a' }))
    transport.emit(JSON.stringify({ id: 'req-1', result: 'b' }))

    await expect(promise).resolves.toBe('a')
    expect(gateway.pendingCount()).toBe(0)
  })

  it('chamada sem conexão falha explícita', async () => {
    const transport = fakeTransport()
    const gateway = client(transport)
    await expect(gateway.call('x')).rejects.toMatchObject({ code: 'not_connected' })
  })

  it('queda da conexão rejeita os pendentes', async () => {
    const transport = fakeTransport()
    const gateway = client(transport, ['req-1'])
    gateway.connect()

    const promise = gateway.call('turn.send')
    transport.drop()

    await expect(promise).rejects.toMatchObject({ code: 'connection_lost' })
    expect(gateway.pendingCount()).toBe(0)
  })

  it('frame inválido ou notificação não derruba a conexão', async () => {
    const transport = fakeTransport()
    const gateway = client(transport, ['req-1'])
    gateway.connect()

    const promise = gateway.call('x')
    transport.emit('não é json')
    transport.emit(JSON.stringify({ event: 'turn.start' }))
    transport.emit(JSON.stringify({ id: 'req-1', result: 'ok' }))

    await expect(promise).resolves.toBe('ok')
  })

  it('close rejeita pendentes e fecha o transporte', async () => {
    const transport = fakeTransport()
    const gateway = client(transport, ['req-1'])
    gateway.connect()

    const promise = gateway.call('x')
    gateway.close('logout')

    await expect(promise).rejects.toMatchObject({ code: 'closed' })
    expect(transport.closed).toBe(true)
  })
})

import { describe, expect, it, vi } from 'vitest'

import { readSendResponse, sendText } from './crm-whatsapp-outbound-send'

const ok = (payload: unknown, status = 200) => ({
  json: async () => payload,
  ok: status >= 200 && status < 300,
  status,
})

const OPCOES = { body: 'Oi!', phone: '+5511999991111', phoneNumberId: '123456', token: 'tok_fake' }

describe('readSendResponse', () => {
  it('sucesso exige id da mensagem', () => {
    expect(readSendResponse(200, { messages: [{ id: 'wamid.abc' }] })).toEqual({ messageId: 'wamid.abc', ok: true })
  })

  it('200 sem id NAO e sucesso — gravar mensagem inexistente seria mentir', () => {
    const resultado = readSendResponse(200, {})

    expect('error' in resultado).toBe(true)
  })

  it('4xx nao manda repetir; 429 e 5xx mandam', () => {
    const erro400 = readSendResponse(400, { error: { message: 'Invalid parameter' } })

    if (!('error' in erro400)) throw new Error('deveria falhar')
    expect(erro400.retriable).toBe(false)
    expect(erro400.error).toContain('Invalid parameter')

    const erro500 = readSendResponse(500, {})
    if (!('error' in erro500)) throw new Error('deveria falhar')
    expect(erro500.retriable).toBe(true)
  })
})

describe('sendText', () => {
  it('chama a URL da versao certa com Bearer e corpo montado', async () => {
    const fetchImpl = vi.fn(async () => ok({ messages: [{ id: 'wamid.1' }] }))

    const resultado = await sendText({ ...OPCOES, fetchImpl })
    const [url, init] = fetchImpl.mock.calls[0]

    expect(url).toBe('https://graph.facebook.com/v21.0/123456/messages')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer tok_fake')
    expect(JSON.parse(init.body)).toMatchObject({ to: '5511999991111', type: 'text' })
    expect(resultado).toEqual({ messageId: 'wamid.1', ok: true })
  })

  it('nao chama a rede quando o payload e invalido', async () => {
    const fetchImpl = vi.fn(async () => ok({}))
    const resultado = await sendText({ ...OPCOES, body: '   ', fetchImpl })

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(resultado).toHaveProperty('error')
  })

  it('falha de rede vira erro recuperavel, nao excecao', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNRESET')
    })

    const resultado = await sendText({ ...OPCOES, fetchImpl })

    if (!('error' in resultado)) throw new Error('deveria falhar')
    expect(resultado.retriable).toBe(true)
    expect(resultado.error).toContain('ECONNRESET')
  })

  it('aceita versao de API configuravel', async () => {
    const fetchImpl = vi.fn(async () => ok({ messages: [{ id: 'wamid.2' }] }))

    await sendText({ ...OPCOES, apiVersion: 'v20.0', fetchImpl })

    expect(fetchImpl.mock.calls[0][0]).toContain('/v20.0/')
  })
})

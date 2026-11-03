import { describe, expect, it } from 'vitest'

import { newDeviceId, pairingFailureMessage, parsePairingLink } from './pairing'

const TOKEN = 'tok_abcdefghijklmnop'
const link = (params: Record<string, string>) =>
  `b3po://pair?${new URLSearchParams(params).toString()}`

describe('pareamento por link/QR', () => {
  it('aceita um convite TLS completo', () => {
    const result = parsePairingLink(link({ url: 'https://pc.dz23.dev/', token: TOKEN, name: 'Escritório' }))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.request.gatewayUrl).toBe('https://pc.dz23.dev')
    expect(result.request.token).toBe(TOKEN)
    expect(result.request.deviceLabel).toBe('Escritório')
    expect(result.request.deviceId).toMatch(/^dev-/)
  })

  it('aceita WebSocket seguro e host local sem TLS', () => {
    for (const url of ['wss://pc.dz23.dev', 'ws://localhost:8080', 'http://127.0.0.1:3000', 'ws://[::1]:9000']) {
      const result = parsePairingLink(link({ url, token: TOKEN }))
      expect(result.ok, url).toBe(true)
    }
  })

  it('recusa TLS ausente para um host remoto — o token iria em texto claro', () => {
    for (const url of ['http://pc.dz23.dev', 'ws://192.168.0.10:8080']) {
      const result = parsePairingLink(link({ url, token: TOKEN }))
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.reason).toBe('insecure-remote-url')
    }
  })

  it('recusa esquemas que não são transporte de gateway', () => {
    for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'ftp://pc.dz23.dev']) {
      const result = parsePairingLink(link({ url, token: TOKEN }))
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.reason).toBe('unsupported-scheme')
    }
  })

  it('recusa link que não é convite do B-3PO', () => {
    for (const bad of ['https://evil.example/pair?url=x', 'b3po://other?url=x', 'not a url']) {
      const result = parsePairingLink(bad)
      expect(result.ok).toBe(false)
    }
  })

  it('exige token e um tamanho mínimo', () => {
    expect(parsePairingLink(link({ url: 'https://pc.dz23.dev' }))).toEqual({ ok: false, reason: 'missing-token' })

    const short = parsePairingLink(link({ url: 'https://pc.dz23.dev', token: 'abc' }))
    expect(short.ok).toBe(false)
    if (short.ok) return
    expect(short.reason).toBe('token-too-short')
  })

  it('exige o endereço do computador', () => {
    const result = parsePairingLink(link({ token: TOKEN }))

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('missing-url')
  })

  it('preserva o id do dispositivo ao reparear, em vez de criar um novo', () => {
    const first = parsePairingLink(link({ url: 'https://pc.dz23.dev', token: TOKEN, device: 'dev-from-qr' }))
    const again = parsePairingLink(link({ url: 'https://pc.dz23.dev', token: TOKEN }), 'dev-guardado')

    expect(first.ok && first.request.deviceId).toBe('dev-from-qr')
    expect(again.ok && again.request.deviceId).toBe('dev-guardado')
  })

  it('gera id de dispositivo seguro para path/URL', () => {
    const id = newDeviceId()

    expect(id).toMatch(/^[a-zA-Z0-9-]+$/)
    expect(id.length).toBeGreaterThan(8)
  })

  it('nunca repete o token na mensagem de erro da tela', () => {
    const cases = ['not-a-pair-link', 'missing-url', 'unsupported-scheme', 'insecure-remote-url', 'missing-token', 'token-too-short'] as const

    for (const reason of cases) {
      const message = pairingFailureMessage(reason)
      expect(message.length).toBeGreaterThan(20)
      expect(message).not.toContain(TOKEN)
    }
  })
})

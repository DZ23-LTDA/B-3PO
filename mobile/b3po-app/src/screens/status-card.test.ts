import { describe, expect, it } from 'vitest'

import { OFFLINE_BODY, OFFLINE_TITLE, statusCard } from './status-card'

const health = { ok: true, commit: '98695c0cc7e58f', authRequired: false }

describe('texto do cartão de status', () => {
  it('sem conexão explica o que fazer', () => {
    expect(statusCard({ status: 'disconnected' })).toEqual({ title: OFFLINE_TITLE, body: OFFLINE_BODY })
  })

  it('conectando mostra o endereço que está tentando', () => {
    const card = statusCard({ status: 'connecting', origin: 'http://127.0.0.1:54686' })

    expect(card.title).toBe('Conectando…')
    expect(card.body).toContain('http://127.0.0.1:54686')
  })

  it('falha mostra a mensagem real, não um texto genérico', () => {
    const card = statusCard({ status: 'failed', origin: 'http://x', message: 'timeout de 8s' })

    expect(card.body).toBe('timeout de 8s')
  })

  it('conectado mostra servidor, compilação, token e estado do gateway', () => {
    const card = statusCard({
      status: 'connected',
      origin: 'http://127.0.0.1:54686',
      deviceId: 'dev-1',
      health,
      gateway: { gatewayRunning: true, gatewayState: 'running', configVersion: 52 },
      checkedAt: 1
    })

    expect(card.title).toBe('Conectado ao computador')
    expect(card.body).toContain('Servidor: http://127.0.0.1:54686')
    expect(card.body).toContain('Compilação: 98695c0cc7e58f')
    expect(card.body).toContain('Token exigido: não')
    expect(card.body).toContain('Gateway: rodando')
    expect(card.body).toContain('Estado: running')
  })

  it('conectado sem /api/status não inventa estado de gateway', () => {
    const card = statusCard({
      status: 'connected',
      origin: 'http://x',
      deviceId: 'dev-1',
      health,
      gateway: null,
      checkedAt: 1
    })

    expect(card.body).not.toContain('Gateway:')
    expect(card.body).toContain('Compilação: 98695c0cc7e58f')
  })

  it('erro de pareamento tem prioridade e aparece com o motivo', () => {
    const card = statusCard({ status: 'disconnected' }, 'Este convite expirou.')

    expect(card.title).toBe('Não foi possível parear')
    expect(card.body).toBe('Este convite expirou.')
  })

  it('estado fora do contrato nunca devolve nada vazio', () => {
    const card = statusCard({ status: 'bogus' } as never)

    expect(card.title.length).toBeGreaterThan(3)
    expect(card.body.length).toBeGreaterThan(10)
  })
})

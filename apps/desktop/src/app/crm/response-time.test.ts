import { describe, expect, it } from 'vitest'

import { averageResponseTime, responseTime, responseTimeLabel } from './response-time'

const msg = (direction: 'entrada' | 'saida', sent_at: number) => ({
  body: 'x',
  direction,
  external_id: `id_${direction}_${sent_at}`,
  sent_at,
})

describe('responseTime', () => {
  it('mede do ultimo "entrada" ate a saida', () => {
    expect(responseTime([msg('entrada', 1000), msg('saida', 61000)])).toEqual({ amostras: 1, mediaMs: 60000 })
  })

  it('conversa sem resposta devolve null — nao zero', () => {
    expect(responseTime([msg('entrada', 1000)])).toBeNull()
    expect(responseTime([])).toBeNull()
  })

  it('saida sem entrada antes nao entra na conta', () => {
    expect(responseTime([msg('saida', 1000), msg('entrada', 2000)])).toBeNull()
  })

  it('duas saidas seguidas nao contam como duas respostas', () => {
    const r = responseTime([msg('entrada', 0), msg('saida', 10000), msg('saida', 20000)])

    expect(r).toEqual({ amostras: 1, mediaMs: 10000 })
  })

  it('ordena por horario em vez de confiar na ordem de chegada', () => {
    const r = responseTime([msg('saida', 61000), msg('entrada', 1000)])

    expect(r).toEqual({ amostras: 1, mediaMs: 60000 })
  })
})

describe('averageResponseTime', () => {
  it('ignora conversa sem resposta em vez de conta-la como zero', () => {
    const r = averageResponseTime([
      { messages: [msg('entrada', 0), msg('saida', 60000)] },
      { messages: [msg('entrada', 0)] },
    ])

    expect(r).toEqual({ amostras: 1, mediaMs: 60000 })
  })

  it('sem nenhuma resposta, null', () => {
    expect(averageResponseTime([{ messages: [msg('entrada', 0)] }])).toBeNull()
  })
})

describe('responseTimeLabel', () => {
  it('segundos, minutos e horas', () => {
    expect(responseTimeLabel(45000)).toBe('45 s')
    expect(responseTimeLabel(12 * 60000)).toBe('12 min')
    expect(responseTimeLabel((3 * 60 + 20) * 60000)).toBe('3 h 20 min')
    expect(responseTimeLabel(2 * 3600000)).toBe('2 h')
  })
})

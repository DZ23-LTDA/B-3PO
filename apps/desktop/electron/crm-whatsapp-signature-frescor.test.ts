// O frescor do webhook (r68 do GOAL V2).
//
// A assinatura prova ORIGEM; isto prova FRESCOR. Sem ele, um HMAC válido de ontem reentra hoje.

import { describe, expect, it } from 'vitest'

import { checarFrescor, JANELA_REPLAY_MS } from './crm-whatsapp-signature'

const AGORA = 1_700_000_000_000

describe('o que passa', () => {
  it('mensagem de agora', () => {
    expect(checarFrescor(AGORA / 1000, AGORA)).toEqual({ fresh: true })
  })

  it('há 5 minutos — dentro da janela de 10', () => {
    expect(checarFrescor((AGORA - 5 * 60 * 1000) / 1000, AGORA)).toEqual({ fresh: true })
  })

  it('reentrega de 5 min (a terceira tentativa da Meta) passa', () => {
    // A Meta reentrega em 1 min e 5 min. Recusar essas perderia a mensagem do cliente.
    expect(checarFrescor((AGORA - 5 * 60 * 1000) / 1000, AGORA)).toEqual({ fresh: true })
  })

  it('relógio ADIANTADO não é recusado — é NTP, não ataque', () => {
    // Um `entry.time` no futuro é relógio dessincronizado. Recusar faria o webhook parar por um desvio.
    expect(checarFrescor((AGORA + 60_000) / 1000, AGORA)).toEqual({ fresh: true })
  })
})

describe('o que é recusado', () => {
  it('mensagem de ONTEM — o replay que a assinatura sozinha não pega', () => {
    expect(checarFrescor((AGORA - 24 * 60 * 60 * 1000) / 1000, AGORA)).toEqual({ error: 'fora_da_janela', fresh: false })
  })

  it('um segundo além da janela', () => {
    const limite = (AGORA - JANELA_REPLAY_MS - 1000) / 1000

    expect(checarFrescor(limite, AGORA)).toEqual({ error: 'fora_da_janela', fresh: false })
  })

  it('sem `entry.time`, não há como provar frescor — e inventar seria aceitar sem verificar', () => {
    expect(checarFrescor(undefined, AGORA)).toEqual({ error: 'sem_tempo', fresh: false })
    expect(checarFrescor('1700000000', AGORA)).toEqual({ error: 'sem_tempo', fresh: false })
    expect(checarFrescor(0, AGORA)).toEqual({ error: 'sem_tempo', fresh: false })
    expect(checarFrescor(Number.NaN, AGORA)).toEqual({ error: 'sem_tempo', fresh: false })
  })
})

describe('a janela', () => {
  it('é de 10 minutos — cobre a 1ª, a de 1 min e a de 5 min da Meta', () => {
    expect(JANELA_REPLAY_MS).toBe(10 * 60 * 1000)
  })
})

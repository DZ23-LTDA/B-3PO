// O limite de taxa (r70 do GOAL V2).
//
// O §19 lista `rate limiting` e não diz qual é o limite. Estes testes fixam a escolha — e o que ela
// protege e não protege.

import { afterEach, describe, expect, it } from 'vitest'

import {
  esquecerLimitadores,
  JANELA_PADRAO_MS,
  LIMITE_PADRAO,
  limitadorDe,
  mensagemDeLimite,
  RateLimiter
} from './rate-limit'

const T0 = 1_700_000_000_000

afterEach(() => {
  esquecerLimitadores()
})

describe('o número', () => {
  it('20 por minuto — 10x o ritmo humano, e corta um laço na primeira fração de segundo', () => {
    // Uma venda digitada leva ~30s. 20 por minuto NÃO atrapalha quem trabalha; milhares por segundo é
    // abuso. O limite é sobre a diferença entre uma pessoa e um laço, não sobre velocidade.
    expect(LIMITE_PADRAO).toBe(20)
    expect(JANELA_PADRAO_MS).toBe(60_000)
  })
})

describe('a janela deslizante', () => {
  it('permite até o limite', () => {
    const l = new RateLimiter(3, 60_000)

    expect(l.registrar('ator', T0)).toEqual({ ok: true })
    expect(l.registrar('ator', T0)).toEqual({ ok: true })
    expect(l.registrar('ator', T0)).toEqual({ ok: true })
  })

  it('a N+1 recusa e diz quanto esperar', () => {
    const l = new RateLimiter(2, 60_000)

    l.registrar('ator', T0)
    l.registrar('ator', T0)

    const r = l.registrar('ator', T0 + 10_000)

    expect(r).toMatchObject({ error: 'limite_excedido', restantes: 0 })
    expect('espere_ms' in r && r.espere_ms).toBeGreaterThan(0)
  })

  it('DESLIZANTE, e não fixa: 20 no fim de um minuto e 20 no começo do seguinte seria 40 de uma vez', () => {
    const l = new RateLimiter(2, 60_000)

    l.registrar('ator', T0 + 59_000)
    l.registrar('ator', T0 + 59_500)

    // Janela fixa deixaria passar; deslizante recusa.
    expect(l.registrar('ator', T0 + 60_500)).toMatchObject({ error: 'limite_excedido' })
  })

  it('passada a janela, a cota volta', () => {
    const l = new RateLimiter(1, 60_000)

    expect(l.registrar('ator', T0)).toEqual({ ok: true })
    expect(l.registrar('ator', T0 + 1_000)).toMatchObject({ error: 'limite_excedido' })
    // 61s depois, o registro de T0 saiu da janela.
    expect(l.registrar('ator', T0 + 61_000)).toEqual({ ok: true })
  })

  it('atores diferentes têm cotas independentes', () => {
    const l = new RateLimiter(1, 60_000)

    expect(l.registrar('a', T0)).toEqual({ ok: true })
    expect(l.registrar('b', T0)).toEqual({ ok: true })
    expect(l.registrar('a', T0)).toMatchObject({ error: 'limite_excedido' })
  })
})

describe('consultar não gasta cota', () => {
  it('um handler que recusa por OUTRO motivo não deve consumir o direito de uma chamada legítima', () => {
    // Se uma tentativa malformada gastasse a cota, cinco erros de digitação bloqueariam a venda real.
    const l = new RateLimiter(2, 60_000)

    expect(l.consultar('ator', T0)).toEqual({ ok: true })
    expect(l.consultar('ator', T0)).toEqual({ ok: true })
    expect(l.consultar('ator', T0)).toEqual({ ok: true })

    expect(l.restantes('ator', T0)).toBe(2)
  })

  it('registrar conta; restantes cai', () => {
    const l = new RateLimiter(3, 60_000)

    l.registrar('ator', T0)

    expect(l.restantes('ator', T0)).toBe(2)
  })
})

describe('a recusa não adiciona ao registro', () => {
  it('insistir depois de estourado não piora a espera', () => {
    const l = new RateLimiter(1, 60_000)

    l.registrar('ator', T0)

    const primeira = l.registrar('ator', T0 + 10_000)
    const segunda = l.registrar('ator', T0 + 10_000)

    // A segunda recusa devolve a MESMA espera — o registro não cresceu.
    expect('espere_ms' in primeira && 'espere_ms' in segunda && primeira.espere_ms).toBe(
      'espere_ms' in segunda ? segunda.espere_ms : -1
    )
  })
})

describe('o limitador por processo', () => {
  it('limitadorDe devolve o mesmo para o mesmo nome', () => {
    const a = limitadorDe('faturar')
    const b = limitadorDe('faturar')

    expect(a).toBe(b)
  })

  it('nomes diferentes são limitadores diferentes', () => {
    expect(limitadorDe('faturar')).not.toBe(limitadorDe('compras'))
  })
})

describe('a mensagem', () => {
  it('diz QUANTO esperar, não só que falhou', () => {
    // "Limite excedido" sozinho obriga a pessoa a tentar de novo no escuro.
    const msg = mensagemDeLimite({ espere_ms: 45_000 })

    expect(msg).toContain('45')
    expect(msg).toContain('Espere')
  })
})

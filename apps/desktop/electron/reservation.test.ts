// A reserva de estoque (r62 do GOAL V2).
//
// O §26 põe `reserva` entre o pedido e o pagamento. A r61 mediu que não existia. Estes testes fixam o que
// ela promete — e, principalmente, **o que ela se recusa a fazer**.

import { describe, expect, it } from 'vitest'

import {
  disponivel,
  mudarReserva,
  normalizarReserva,
  PRAZO_PADRAO_MS,
  podeReservar,
  reservaAtiva,
  reservado,
  reservasVencidas,
  resumoDasReservas,
  type Reserva
} from './reservation'

const CTX = { agora: 1_000, tenant_id: 'local' }

function ativa(extra: Partial<Reserva> = {}): Reserva {
  return {
    created_at: 0,
    expires_at: 1_000 + PRAZO_PADRAO_MS,
    id: 'res-1',
    product_sku: 'BUJAO',
    quantity_milli: 10_000,
    sale_id: 'venda-1',
    status: 'ativa',
    tenant_id: 'local',
    updated_at: 0,
    ...extra
  }
}

describe('normalizar', () => {
  it('nasce ativa, com prazo', () => {
    const r = normalizarReserva({ product_sku: 'B', quantity_milli: 5_000, sale_id: 'v1' }, CTX)

    expect('reserva' in r && r.reserva).toMatchObject({
      expires_at: 1_000 + PRAZO_PADRAO_MS,
      product_sku: 'B',
      quantity_milli: 5_000,
      sale_id: 'v1',
      status: 'ativa'
    })
  })

  it('o status do payload é ignorado — nasce ativa', () => {
    const r = normalizarReserva(
      { product_sku: 'B', quantity_milli: 5_000, sale_id: 'v1', status: 'confirmada' },
      CTX
    )

    expect('reserva' in r && r.reserva.status).toBe('ativa')
  })

  it('sem venda, sem reserva — mercadoria parada sem motivo', () => {
    expect(normalizarReserva({ product_sku: 'B', quantity_milli: 1_000 }, CTX)).toEqual({ error: 'sale_obrigatoria' })
  })

  it('sem SKU ou com quantidade inválida, recusa', () => {
    expect(normalizarReserva({ quantity_milli: 1_000, sale_id: 'v' }, CTX)).toEqual({ error: 'sku_obrigatorio' })
    expect(normalizarReserva({ product_sku: 'B', quantity_milli: 0, sale_id: 'v' }, CTX)).toEqual({
      error: 'quantidade_invalida'
    })
  })

  it('prazo inválido é recusado — reserva sem prazo travaria o produto', () => {
    expect(normalizarReserva({ product_sku: 'B', quantity_milli: 1_000, sale_id: 'v' }, { ...CTX, prazo_ms: 0 })).toEqual({
      error: 'prazo_invalido'
    })
  })
})

describe('quando a reserva conta', () => {
  it('ativa e não vencida, conta', () => {
    expect(reservaAtiva(ativa(), 2_000)).toBe(true)
  })

  it('vencida NÃO conta — senão um pedido abandonado travaria o produto para sempre', () => {
    const vencida = ativa({ expires_at: 1_500 })

    expect(reservaAtiva(vencida, 2_000)).toBe(false)
  })

  it('confirmada não conta — o estoque sai por outro caminho', () => {
    expect(reservaAtiva(ativa({ status: 'confirmada' }), 2_000)).toBe(false)
  })

  it('liberada não conta', () => {
    expect(reservaAtiva(ativa({ status: 'liberada' }), 2_000)).toBe(false)
  })
})

describe('o disponível — a pergunta que a tela faz', () => {
  it('saldo menos reservado', () => {
    expect(disponivel(100_000, [ativa()], 'BUJAO', 2_000)).toBe(90_000)
  })

  it('reserva de OUTRA SKU não desconta', () => {
    expect(disponivel(100_000, [ativa({ product_sku: 'OUTRO' })], 'BUJAO', 2_000)).toBe(100_000)
  })

  it('vencida devolve o produto à disponibilidade', () => {
    expect(disponivel(100_000, [ativa({ expires_at: 1_500 })], 'BUJAO', 2_000)).toBe(100_000)
  })

  it('NUNCA é negativo — a resposta a um estoque inconsistente é "não"', () => {
    const muitas = [ativa({ id: 'a', quantity_milli: 80_000 }), ativa({ id: 'b', quantity_milli: 80_000 })]

    expect(disponivel(100_000, muitas, 'BUJAO', 2_000)).toBe(0)
  })

  it('reservado soma só as ativas da SKU', () => {
    const lista = [
      ativa({ id: 'a', quantity_milli: 10_000 }),
      ativa({ id: 'b', quantity_milli: 5_000 }),
      ativa({ id: 'c', quantity_milli: 7_000, status: 'confirmada' }),
      ativa({ id: 'd', quantity_milli: 3_000, expires_at: 1_500 })
    ]

    expect(reservado(lista, 'BUJAO', 2_000)).toBe(15_000)
  })
})

describe('podeReservar', () => {
  it('com saldo livre, ok', () => {
    expect(podeReservar({ agora: 2_000, quantity_milli: 10_000, reservas: [], saldo: 100_000, sku: 'B' })).toEqual({
      ok: true
    })
  })

  it('sem saldo, a recusa NOMEIA o livre', () => {
    // `saldo_insuficiente` sozinho obrigaria quem lê a calcular quanto sobra.
    const r = podeReservar({ agora: 2_000, quantity_milli: 50_000, reservas: [], saldo: 30_000, sku: 'B' })

    expect(r).toEqual({ error: 'saldo_insuficiente', livre_milli: 30_000 })
  })

  it('o que outra reserva ocupou não está livre', () => {
    const r = podeReservar({
      agora: 2_000,
      quantity_milli: 25_000,
      reservas: [ativa({ quantity_milli: 10_000 })],
      saldo: 30_000,
      sku: 'BUJAO'
    })

    expect(r).toEqual({ error: 'saldo_insuficiente', livre_milli: 20_000 })
  })

  it('SKU vazia ou quantidade inválida', () => {
    expect(podeReservar({ quantity_milli: 1, reservas: [], saldo: 1, sku: '  ' })).toEqual({ error: 'sku_obrigatorio' })
    expect(podeReservar({ quantity_milli: 0, reservas: [], saldo: 1, sku: 'B' })).toEqual({
      error: 'quantidade_invalida'
    })
  })
})

describe('as transições', () => {
  it('ativa → confirmada', () => {
    const r = mudarReserva(ativa(), 'confirmada', 2_000)

    expect('reserva' in r && r.reserva.status).toBe('confirmada')
  })

  it('ativa → liberada', () => {
    const r = mudarReserva(ativa(), 'liberada', 2_000)

    expect('reserva' in r && r.reserva.status).toBe('liberada')
  })

  it('CONFIRMAR UMA VENCIDA É RECUSADO — o produto já está disponível para outro', () => {
    // É o caso perigoso: quem chegou atrasado reserva de novo e encontra o saldo que a primeira liberou,
    // ou não encontra nada.
    const vencida = ativa({ expires_at: 1_500 })

    expect(mudarReserva(vencida, 'confirmada', 2_000)).toEqual({ error: 'prazo_vencido' })
  })

  it('liberar uma vencida é permitido — é arrumar a casa', () => {
    const vencida = ativa({ expires_at: 1_500 })

    expect(mudarReserva(vencida, 'liberada', 2_000)).toMatchObject({ reserva: { status: 'liberada' } })
  })

  it('confirmada NÃO volta — a mesma mercadoria seria prometida duas vezes', () => {
    expect(mudarReserva(ativa({ status: 'confirmada' }), 'ativa', 2_000)).toEqual({ error: 'reserva_ja_finalizada' })
  })

  it('liberada NÃO volta — apagaria a desistência, que é um fato', () => {
    expect(mudarReserva(ativa({ status: 'liberada' }), 'ativa', 2_000)).toEqual({ error: 'reserva_ja_finalizada' })
  })
})

describe('as vencidas e o resumo', () => {
  it('vencidas são as ativas com prazo passado', () => {
    const lista = [
      ativa({ id: 'a' }),
      ativa({ expires_at: 1_500, id: 'b' }),
      ativa({ expires_at: 1_500, id: 'c', status: 'confirmada' })
    ]

    expect(reservasVencidas(lista, 2_000).map(r => r.id)).toEqual(['b'])
  })

  it('o resumo diz separado o que ocupa e o que venceu', () => {
    const lista = [ativa(), ativa({ expires_at: 1_500 })]

    const resumo = resumoDasReservas(lista, 2_000)

    expect(resumo).toContain('1 ativa(s)')
    // A vencida é dita em voz própria: ela NÃO ocupa mais, e alguém precisa resolver.
    expect(resumo).toContain('1 vencida(s) para liberar')
  })

  it('sem reservas, diz isso', () => {
    expect(resumoDasReservas([], 2_000)).toContain('Nenhuma reserva')
  })
})

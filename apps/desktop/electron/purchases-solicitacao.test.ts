// A solicitação de compra (r41 do GOAL V2).
//
// O §14 lista `purchase_requests` no modelo e a põe como PRIMEIRA etapa do fluxo. Antes desta rodada, o
// produto começava na cotação: alguém já sabia o que queria e por quanto — e nada registrava "por quê".

import { describe, expect, it } from 'vitest'

import {
  isSolicitacaoStatus,
  mudarStatusSolicitacao,
  normalizarSolicitacao,
  quantidadePedida,
  solicitacoesAbertas,
  type SolicitacaoCompra
} from './purchases-solicitacao'

const CTX = { agora: 1_000, solicitante: 'ator-dono', tenant_id: 'local' }

function aberta(extra: Partial<SolicitacaoCompra> = {}): SolicitacaoCompra {
  return {
    created_at: 0,
    id: 'sol-1',
    motivo: 'acabou o estoque',
    pedido_id: null,
    product_sku: 'A',
    quantity_milli: 10_000,
    solicitante: 'ator-dono',
    status: 'aberta',
    tenant_id: 'local',
    updated_at: 0,
    ...extra
  }
}

describe('normalizar', () => {
  it('cria aberta, com o solicitante que veio do contexto', () => {
    const r = normalizarSolicitacao(
      { motivo: 'acabou o estoque', product_sku: 'A', quantity_milli: 10_000 },
      CTX
    )

    expect('solicitacao' in r && r.solicitacao).toMatchObject({
      motivo: 'acabou o estoque',
      product_sku: 'A',
      quantity_milli: 10_000,
      solicitante: 'ator-dono',
      status: 'aberta',
      tenant_id: 'local'
    })
  })

  it('o solicitante do PAYLOAD é ignorado — quem pede vem do resolvedor', () => {
    // Aceitar o solicitante do payload deixaria alguém pedir em nome de outro, e a trilha mentiria.
    const r = normalizarSolicitacao(
      { motivo: 'x', product_sku: 'A', quantity_milli: 1_000, solicitante: 'outro' },
      CTX
    )

    expect('solicitacao' in r && r.solicitacao.solicitante).toBe('ator-dono')
  })

  it('o status do PAYLOAD é ignorado — uma solicitação que nasce atendida não pediu nada', () => {
    const r = normalizarSolicitacao(
      { motivo: 'x', product_sku: 'A', quantity_milli: 1_000, status: 'atendida' },
      CTX
    )

    expect('solicitacao' in r && r.solicitacao.status).toBe('aberta')
  })
})

describe('as recusas de criar', () => {
  it('SKU vazia', () => {
    expect(normalizarSolicitacao({ motivo: 'x', quantity_milli: 1_000 }, CTX)).toEqual({ error: 'sku_obrigatorio' })
    expect(normalizarSolicitacao({ motivo: 'x', product_sku: '   ', quantity_milli: 1_000 }, CTX)).toEqual({
      error: 'sku_obrigatorio'
    })
  })

  it('quantidade zero ou negativa não é pedido', () => {
    expect(normalizarSolicitacao({ motivo: 'x', product_sku: 'A', quantity_milli: 0 }, CTX)).toEqual({
      error: 'quantidade_invalida'
    })
    expect(normalizarSolicitacao({ motivo: 'x', product_sku: 'A', quantity_milli: -5 }, CTX)).toEqual({
      error: 'quantidade_invalida'
    })
  })

  it('quantidade ausente ou não numérica', () => {
    expect(normalizarSolicitacao({ motivo: 'x', product_sku: 'A' }, CTX)).toEqual({ error: 'quantidade_invalida' })
    expect(normalizarSolicitacao({ motivo: 'x', product_sku: 'A', quantity_milli: '10' }, CTX)).toEqual({
      error: 'quantidade_invalida'
    })
  })

  it('motivo em branco é RECUSADO', () => {
    // A solicitação inteira existe para registrar POR QUÊ. Aceitar vazio produziria uma linha que parece
    // informação e não é.
    expect(normalizarSolicitacao({ product_sku: 'A', quantity_milli: 1_000 }, CTX)).toEqual({
      error: 'motivo_obrigatorio'
    })
    expect(normalizarSolicitacao({ motivo: '  ', product_sku: 'A', quantity_milli: 1_000 }, CTX)).toEqual({
      error: 'motivo_obrigatorio'
    })
  })
})

describe('as transições', () => {
  it('aberta → atendida', () => {
    const r = mudarStatusSolicitacao(aberta(), 'atendida', 2_000)

    expect('solicitacao' in r && r.solicitacao).toMatchObject({ status: 'atendida', updated_at: 2_000 })
  })

  it('aberta → cancelada', () => {
    const r = mudarStatusSolicitacao(aberta(), 'cancelada', 2_000)

    expect('solicitacao' in r && r.solicitacao.status).toBe('cancelada')
  })

  it('atendida NÃO volta — reabrir faria a mesma necessidade pedir duas vezes', () => {
    expect(mudarStatusSolicitacao(aberta({ status: 'atendida' }), 'aberta', 2_000)).toEqual({ error: 'ja_atendida' })
  })

  it('cancelada NÃO volta — reabrir apagaria o cancelamento, que é um fato', () => {
    expect(mudarStatusSolicitacao(aberta({ status: 'cancelada' }), 'aberta', 2_000)).toEqual({
      error: 'ja_cancelada'
    })
  })

  it('mudar para o mesmo status é no-op, não erro', () => {
    const s = aberta()
    const r = mudarStatusSolicitacao(s, 'aberta', 2_000)

    expect('solicitacao' in r && r.solicitacao).toBe(s)
  })
})

describe('as consultas', () => {
  it('só abertas entram na fila', () => {
    const lista = [aberta({ id: '1' }), aberta({ id: '2', status: 'atendida' }), aberta({ id: '3', status: 'cancelada' })]

    expect(solicitacoesAbertas(lista).map(s => s.id)).toEqual(['1'])
  })

  it('quantidadePedida soma só as abertas daquela SKU', () => {
    const lista = [
      aberta({ id: '1', product_sku: 'A', quantity_milli: 10_000 }),
      aberta({ id: '2', product_sku: 'A', quantity_milli: 5_000 }),
      // Atendida não conta: já foi comprada, e somar de novo dobraria a necessidade.
      aberta({ id: '3', product_sku: 'A', quantity_milli: 7_000, status: 'atendida' }),
      aberta({ id: '4', product_sku: 'B', quantity_milli: 3_000 })
    ]

    expect(quantidadePedida(lista, 'A')).toBe(15_000)
  })

  it('isSolicitacaoStatus reconhece os três', () => {
    expect(isSolicitacaoStatus('aberta')).toBe(true)
    expect(isSolicitacaoStatus('atendida')).toBe(true)
    expect(isSolicitacaoStatus('cancelada')).toBe(true)
    expect(isSolicitacaoStatus('outro')).toBe(false)
  })
})

// A entrega (r56 do GOAL V2).
//
// A r55 mediu: os 9 domínios do §17 existem, MENOS logística — e o candidato a vertical que o GOAL nomeia
// (distribuidora de gás) é, antes de tudo, uma operação de entrega.
//
// Estes testes fixam o MÍNIMO: existe, tem destino, tem quem levou, tem comprovante. E fixam o que o
// módulo recusa, que é tão importante quanto o que ele aceita.

import { describe, expect, it } from 'vitest'

import {
  entregasPendentes,
  isEntregaStatus,
  normalizarEntrega,
  resumoDasEntregas,
  transitarEntrega,
  type Entrega
} from './delivery'

const CTX = { agora: 1_000, tenant_id: 'local' }

function pendente(extra: Partial<Entrega> = {}): Entrega {
  return {
    comprovante: null,
    created_at: 0,
    destino: 'Rua A, 10',
    entregador: null,
    id: 'ent-1',
    order_id: 'venda-1',
    status: 'pendente',
    tenant_id: 'local',
    updated_at: 0,
    ...extra
  }
}

describe('normalizar', () => {
  it('nasce pendente, sem entregador e sem comprovante', () => {
    const r = normalizarEntrega({ destino: 'Rua A, 10', order_id: 'venda-1' }, CTX)

    expect('entrega' in r && r.entrega).toMatchObject({
      comprovante: null,
      destino: 'Rua A, 10',
      entregador: null,
      order_id: 'venda-1',
      status: 'pendente'
    })
  })

  it('o status do PAYLOAD é ignorado — uma entrega que nasce entregue não saiu', () => {
    const r = normalizarEntrega({ destino: 'X', order_id: 'v', status: 'entregue' }, CTX)

    expect('entrega' in r && r.entrega.status).toBe('pendente')
  })

  it('sem pedido, não há entrega — uma viagem sem motivo', () => {
    expect(normalizarEntrega({ destino: 'X' }, CTX)).toEqual({ error: 'order_obrigatorio' })
  })

  it('sem destino, não há entrega', () => {
    expect(normalizarEntrega({ order_id: 'v' }, CTX)).toEqual({ error: 'destino_obrigatorio' })
    expect(normalizarEntrega({ destino: '   ', order_id: 'v' }, CTX)).toEqual({ error: 'destino_obrigatorio' })
  })
})

describe('as transições', () => {
  it('pendente → em_rota, com entregador', () => {
    const r = transitarEntrega(pendente(), 'em_rota', { agora: 2_000, recebedor: 'joao' })

    expect('entrega' in r && r.entrega).toMatchObject({ entregador: 'joao', status: 'em_rota' })
  })

  it('em_rota → entregue, com comprovante', () => {
    const emRota = pendente({ entregador: 'joao', status: 'em_rota' })
    const r = transitarEntrega(emRota, 'entregue', { agora: 3_000, recebedor: 'maria' })

    expect('entrega' in r && r.entrega.comprovante).toEqual({ recebido_em: 3_000, recebedor: 'maria' })
  })

  it('entregue SEM comprovante é recusada — afirmação sem prova', () => {
    // É o que uma distribuidora precisa poder mostrar quando o cliente diz que não recebeu.
    const emRota = pendente({ entregador: 'joao', status: 'em_rota' })

    expect(transitarEntrega(emRota, 'entregue', { agora: 3_000 })).toEqual({ error: 'comprovante_obrigatorio' })
    expect(transitarEntrega(emRota, 'entregue', { agora: 3_000, recebedor: '  ' })).toEqual({
      error: 'comprovante_obrigatorio'
    })
  })

  it('pendente → entregue direto é recusado: pularia o "saiu com a mercadoria"', () => {
    expect(transitarEntrega(pendente(), 'entregue', { agora: 3_000, recebedor: 'x' })).toEqual({
      error: 'transicao_invalida'
    })
  })

  it('em_rota sem entregador não sai — rota sem responsável não tem a quem perguntar', () => {
    expect(transitarEntrega(pendente(), 'em_rota', { agora: 2_000 })).toEqual({ error: 'transicao_invalida' })
  })

  it('em_rota → recusada', () => {
    const r = transitarEntrega(pendente({ status: 'em_rota' }), 'recusada', { agora: 3_000 })

    expect('entrega' in r && r.entrega.status).toBe('recusada')
  })

  it('pendente → recusada (cancelada antes de sair)', () => {
    const r = transitarEntrega(pendente(), 'recusada', { agora: 3_000 })

    expect('entrega' in r && r.entrega.status).toBe('recusada')
  })
})

describe('os estados finais', () => {
  it('entregue NÃO volta — a mesma mercadoria sairia duas vezes', () => {
    const entregue = pendente({ comprovante: { recebido_em: 1, recebedor: 'x' }, status: 'entregue' })

    expect(transitarEntrega(entregue, 'pendente', { agora: 4_000 })).toEqual({ error: 'entrega_ja_finalizada' })
  })

  it('recusada NÃO volta — apagaria o fato de o cliente ter dito não', () => {
    expect(transitarEntrega(pendente({ status: 'recusada' }), 'em_rota', { agora: 4_000, recebedor: 'x' })).toEqual({
      error: 'entrega_ja_finalizada'
    })
  })
})

describe('as consultas', () => {
  it('a fila tem pendente e em_rota; entregue e recusada não', () => {
    const lista = [
      pendente({ id: '1' }),
      pendente({ id: '2', status: 'em_rota' }),
      pendente({ id: '3', status: 'entregue' }),
      pendente({ id: '4', status: 'recusada' })
    ]

    expect(entregasPendentes(lista).map(e => e.id)).toEqual(['1', '2'])
  })

  it('o resumo conta por estado, em português', () => {
    const lista = [pendente(), pendente({ status: 'em_rota' }), pendente({ status: 'entregue' })]

    expect(resumoDasEntregas(lista)).toContain('1 a sair')
    expect(resumoDasEntregas(lista)).toContain('1 em rota')
    expect(resumoDasEntregas(lista)).toContain('1 entregue')
  })

  it('isEntregaStatus reconhece os quatro', () => {
    expect(isEntregaStatus('pendente')).toBe(true)
    expect(isEntregaStatus('recusada')).toBe(true)
    expect(isEntregaStatus('outro')).toBe(false)
  })
})

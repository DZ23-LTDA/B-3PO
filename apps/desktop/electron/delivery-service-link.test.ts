// A ligacao entrega -> atendimento (r140/r141 do GOAL V2).

import { describe, expect, it } from 'vitest'

import { intencaoDeAtendimento, prioridadeDaRecusa, ticketTemContato } from './delivery-service-link'

// A ENTREGA REAL: id, order_id, destino, status, entregador, comprovante, tenant_id.
// NAO tem telefone, NAO tem motivo, NAO tem valor - e o r141 descobriu isso ao montar.
const ENTREGA = { entrega_id: 'e1', order_id: 'v1', destino: 'Rua A, 100', tenant_id: 'local' }

describe('so a RECUSA abre ticket', () => {
  it('pendente, em_rota e entregue NAO abrem — o caminho normal nao e problema', () => {
    for (const status of ['pendente', 'em_rota', 'entregue']) {
      expect(intencaoDeAtendimento(status, null, ENTREGA)).toEqual({ motivo: 'status_normal', tipo: 'nada' })
    }
  })

  it('recusada abre', () => {
    expect(intencaoDeAtendimento('recusada', 'em_rota', ENTREGA).tipo).toBe('abrir_ticket')
  })

  it('e a MESMA recusa vista duas vezes nao abre dois tickets', () => {
    // `recusada -> recusada` nao e um fato novo: o segundo ticket faria a fila crescer sem que nada acontecesse.
    expect(intencaoDeAtendimento('recusada', 'recusada', ENTREGA)).toEqual({ motivo: 'status_normal', tipo: 'nada' })
  })
})

describe('a prioridade vem do que a entrega SABE', () => {
  it('destino vazio e URGENTE — sem endereco nao ha como reagendar', () => {
    // Um segundo despacho para o mesmo endereco vazio falharia igual. A fila precisa de alguem ligando.
    expect(prioridadeDaRecusa(null)).toBe('urgente')
    expect(prioridadeDaRecusa('   ')).toBe('urgente')
    expect(prioridadeDaRecusa(undefined)).toBe('urgente')
  })

  it('destino conhecido e MEDIA — da para reagendar', () => {
    expect(prioridadeDaRecusa('Rua A, 100')).toBe('media')
  })

  it('o ticket carrega a prioridade calculada', () => {
    const r = intencaoDeAtendimento('recusada', 'em_rota', { ...ENTREGA, destino: null })

    if (r.tipo !== 'abrir_ticket') throw new Error('esperava ticket')

    expect(r.prioridade).toBe('urgente')
  })
})

describe('o ticket aponta para o PEDIDO — a porta ate o cliente', () => {
  it('carrega o order_id, porque a entrega nao tem telefone', () => {
    const r = intencaoDeAtendimento('recusada', 'em_rota', ENTREGA)

    if (r.tipo !== 'abrir_ticket') throw new Error('esperava ticket')

    expect(r.order_id).toBe('v1')
    expect(r.descricao).toContain('v1')
  })

  it('e a descricao manda ABRIR O PEDIDO — nao deixa a fila parada', () => {
    const r = intencaoDeAtendimento('recusada', 'em_rota', ENTREGA)

    if (r.tipo !== 'abrir_ticket') throw new Error('esperava ticket')

    expect(r.descricao).toContain('Abrir o pedido')
  })

  it('sem destino, a descricao manda LIGAR', () => {
    const r = intencaoDeAtendimento('recusada', 'em_rota', { ...ENTREGA, destino: null })

    if (r.tipo !== 'abrir_ticket') throw new Error('esperava ticket')

    expect(r.descricao).toContain('ligar')
  })
})

describe('o ticket nao culpa ninguem', () => {
  it('o assunto e o FATO, nao um julgamento', () => {
    const r = intencaoDeAtendimento('recusada', 'em_rota', ENTREGA)

    if (r.tipo !== 'abrir_ticket') throw new Error('esperava ticket')

    // "O motorista errou" fecharia a investigacao antes de ela comecar.
    expect(r.assunto).toBe('Entrega recusada')
  })
})

describe('o ticket NAO chega ao cliente sozinho', () => {
  it('ticketTemContato e false hoje — a entrega nao carrega telefone', () => {
    // Existe para a tela poder dizer "abra o pedido para achar o contato" em vez de mostrar campo vazio.
    expect(ticketTemContato(ENTREGA)).toBe(false)
  })
})

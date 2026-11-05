// A ligacao entrega -> atendimento (r140 do GOAL V2).

import { describe, expect, it } from 'vitest'

import {
  LIMITE_ALTA_CENTS,
  LIMITE_URGENTE_CENTS,
  intencaoDeAtendimento,
  prioridadeDaRecusa,
  recusaTemDono
} from './delivery-service-link'

const ENTREGA = { entrega_id: 'e1', contact_phone: '+5511999990009', tenant_id: 'local', total_cents: 15000 }

describe('so a RECUSA abre ticket', () => {
  it('pendente, em_rota e entregue NAO abrem — o caminho normal nao e problema', () => {
    for (const status of ['pendente', 'em_rota', 'entregue']) {
      expect(intencaoDeAtendimento(status, null, ENTREGA)).toEqual({ motivo: 'status_normal', tipo: 'nada' })
    }
  })

  it('recusada abre', () => {
    const r = intencaoDeAtendimento('recusada', 'em_rota', ENTREGA)

    expect(r.tipo).toBe('abrir_ticket')
  })

  it('e a MESMA recusa vista duas vezes nao abre dois tickets', () => {
    // `recusada -> recusada` nao e um fato novo: e a mesma recusa. O segundo ticket faria a fila crescer sem
    // que nada tivesse acontecido.
    const r = intencaoDeAtendimento('recusada', 'recusada', ENTREGA)

    expect(r).toEqual({ motivo: 'status_normal', tipo: 'nada' })
  })
})

describe('a prioridade vem do VALOR, nao do gosto', () => {
  it('os tres cortes', () => {
    expect(prioridadeDaRecusa(20_00)).toBe('baixa')
    expect(prioridadeDaRecusa(LIMITE_ALTA_CENTS)).toBe('alta')
    expect(prioridadeDaRecusa(LIMITE_URGENTE_CENTS)).toBe('urgente')
  })

  it('valor ausente vira MEDIA — nem baixa por acaso, nem urgente por medo', () => {
    expect(prioridadeDaRecusa(null)).toBe('media')
    expect(prioridadeDaRecusa(undefined)).toBe('media')
  })

  it('o ticket carrega a prioridade calculada', () => {
    const r = intencaoDeAtendimento('recusada', 'em_rota', { ...ENTREGA, total_cents: 300_000 })

    if (r.tipo !== 'abrir_ticket') throw new Error('esperava ticket')

    expect(r.prioridade).toBe('urgente')
  })
})

describe('o ticket diz O QUE FAZER — e nao culpa ninguem', () => {
  it('com motivo, a descricao o repete e manda confirmar', () => {
    const r = intencaoDeAtendimento('recusada', 'em_rota', { ...ENTREGA, motivo: 'cliente nao estava' })

    if (r.tipo !== 'abrir_ticket') throw new Error('esperava ticket')

    expect(r.descricao).toContain('cliente nao estava')
    expect(r.descricao).toContain('Confirmar')
  })

  it('sem motivo, a descricao manda LIGAR — nao deixa a fila parada', () => {
    const r = intencaoDeAtendimento('recusada', 'em_rota', { ...ENTREGA, motivo: null })

    if (r.tipo !== 'abrir_ticket') throw new Error('esperava ticket')

    expect(r.descricao).toContain('Ligar')
  })

  it('o assunto e o FATO, nao um julgamento', () => {
    const r = intencaoDeAtendimento('recusada', 'em_rota', ENTREGA)

    if (r.tipo !== 'abrir_ticket') throw new Error('esperava ticket')

    // "O motorista errou" fecharia a investigacao antes de ela comecar.
    expect(r.assunto).toBe('Entrega recusada')
  })
})

describe('a recusa sem telefone e dita', () => {
  it('recusaTemDono responde o que o canal precisa saber', () => {
    expect(recusaTemDono(ENTREGA)).toBe(true)
    expect(recusaTemDono({ ...ENTREGA, contact_phone: null })).toBe(false)
    expect(recusaTemDono({ ...ENTREGA, contact_phone: '  ' })).toBe(false)
  })

  it('o ticket sem telefone nasce SOLTO — e o campo diz isso em vez de fingir', () => {
    const r = intencaoDeAtendimento('recusada', 'em_rota', { ...ENTREGA, contact_phone: null })

    if (r.tipo !== 'abrir_ticket') throw new Error('esperava ticket')

    expect(r.contact_phone).toBeNull()
  })
})

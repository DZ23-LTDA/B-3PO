// A ligacao atendimento -> pos-venda (r151 do GOAL V2).

import { describe, expect, it } from 'vitest'

import { SATISFACAO_BAIXA_MAX, intencaoDePosVenda, notaDoFollowUp } from './service-aftersales-link'

const TICKET = {
  closed_at: 1_700_000_000_000,
  contact_phone: '+55 11 99999-0009',
  satisfaction: 1,
  tenant_id: 'local',
  ticket_id: 't1'
}

describe('so satisfacao BAIXA abre follow-up', () => {
  it('nota 5 e um cliente satisfeito — procura-lo e ruido', () => {
    expect(intencaoDePosVenda({ ...TICKET, satisfaction: 5 })).toEqual({ motivo: 'satisfacao_boa', tipo: 'nada' })
  })

  it('nota 3 e neutra — o atendimento ja pode ter resolvido', () => {
    expect(intencaoDePosVenda({ ...TICKET, satisfaction: 3 }).tipo).toBe('nada')
  })

  it('nota 1 e 2 abrem', () => {
    for (const nota of [1, 2]) {
      expect(intencaoDePosVenda({ ...TICKET, satisfaction: nota }).tipo).toBe('criar')
    }
  })

  it('o corte e 2 — o MESMO numero que o atendimento usa para escalar', () => {
    // Duas regras com cortes diferentes para a mesma pergunta fariam o produto discordar de si mesmo.
    expect(SATISFACAO_BAIXA_MAX).toBe(2)
  })

  it('ticket sem avaliacao nao gera follow-up', () => {
    expect(intencaoDePosVenda({ ...TICKET, satisfaction: null })).toEqual({ motivo: 'sem_satisfacao', tipo: 'nada' })
  })
})

describe('o prazo vem da data do ATENDIMENTO, nao da venda', () => {
  it('baseEm e o closed_at — a data que a satisfacao mede', () => {
    const r = intencaoDePosVenda(TICKET)

    if (r.tipo !== 'criar') throw new Error('esperava criar')

    expect(r.baseEm).toBe(1_700_000_000_000)
  })

  it('sem closed_at, usa agora — nao inventa uma data', () => {
    const r = intencaoDePosVenda({ ...TICKET, closed_at: null })

    if (r.tipo !== 'criar') throw new Error('esperava criar')

    expect(r.baseEm).toBeGreaterThan(0)
  })
})

describe('o ref e o TICKET, nao a venda', () => {
  it('`ticket:t1` — nao colide com o follow-up de recompra da mesma venda', () => {
    const r = intencaoDePosVenda(TICKET)

    if (r.tipo !== 'criar') throw new Error('esperava criar')

    // Se fosse `venda:<id>`, uma reclamacao de uma venda que ja tem follow-up de recompra COLIDIRIA com ele — e
    // nao criaria nada. A r146 descobriu que `ref` e a chave de idempotencia.
    expect(r.origem).toBe('ticket:t1')
  })
})

describe('sem telefone nao cria — uma tarefa que ninguem executa', () => {
  it('telefone curto ou vazio vira nada', () => {
    expect(intencaoDePosVenda({ ...TICKET, contact_phone: '' })).toEqual({ motivo: 'sem_telefone', tipo: 'nada' })
    expect(intencaoDePosVenda({ ...TICKET, contact_phone: '123' }).tipo).toBe('nada')
  })

  it('e o telefone vai so com digitos — a chave do contato', () => {
    const r = intencaoDePosVenda(TICKET)

    if (r.tipo !== 'criar') throw new Error('esperava criar')

    expect(r.contact_phone).toBe('5511999990009')
  })
})

describe('a nota DIZ por que o follow-up existe', () => {
  it('nota 1 e nota 2 pedem abordagens diferentes', () => {
    const um = intencaoDePosVenda({ ...TICKET, satisfaction: 1 })
    const dois = intencaoDePosVenda({ ...TICKET, satisfaction: 2 })

    if (um.tipo !== 'criar' || dois.tipo !== 'criar') throw new Error('esperava criar')

    // Um `satisfacao` sem a nota obriga a abrir o ticket para saber se foi 1 ou 2.
    expect(notaDoFollowUp(um)).toContain('nota 1')
    expect(notaDoFollowUp(dois)).toContain('nota 2')
  })
})

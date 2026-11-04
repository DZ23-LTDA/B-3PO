// Movimento de caixa (rodada 120).
//
// O que estes testes travam: só dinheiro entra na gaveta, sangria subtrai e suprimento soma, e a diferença
// da conferência tem SINAL — para a tela poder dizer "faltam" e não "diferença".

import { describe, expect, it } from 'vitest'

import { conferirGaveta, isMovimentoKind, saldoDaGaveta, type MovimentoCaixa } from './pdv-movimento'
import type { Sale } from './sales-store'

const DIA = 86_400_000
const BASE = 1_700_000_000_000
const PERIODO = { ate: BASE + DIA, de: BASE }

function venda(over: Partial<Sale> = {}): Sale {
  return {
    contact_phone: '',
    created_at: BASE + 1000,
    currency: 'BRL',
    id: 'v1',
    items: [{ description: 'X', discount_cents: 0, product_sku: 'X', quantity_milli: 1000, total_cents: 10000, unit_price_cents: 10000 }],
    notes: '',
    number: 1,
    payment_method: 'dinheiro',
    status: 'faturado',
    tenant_id: 'local',
    total_cents: 10000,
    updated_at: BASE + 1000,
    ...over
  } as Sale
}

function movimento(over: Partial<MovimentoCaixa> = {}): MovimentoCaixa {
  return {
    amount_cents: 5000,
    created_at: BASE + 2000,
    id: 'm1',
    kind: 'suprimento',
    motivo: 'troco inicial',
    tenant_id: 'local',
    ...over
  }
}

describe('isMovimentoKind', () => {
  it('aceita sangria e suprimento, recusa o resto', () => {
    expect(isMovimentoKind('sangria')).toBe(true)
    expect(isMovimentoKind('suprimento')).toBe(true)
    expect(isMovimentoKind('deposito')).toBe(false)
    expect(isMovimentoKind(null)).toBe(false)
  })
})

describe('saldoDaGaveta', () => {
  it('só dinheiro conta: PIX e cartao nao estao na gaveta', () => {
    const s = saldoDaGaveta(
      [
        venda({ id: 'a', payment_method: 'dinheiro', total_cents: 10000 }),
        venda({ id: 'b', payment_method: 'pix', total_cents: 90000 }),
        venda({ id: 'c', payment_method: 'credito', total_cents: 80000 })
      ],
      [],
      PERIODO
    )

    expect(s.dinheiro_vendas_cents).toBe(10000)
    expect(s.esperado_cents).toBe(10000)
  })

  it('suprimento soma e sangria subtrai', () => {
    const s = saldoDaGaveta(
      [venda({ total_cents: 10000 })],
      [movimento({ amount_cents: 5000, id: 'm1', kind: 'suprimento' }), movimento({ amount_cents: 3000, id: 'm2', kind: 'sangria' })],
      PERIODO
    )

    expect(s.suprimentos_cents).toBe(5000)
    expect(s.sangrias_cents).toBe(3000)
    // 100 (venda) + 50 (troco) - 30 (sangria) = 120
    expect(s.esperado_cents).toBe(12000)
    expect(s.movimentos).toBe(2)
  })

  it('so faturada conta', () => {
    const s = saldoDaGaveta(
      [venda({ id: 'a' }), venda({ id: 'b', status: 'orcamento', total_cents: 99000 }), venda({ id: 'c', status: 'cancelado', total_cents: 77000 })],
      [],
      PERIODO
    )

    expect(s.dinheiro_vendas_cents).toBe(10000)
  })

  it('conta as vendas sem forma e NAO as soma no esperado', () => {
    // Nao se sabe se foram em dinheiro. Mas o numero aparece: se for alto, o esperado esta subestimado e o
    // operador precisa saber antes de culpar a contagem.
    const s = saldoDaGaveta([venda({ id: 'a', total_cents: 10000 }), venda({ id: 'b', payment_method: undefined, total_cents: 5000 })], [], PERIODO)

    expect(s.vendas_sem_forma).toBe(1)
    expect(s.esperado_cents).toBe(10000)
  })

  it('recorta movimento por created_at: sangria de ontem nao entra hoje', () => {
    const s = saldoDaGaveta(
      [venda()],
      [movimento({ created_at: BASE - 5 * DIA, id: 'ontem', kind: 'sangria' })],
      PERIODO
    )

    expect(s.sangrias_cents).toBe(0)
    expect(s.movimentos).toBe(0)
  })

  it('gaveta vazia: zero, nao null', () => {
    const s = saldoDaGaveta([], [], PERIODO)

    expect(s.esperado_cents).toBe(0)
    expect(s.vendas_sem_forma).toBe(0)
    expect(s.movimentos).toBe(0)
  })

  it('sangria maior que as vendas deixa o esperado negativo', () => {
    // Acontece de verdade: o operador tira o dinheiro antes do fechamento. Negativo e informacao, nao erro.
    const s = saldoDaGaveta([venda({ total_cents: 1000 })], [movimento({ amount_cents: 9000, kind: 'sangria' })], PERIODO)

    expect(s.esperado_cents).toBe(-8000)
  })
})

describe('conferirGaveta', () => {
  it('bate exatamente', () => {
    const c = conferirGaveta(12000, 12000)

    expect(c).toEqual({ diferenca_cents: 0, fecha: true, situacao: 'exato' })
  })

  it('falta dinheiro: diferenca negativa', () => {
    const c = conferirGaveta(10000, 12000)

    expect(c.diferenca_cents).toBe(-2000)
    expect(c.situacao).toBe('falta')
    expect(c.fecha).toBe(false)
  })

  it('sobra dinheiro: diferenca positiva', () => {
    const c = conferirGaveta(12000, 10000)

    expect(c.diferenca_cents).toBe(2000)
    expect(c.situacao).toBe('sobra')
  })

  it('devolve o SINAL, nao o modulo', () => {
    // Sem o sinal a tela nao consegue dizer "faltam" vs "sobram".
    expect(conferirGaveta(9000, 12000).diferenca_cents).toBeLessThan(0)
    expect(conferirGaveta(15000, 12000).diferenca_cents).toBeGreaterThan(0)
  })

  it('arredonda para o centavo inteiro', () => {
    const c = conferirGaveta(10000.4, 10000)

    expect(c.diferenca_cents).toBe(0)
    expect(Number.isInteger(c.diferenca_cents)).toBe(true)
  })
})

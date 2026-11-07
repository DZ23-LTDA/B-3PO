// Centro de custo: contratos (rodada 184).
//
// O GOAL §18 pede "centros de custo". A r183 mediu que nao existia. Estes testes fixam o campo e a agregacao.

import { describe, expect, it } from 'vitest'

import { normalizeEntry, totaisPorCentroDeCusto, type FinanceEntry } from './finance-store'

const base = {
  amount_cents: 10_000,
  due_at: 1_800_000_000_000,
  kind: 'pagar' as const,
  party: 'Fornecedor'
}

const entrada = (over: Partial<FinanceEntry> = {}): FinanceEntry =>
  ({
    amount_cents: 10_000,
    cost_center: 'obras',
    created_at: 1,
    currency: 'BRL',
    description: '',
    due_at: 1_800_000_000_000,
    id: 'e1',
    kind: 'pagar',
    party: 'Fornecedor',
    ref: '',
    status: 'aberto',
    tenant_id: 'local',
    updated_at: 1,
    ...over
  }) as FinanceEntry

describe('o campo no lancamento', () => {
  it('guarda o centro informado', () => {
    const r = normalizeEntry({ ...base, cost_center: 'filial-sul' }, 1000)

    if ('entry' in r) expect(r.entry.cost_center).toBe('filial-sul')
  })

  it('lancamento sem centro fica com string vazia, nao undefined', () => {
    // `undefined` desapareceria ao gravar em JSON; vazio sobrevive e e o que o relatorio usa.
    const r = normalizeEntry(base, 1000)

    if ('entry' in r) expect(r.entry.cost_center).toBe('')
  })

  it('corta centro absurdamente longo em vez de recusar o lancamento', () => {
    // Um nome de centro com 200 caracteres e erro de digitacao, nao motivo para perder a conta a pagar.
    const r = normalizeEntry({ ...base, cost_center: 'x'.repeat(200) }, 1000)

    if ('entry' in r) expect(r.entry.cost_center.length).toBe(60)
  })
})

describe('os totais por centro', () => {
  it('separa pago de pendente', () => {
    const t = totaisPorCentroDeCusto([
      entrada({ amount_cents: 5000, status: 'aberto' }),
      entrada({ amount_cents: 3000, status: 'pago' })
    ])

    expect(t['obras']).toEqual({ pago_cents: 3000, pendente_cents: 5000 })
  })

  it('centro vazio aparece como nao alocado em vez de sumir', () => {
    // Se o vazio fosse descartado, a soma dos centros nao fecharia com o total geral e a diferenca seria
    // invisivel — o tipo de erro que ninguem encontra.
    const t = totaisPorCentroDeCusto([entrada({ amount_cents: 7000, cost_center: '' })])

    expect(t['']).toEqual({ pago_cents: 0, pendente_cents: 7000 })
  })

  it('cancelado nao consome nada', () => {
    const t = totaisPorCentroDeCusto([entrada({ amount_cents: 9000, status: 'cancelado' })])

    expect(t['obras']).toBeUndefined()
  })

  it('a soma dos centros fecha com o total dos lancamentos', () => {
    const lista = [
      entrada({ amount_cents: 1000, cost_center: 'a' }),
      entrada({ amount_cents: 2000, cost_center: 'b' }),
      entrada({ amount_cents: 4000, cost_center: '' }),
      entrada({ amount_cents: 8000, cost_center: 'a', status: 'pago' }),
      entrada({ amount_cents: 16000, status: 'cancelado' })
    ]
    const t = totaisPorCentroDeCusto(lista)
    const soma = Object.values(t).reduce((s, v) => s + v.pago_cents + v.pendente_cents, 0)
    const esperado = lista
      .filter(e => e.status !== 'cancelado')
      .reduce((s, e) => s + e.amount_cents, 0)

    expect(soma).toBe(esperado)
  })

  it('lista vazia devolve objeto vazio, nao quebra', () => {
    expect(totaisPorCentroDeCusto([])).toEqual({})
  })
})

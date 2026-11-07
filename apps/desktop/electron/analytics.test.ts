import { describe, expect, it } from 'vitest'

import { alertsFor, buildSnapshot, type RawData, type SnapshotSale } from './analytics'
import { dueAtFor, type FollowUp } from './after-sales-store'

const T0 = 1_700_000_000_000

const venda = (over: Partial<SnapshotSale> = {}): SnapshotSale => ({
  id: 'v1',
  status: 'faturado',
  tenant_id: 'local',
  total_cents: 10_000,
  ...over
})

const followUp = (over: Partial<FollowUp> = {}): FollowUp => ({
  contact_phone: '',
  created_at: T0,
  due_at: dueAtFor(T0, 'satisfacao'),
  id: 'fu_1',
  kind: 'satisfacao',
  notes: '',
  ref: 'venda:v1:satisfacao',
  sale_at: T0,
  status: 'pendente',
  tenant_id: 'local',
  updated_at: T0,
  ...over
})

const vazio = (): RawData => ({
  afterSales: [],
  desk: { atrasados: 0, pendentes: 0, satisfacaoMedia: null },
  finance: { aPagarCents: 0, aReceberCents: 0 },
  inventory: {},
  marketing: { campaigns: [], posts: [], schema_version: 1 },
  sales: [],
  tenantId: 'local'
})

describe('consolidacao', () => {
  it('conta so venda FATURADA no total — orcamento nao e receita', () => {
    const raw = {
      ...vazio(),
      sales: [venda(), venda({ id: 'v2', status: 'orcamento', total_cents: 99_999 })]
    }

    const s = buildSnapshot(raw, T0)

    expect(s.sales.faturadas).toBe(1)
    expect(s.sales.totalCents).toBe(10_000)
  })

  it('isola por tenant: venda de outro tenant nao entra', () => {
    const raw = { ...vazio(), sales: [venda(), venda({ id: 'v2', tenant_id: 'outro', total_cents: 500 })] }

    expect(buildSnapshot(raw, T0).sales.totalCents).toBe(10_000)
  })

  it('saldo financeiro e derivado das parcelas, com sinal', () => {
    const raw = { ...vazio(), finance: { aPagarCents: 30_000, aReceberCents: 50_000 } }

    expect(buildSnapshot(raw, T0).finance.saldoCents).toBe(20_000)

    const negativo = buildSnapshot({ ...raw, finance: { aPagarCents: 60_000, aReceberCents: 10_000 } }, T0)

    expect(negativo.finance.saldoCents).toBe(-50_000)
  })

  it('estoque separa com saldo de zerado, incluindo negativo', () => {
    const raw = { ...vazio(), inventory: { A: 10, B: 0, C: -5 } }
    const s = buildSnapshot(raw, T0)

    // Negativo conta como zerado: nao ha o que vender, e o numero tem de refletir isso.
    expect(s.inventory).toEqual({ comSaldo: 1, zerados: 2 })
  })

  it('snapshot vazio nao inventa numero', () => {
    const s = buildSnapshot(vazio(), T0)

    expect(s.sales.faturadas).toBe(0)
    expect(s.sales.totalCents).toBe(0)
    expect(s.finance.saldoCents).toBe(0)
    expect(s.desk.satisfacaoMedia).toBeNull()
    expect(alertsFor(s)).toEqual([])
  })
})

describe('alertas', () => {
  it('caixa negativo vem primeiro', () => {
    const raw = {
      ...vazio(),
      desk: { atrasados: 2, pendentes: 5, satisfacaoMedia: null },
      finance: { aPagarCents: 100, aReceberCents: 0 }
    }

    expect(alertsFor(buildSnapshot(raw, T0))[0]!.domain).toBe('finance')
  })

  it('nenhum alerta quando nao ha nada fora do lugar', () => {
    expect(alertsFor(buildSnapshot(vazio(), T0))).toEqual([])
  })

  it('venda faturada sem acompanhamento gera alerta de pos-venda', () => {
    // Uma venda faturada e zero follow-ups: o buraco.
    const s = buildSnapshot({ ...vazio(), sales: [venda()] }, T0)
    const alertas = alertsFor(s)

    expect(alertas.some(a => a.domain === 'sales')).toBe(true)
  })

  it('venda faturada COM acompanhamento nao gera esse alerta', () => {
    const s = buildSnapshot({ ...vazio(), afterSales: [followUp()], sales: [venda()] }, T0)

    expect(alertsFor(s).some(a => a.domain === 'sales')).toBe(false)
  })

  it('estoque zerado alerta e separa do que tem saldo', () => {
    const alertas = alertsFor(buildSnapshot({ ...vazio(), inventory: { A: 5, B: 0 } }, T0))

    expect(alertas.some(a => a.domain === 'inventory')).toBe(true)
  })
})

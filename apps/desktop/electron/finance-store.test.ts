import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_TENANT } from './catalog-store'
import {
  FinanceStore,
  financeStorePath,
  isKind,
  isStatus,
  normalizeEntry,
  parseFinance,
  receivableForSale,
  totals
} from './finance-store'
import { normalizeSale } from './sales-store'

async function withStore<T>(run: (store: FinanceStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-finance-'))

  try {
    return await run(new FinanceStore(financeStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const VENC = 1000

const lancamento = (over: Record<string, unknown> = {}) => ({
  amount: 100,
  due_at: VENC,
  kind: 'receber',
  ...over
})

describe('financeiro: lançamento', () => {
  it('exige tipo, valor positivo e vencimento', () => {
    expect(normalizeEntry(lancamento({ kind: 'transferencia' }), 1)).toEqual({ error: 'kind_invalid' })
    expect(normalizeEntry(lancamento({ amount: 0 }), 1)).toEqual({ error: 'amount_required' })
    expect(normalizeEntry(lancamento({ amount: -5 }), 1)).toEqual({ error: 'amount_required' })
    expect(normalizeEntry(lancamento({ due_at: 0 }), 1)).toEqual({ error: 'due_at_required' })
    expect(normalizeEntry(lancamento({ due_at: 'amanha' }), 1)).toEqual({ error: 'due_at_required' })
    expect(normalizeEntry(lancamento(), 1)).toHaveProperty('entry')
  })

  it('normaliza valor em formato pt-BR e assume status aberto', () => {
    const criado = normalizeEntry(lancamento({ amount: '1.234,56' }), 1)

    expect('entry' in criado && criado.entry.amount_cents).toBe(123456)
    expect('entry' in criado && criado.entry.status).toBe('aberto')
  })
})

describe('financeiro: totais derivados', () => {
  it('separa aberto e pago por tipo, e conta vencido', async () => {
    await withStore(async store => {
      // Datas relativas: `store.totals()` compara com o agora real, não com um instante fixo.
      const ontem = Date.now() - 86_400_000
      const amanha = Date.now() + 86_400_000

      await store.append(lancamento({ amount: 100, due_at: ontem }))
      await store.append(lancamento({ amount: 50, due_at: amanha }))
      await store.append(lancamento({ kind: 'pagar', amount: 30, due_at: ontem }))

      const pago = await store.append(lancamento({ amount: 25, due_at: amanha }))

      expect('entry' in pago).toBe(true)
      if (!('entry' in pago)) return

      await store.settle(pago.entry.id, DEFAULT_TENANT, Date.now())

      // Vencido: os dois de `ontem` (100 a receber + 30 a pagar). Valores em centavos.
      expect(await store.totals()).toEqual({
        openPayableCents: 30,
        openReceivableCents: 150,
        overdueCents: 130,
        paidPayableCents: 0,
        paidReceivableCents: 25
      })
    })
  })

  it('lançamento cancelado não entra em nenhum total', () => {
    const base = {
      amount_cents: 100,
      cost_center: '',
      created_at: 1,
      currency: 'BRL',
      description: '',
      due_at: 500,
      id: 'f1',
      kind: 'receber' as const,
      party: '',
      ref: '',
      status: 'cancelado' as const,
      tenant_id: DEFAULT_TENANT,
      updated_at: 1
    }

    expect(totals([base], DEFAULT_TENANT, 1000)).toEqual({
      openPayableCents: 0,
      openReceivableCents: 0,
      overdueCents: 0,
      paidPayableCents: 0,
      paidReceivableCents: 0
    })
  })
})

describe('financeiro: ciclo de vida', () => {
  it('deduplica por ref: a mesma venda não cria duas contas a receber', async () => {
    await withStore(async store => {
      const primeiro = await store.append(lancamento({ ref: 'venda:1' }))
      const repetido = await store.append(lancamento({ ref: 'venda:1' }))

      expect('entry' in primeiro).toBe(true)
      expect(repetido).toEqual({ error: 'ref_duplicado' })
      expect(await store.list()).toHaveLength(1)
    })
  })

  it('pagar é final: não paga duas vezes e não altera o valor depois', async () => {
    await withStore(async store => {
      const criado = await store.append(lancamento({ amount: 100 }))

      expect('entry' in criado).toBe(true)
      if (!('entry' in criado)) return

      const id = criado.entry.id

      expect('entries' in (await store.settle(id))).toBe(true)
      expect(await store.settle(id)).toEqual({ error: 'lancamento_ja_pago' })
      expect(await store.append({ ...lancamento({ amount: 999 }), id })).toEqual({ error: 'lancamento_pago_imutavel' })
    })
  })

  it('não encontra lançamento de outra empresa', async () => {
    await withStore(async store => {
      const criado = await store.append(lancamento({ tenant_id: 'empresa-a' }))

      expect('entry' in criado).toBe(true)
      if (!('entry' in criado)) return

      expect(await store.settle(criado.entry.id, 'empresa-b')).toEqual({ error: 'lancamento_nao_encontrado' })
      expect(await store.list('empresa-b')).toHaveLength(0)
    })
  })

  it('trata arquivo corrompido como vazio', () => {
    expect(parseFinance('nao e json')).toEqual({ entries: [], schema_version: 1 })
    expect(isKind('receber')).toBe(true)
    expect(isKind('outro')).toBe(false)
    expect(isStatus('pago')).toBe(true)
  })
})

describe('financeiro: venda vira receita', () => {
  it('só venda faturada gera conta a receber, com ref determinística', () => {
    const orcamento = normalizeSale({ items: [{ product_sku: 'X', quantity: 1, unit_price_cents: 1000 }] }, 1)

    expect('sale' in orcamento).toBe(true)
    if (!('sale' in orcamento)) return

    expect(receivableForSale({ ...orcamento.sale, number: 1 })).toBeNull()

    const faturada = normalizeSale(
      { items: [{ product_sku: 'X', quantity: 2, unit_price_cents: 1000 }], status: 'faturado' },
      1
    )

    expect('sale' in faturada).toBe(true)
    if (!('sale' in faturada)) return

    const sale = { ...faturada.sale, number: 3 }
    const lancamentoGerado = receivableForSale(sale, 5000)

    expect(lancamentoGerado).toMatchObject({
      amount_cents: 2000,
      cost_center: '',
      kind: 'receber',
      description: 'Venda 3',
      ref: `venda:${sale.id}`,
      status: 'aberto',
      due_at: 5000
    })
    // A ref é determinística: faturar de novo não cria segunda receita.
    expect(receivableForSale(sale, 5000)?.ref).toBe(lancamentoGerado!.ref)
  })

  it('venda faturada de valor zero não gera lançamento', () => {
    const venda = normalizeSale(
      { items: [{ product_sku: 'X', quantity: 1, unit_price_cents: 0 }], status: 'faturado' },
      1
    )

    expect('sale' in venda).toBe(true)
    if (!('sale' in venda)) return

    expect(receivableForSale({ ...venda.sale, number: 1 })).toBeNull()
  })
})

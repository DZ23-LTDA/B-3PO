import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  AfterSalesStore,
  afterSalesStorePath,
  dueAtFor,
  followUpsFor,
  indicators,
  isOverdue,
  KIND_DAYS,
  normalizeFollowUp,
  parseAfterSales,
  type FollowUp
} from './after-sales-store'

async function withStore<T>(run: (store: AfterSalesStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-aftersales-'))

  try {
    return await run(new AfterSalesStore(afterSalesStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const VENDA = 1_700_000_000_000

const fu = (over: Partial<FollowUp> = {}): FollowUp => ({
  contact_phone: '',
  created_at: VENDA,
  due_at: dueAtFor(VENDA, 'satisfacao'),
  id: 'fu_1',
  kind: 'satisfacao',
  notes: '',
  ref: 'venda:v1:satisfacao',
  sale_at: VENDA,
  status: 'pendente',
  tenant_id: 'local',
  updated_at: VENDA,
  ...over
})

describe('prazo derivado do tipo', () => {
  it('satisfacao pergunta cedo; recompra espera; fidelizacao espera mais', () => {
    expect(KIND_DAYS.satisfacao).toBeLessThan(KIND_DAYS.recompra)
    expect(KIND_DAYS.recompra).toBeLessThan(KIND_DAYS.fidelizacao)
    expect(dueAtFor(VENDA, 'satisfacao')).toBe(VENDA + 2 * 86_400_000)
    expect(dueAtFor(VENDA, 'recompra')).toBe(VENDA + 30 * 86_400_000)
  })

  it('atraso e derivado do relogio e so vale enquanto pendente', () => {
    const t = fu({ due_at: VENDA + 1000 })

    expect(isOverdue(t, VENDA)).toBe(false)
    expect(isOverdue(t, VENDA + 2000)).toBe(true)
    expect(isOverdue({ ...t, status: 'feito' }, VENDA + 2000)).toBe(false)
  })
})

describe('normalizacao', () => {
  it('exige a venda de origem', () => {
    expect(normalizeFollowUp({ sale_at: VENDA }, 1)).toEqual({ error: 'sale_required' })
  })

  it('exige quando a venda aconteceu', () => {
    expect(normalizeFollowUp({ sale_id: 'v1' }, 1)).toEqual({ error: 'sale_at_required' })
  })

  it('deriva o ref e IGNORA due_at informado', () => {
    const r = normalizeFollowUp({ due_at: VENDA + 9_999_999, kind: 'recompra', sale_at: VENDA, sale_id: 'v9' }, 1)

    expect('followUp' in r && r.followUp.ref).toBe('venda:v9:recompra')
    expect('followUp' in r && r.followUp.due_at).toBe(dueAtFor(VENDA, 'recompra'))
  })

  it('tipo desconhecido cai em satisfacao em vez de virar dado invalido', () => {
    const r = normalizeFollowUp({ kind: 'inventado', sale_at: VENDA, sale_id: 'v1' }, 1)

    expect('followUp' in r && r.followUp.kind).toBe('satisfacao')
  })
})

describe('store', () => {
  it('cria e lista pendentes por vencimento', async () => {
    await withStore(async store => {
      await store.create({ kind: 'fidelizacao', sale_at: VENDA, sale_id: 'v1' })
      await store.create({ kind: 'satisfacao', sale_at: VENDA, sale_id: 'v2' })

      expect((await store.list()).map(f => f.kind)[0]).toBe('satisfacao')
    })
  })

  it('NAO duplica o mesmo acompanhamento para a mesma venda e tipo', async () => {
    await withStore(async store => {
      await store.create({ sale_at: VENDA, sale_id: 'v1' })

      expect(await store.create({ sale_at: VENDA, sale_id: 'v1' })).toEqual({ error: 'acompanhamento_duplicado' })
    })
  })

  it('aceita tipos diferentes para a mesma venda', async () => {
    await withStore(async store => {
      await store.create({ kind: 'satisfacao', sale_at: VENDA, sale_id: 'v1' })
      await store.create({ kind: 'recompra', sale_at: VENDA, sale_id: 'v1' })

      expect(await store.list()).toHaveLength(2)
    })
  })

  it('marca como feito e some da lista de pendentes', async () => {
    await withStore(async store => {
      const r = await store.create({ sale_at: VENDA, sale_id: 'v1' })
      if (!('followUp' in r)) return

      await store.setStatus(r.followUp.id, 'feito')
      expect(await store.list()).toHaveLength(0)
    })
  })

  it('setStatus de id inexistente reporta', async () => {
    await withStore(async store => {
      expect(await store.setStatus('nao-existe', 'feito')).toEqual({ error: 'acompanhamento_nao_encontrado' })
    })
  })
})

describe('indicadores', () => {
  it('semAcompanhamento conta venda faturada SEM follow-up pendente', () => {
    const sales = [
      { id: 'v1', status: 'faturado', tenant_id: 'local' },
      { id: 'v2', status: 'faturado', tenant_id: 'local' },
      { id: 'v3', status: 'orcamento', tenant_id: 'local' }
    ]
    const followUps = [fu({ ref: 'venda:v1:satisfacao' })]

    const r = indicators(followUps, sales, VENDA)

    // v1 tem acompanhamento; v2 nao; v3 nao esta faturada. Sobra v2.
    expect(r.semAcompanhamento).toBe(1)
    expect(r.pendentes).toBe(1)
  })

  it('conta atrasados só entre pendentes', () => {
    const followUps = [fu({ due_at: VENDA - 1 }), fu({ due_at: VENDA - 1, id: 'fu_2', ref: 'venda:v2:satisfacao', status: 'feito' })]

    expect(indicators(followUps, [], VENDA).atrasados).toBe(1)
  })

  it('followUpsFor ignora nao-pendentes e ordena por vencimento', () => {
    const lista = [fu({ due_at: VENDA + 500, id: 'b' }), fu({ due_at: VENDA + 100, id: 'a' }), fu({ id: 'c', status: 'descartado' })]

    expect(followUpsFor(lista).map(f => f.id)).toEqual(['a', 'b'])
  })

  it('arquivo corrompido vira vazio', () => {
    expect(parseAfterSales('nao e json')).toEqual({ follow_ups: [], schema_version: 1 })
  })
})

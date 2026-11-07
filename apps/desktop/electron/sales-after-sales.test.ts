// Pos-venda ligado ao faturamento (rodada 51).
//
// O dominio da rodada 50 existia e nada o alimentava. Estes testes provam a ligacao pelo caminho real:
// `registerSalesIpc` -> `faturar` -> follow-ups no disco.
//
// A invariante que mais importa: **a venda e o fato principal**. Se o pos-venda falhar, a venda NAO
// pode ser desfeita - um acompanhamento perdido e um problema; uma venda faturada que nao saiu do
// estoque e um problema pior.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AfterSalesStore, afterSalesStorePath } from './after-sales-store'
import { registerSalesIpc } from './sales-ipc'
import type { Actor } from './rbac'

const dono: Actor = { id: 'u1', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner', scopes: [] }

interface Canais {
  [canal: string]: (payload?: unknown) => Promise<any>
}

function registrar(deps: Parameters<typeof registerSalesIpc>[1]): Canais {
  const canais: Canais = {}
  // `ipcMain.handle` recebe (event, payload). Encapsular aqui evita que o teste passe o payload como
  // evento - erro que fiz na primeira versao e que devolvia `items_required` com o pedido correto.
  const ipc = {
    handle: (canal: string, fn: (e: unknown, p?: unknown) => Promise<any>) => {
      canais[canal] = (payload?: unknown) => fn(null, payload)
    }
  }

  registerSalesIpc(ipc as never, deps)

  return canais
}

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-sales-aftersales-'))
})

async function limpar() {
  await rm(dir, { force: true, recursive: true })
}

function deps(over: Record<string, unknown> = {}) {
  return {
    actorOf: async () => dono,
    finance: { append: async () => ({ entry: { id: 'f1' } }) },
    inventory: { append: async () => ({ balance: 0, movement: {} }), balances: async () => ({ CAF: 100_000 }) },
    sales: {
      create: async (input: any) => ({
        sale: { ...input, created_at: 1_700_000_000_000, id: 'v_faturada', status: 'faturado' },
        sales: []
      })
    },
    ...over
  } as unknown as Parameters<typeof registerSalesIpc>[1]
}

const PEDIDO = {
  contact_phone: '5511999998888',
  items: [{ product_sku: 'CAF', quantity_milli: 1000, unit_price_cents: 1000 }]
}

describe('faturar alimenta o pos-venda', () => {
  it('cria satisfacao E recompra, com o ref da venda', async () => {
    const afterSales = new AfterSalesStore(afterSalesStorePath(dir))
    const c = registrar(deps({ afterSales }))

    const r = await c['hermes:sales:faturar']!(PEDIDO)

    expect(r.error).toBeUndefined()

    const lista = await afterSales.list()

    expect(lista.map(f => f.kind).sort()).toEqual(['recompra', 'satisfacao'])
    expect(lista.every(f => f.ref.startsWith('venda:v_faturada:'))).toBe(true)
    expect(lista.every(f => f.contact_phone === '5511999998888')).toBe(true)

    await limpar()
  })

  it('refaturar NAO duplica: o ref segura a repeticao', async () => {
    const afterSales = new AfterSalesStore(afterSalesStorePath(dir))
    const c = registrar(deps({ afterSales }))

    await c['hermes:sales:faturar']!(PEDIDO)
    await c['hermes:sales:faturar']!(PEDIDO)

    expect(await afterSales.list()).toHaveLength(2)

    await limpar()
  })

  it('sem afterSales o faturamento continua funcionando', async () => {
    // O ERP nao pode quebrar porque o modulo de pos-venda nao foi montado.
    const c = registrar(deps())
    const r = await c['hermes:sales:faturar']!(PEDIDO)

    expect(r.error).toBeUndefined()
    expect(r.sale.id).toBe('v_faturada')

    await limpar()
  })

  it('pos-venda que falha NAO desfaz a venda nem devolve erro', async () => {
    const quebrado = {
      create: vi.fn(async () => {
        throw new Error('disco cheio')
      })
    }

    const c = registrar(deps({ afterSales: quebrado }))
    const r = await c['hermes:sales:faturar']!(PEDIDO)

    // A venda ja esta gravada e o estoque ja saiu. Devolver erro agora faria o operador achar que nao
    // faturou e tentar de novo. Acompanhamento perdido e degradacao; venda fantasma e prejuizo.
    expect(r.error).toBeUndefined()
    expect(r.sale.id).toBe('v_faturada')
    expect(quebrado.create).toHaveBeenCalled()

    await limpar()
  })

  it('venda recusada por saldo nao cria acompanhamento', async () => {
    const afterSales = new AfterSalesStore(afterSalesStorePath(dir))
    const c = registrar(
      deps({
        afterSales,
        inventory: { append: async () => ({ balance: 0, movement: {} }), balances: async () => ({ CAF: 0 }) }
      })
    )

    const r = await c['hermes:sales:faturar']!(PEDIDO)

    expect(r.error).toBe('saldo_insuficiente')
    expect(await afterSales.list()).toHaveLength(0)

    await limpar()
  })
})

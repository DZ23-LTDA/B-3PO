// Devolução de venda devolve estoque e estorna o recebível (rodada 102).
//
// Não existia: o GOAL pede "devolução" no item 16 e exige que integre com o estoque no item 14. O pós-venda
// só tinha satisfação, recompra e fidelização.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { FinanceStore, financeStorePath } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { registerSalesIpc } from './sales-ipc'
import { estornoForDevolucao } from './sales-return'
import { SalesStore, salesStorePath, type Sale } from './sales-store'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-devol-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const VENDA = {
  contact_phone: '5511999998888',
  items: [{ product_sku: 'SKU-1', quantity_milli: 3000, unit_price_cents: 1000 }],
  notes: '',
  total_cents: 3000
}

function venda(over: Partial<Sale> = {}): Sale {
  return {
    contact_phone: '5511999998888',
    created_at: 1,
    currency: 'BRL',
    id: 'v1',
    items: [{ product_sku: 'SKU-1', quantity_milli: 3000, unit_price_cents: 1000 }],
    notes: '',
    number: 1,
    status: 'faturado',
    tenant_id: 'local',
    total_cents: 3000,
    updated_at: 1,
    ...over
  } as Sale
}

describe('estornoForDevolucao (puro)', () => {
  it('so venda FATURADA pode ser devolvida', () => {
    expect(estornoForDevolucao(venda({ status: 'orcamento' }))).toEqual({ error: 'venda_nao_faturada' })
    expect(estornoForDevolucao(venda({ status: 'pedido' }))).toEqual({ error: 'venda_nao_faturada' })
    expect(estornoForDevolucao(venda({ status: 'cancelado' }))).toEqual({ error: 'venda_nao_faturada' })
    expect('estoque' in estornoForDevolucao(venda())).toBe(true)
  })

  it('o estoque volta como ENTRADA, com ref distinta da baixa', () => {
    const r = estornoForDevolucao(venda())

    if ('error' in r) throw new Error(r.error)

    expect(r.estoque).toHaveLength(1)
    expect(r.estoque[0]!.kind).toBe('entrada')
    expect(r.estoque[0]!.quantity_milli).toBe(3000)
    // A baixa usa `venda:v1:SKU-1`; esta precisa ser outra, senão o ledger deduplicaria e nada voltaria.
    expect(r.estoque[0]!.ref).toBe('venda:v1:devolucao:SKU-1')
    expect(r.estoque[0]!.ref).not.toBe('venda:v1:SKU-1')
  })

  it('o financeiro estorna o valor total como conta a pagar', () => {
    const r = estornoForDevolucao(venda())

    if ('error' in r) throw new Error(r.error)

    expect(r.financeiro?.kind).toBe('pagar')
    expect(r.financeiro?.amount_cents).toBe(3000)
    expect(r.financeiro?.ref).toBe('venda:v1:devolucao')
  })

  it('venda de valor zero nao gera estorno financeiro', () => {
    const r = estornoForDevolucao(venda({ total_cents: 0 }))

    if ('error' in r) throw new Error(r.error)

    expect(r.financeiro).toBeNull()
    expect(r.estoque).toHaveLength(1)
  })

  it('as refs sao deterministicas: a mesma venda gera o mesmo estorno', () => {
    const a = estornoForDevolucao(venda())
    const b = estornoForDevolucao(venda())

    expect(a).toEqual(b)
  })
})

describe('devolver pelo canal IPC', () => {
  function canais(sales: SalesStore, inventory: InventoryStore, finance: FinanceStore) {
    const mapa = new Map<string, (e: unknown, p?: unknown, t?: unknown, r?: unknown) => unknown>()

    registerSalesIpc(
      { handle: (c: string, l: (e: unknown, p?: unknown, t?: unknown, r?: unknown) => unknown) => mapa.set(c, l) } as never,
      {
        actorOf: async () => ({ id: 'actor_1', role: 'owner' }),
        finance,
        inventory,
        sales
      } as never
    )

    return mapa
  }

  it('devolver devolve ao estoque E estorna o recebivel', async () => {
    const sales = new SalesStore(salesStorePath(dir))
    const inventory = new InventoryStore(inventoryStorePath(dir))
    const finance = new FinanceStore(financeStorePath(dir))

    const ipc = canais(sales, inventory, finance)

    // Vende (baixa 3000) e fatura (gera a receber).
    const criada = (await sales.create({ ...VENDA, status: 'faturado' })) as { sale: Sale }

    await inventory.append({ kind: 'entrada', product_sku: 'SKU-1', quantity_milli: 10_000, reason: 'inicial', tenant_id: 'local' })
    await inventory.append({ kind: 'saida', product_sku: 'SKU-1', quantity_milli: 3000, reason: 'venda', ref: `venda:${criada.sale.id}:SKU-1`, tenant_id: 'local' })

    const antes = await inventory.balances()

    expect(antes['SKU-1']).toBe(7000)

    const r = (await ipc.get('hermes:sales:devolver')!(null, criada.sale.id)) as { stock: unknown[]; finance: { ref: string } | null }

    expect(r.stock).toHaveLength(1)
    expect(r.finance?.ref).toBe(`venda:${criada.sale.id}:devolucao`)

    // O estoque voltou.
    expect((await inventory.balances())['SKU-1']).toBe(10_000)
    // E a conta a pagar existe no arquivo.
    expect((await finance.list()).some(l => l.ref === `venda:${criada.sale.id}:devolucao`)).toBe(true)
  })

  it('devolver duas vezes nao devolve o estoque duas vezes', async () => {
    const sales = new SalesStore(salesStorePath(dir))
    const inventory = new InventoryStore(inventoryStorePath(dir))
    const finance = new FinanceStore(financeStorePath(dir))

    const ipc = canais(sales, inventory, finance)
    const criada = (await sales.create({ ...VENDA, status: 'faturado' })) as { sale: Sale }

    await inventory.append({ kind: 'entrada', product_sku: 'SKU-1', quantity_milli: 3000, reason: 'inicial', tenant_id: 'local' })
    await inventory.append({ kind: 'saida', product_sku: 'SKU-1', quantity_milli: 3000, reason: 'venda', ref: `venda:${criada.sale.id}:SKU-1`, tenant_id: 'local' })

    await ipc.get('hermes:sales:devolver')!(null, criada.sale.id)
    await ipc.get('hermes:sales:devolver')!(null, criada.sale.id)

    expect((await inventory.balances())['SKU-1']).toBe(3000)
    expect((await finance.list()).filter(l => l.ref === `venda:${criada.sale.id}:devolucao`)).toHaveLength(1)
  })

  it('devolver venda inexistente devolve erro', async () => {
    const ipc = canais(new SalesStore(salesStorePath(dir)), new InventoryStore(inventoryStorePath(dir)), new FinanceStore(financeStorePath(dir)))

    expect(await ipc.get('hermes:sales:devolver')!(null, 'nao_existe')).toEqual({ error: 'venda_nao_encontrada' })
  })

  it('devolver orcamento e recusado: nada saiu do deposito', async () => {
    const sales = new SalesStore(salesStorePath(dir))
    const ipc = canais(sales, new InventoryStore(inventoryStorePath(dir)), new FinanceStore(financeStorePath(dir)))
    const criada = (await sales.create({ ...VENDA, status: 'orcamento' })) as { sale: Sale }

    expect(await ipc.get('hermes:sales:devolver')!(null, criada.sale.id)).toEqual({ error: 'venda_nao_faturada' })
  })
})

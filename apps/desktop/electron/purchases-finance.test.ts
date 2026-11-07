// Compra recebida gera conta a pagar (rodada 101).
//
// O GOAL pede "contas a pagar" em compras e exige que compra integre com estoque. Estoque já integrava desde
// antes; financeiro não. Estes testes provam o caminho completo com stores reais.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { FinanceStore, financeStorePath, payableForPurchase } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { registerPurchasesIpc } from './purchases-ipc'
import { PurchasesStore, purchasesStorePath } from './purchases-store'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-compra-fin-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const PEDIDO = {
  items: [{ product_sku: 'SKU-1', quantity_milli: 2000, unit_cost_cents: 1500 }],
  notes: '',
  supplier_id: 'forn_1',
  total_cents: 3000
}

describe('payableForPurchase (puro)', () => {
  const base = { id: 'p1', number: 7, status: 'recebido', supplier_id: 'forn_1', tenant_id: 'local', total_cents: 3000 }

  it('so pedido RECEBIDO gera conta a pagar', () => {
    expect(payableForPurchase({ ...base, status: 'rascunho' })).toBeNull()
    expect(payableForPurchase({ ...base, status: 'pedido' })).toBeNull()
    expect(payableForPurchase({ ...base, status: 'cancelado' })).toBeNull()
    expect(payableForPurchase(base)).not.toBeNull()
  })

  it('o tipo e pagar, e a ref e deterministica por pedido', () => {
    const conta = payableForPurchase(base, 1_700_000_000_000)

    expect(conta?.kind).toBe('pagar')
    expect(conta?.ref).toBe('compra:p1')
    expect(conta?.amount_cents).toBe(3000)
    expect(conta?.party).toBe('forn_1')
  })

  it('pedido de valor zero nao gera conta: nao ha obrigacao sem valor', () => {
    expect(payableForPurchase({ ...base, total_cents: 0 })).toBeNull()
  })
})

describe('receber pelo canal IPC', () => {
  function canais(finance: FinanceStore, inventory: InventoryStore, store: PurchasesStore) {
    const mapa = new Map<string, (e: unknown, p: unknown) => unknown>()

    registerPurchasesIpc(
      { handle: (c: string, l: (e: unknown, p: unknown) => unknown) => mapa.set(c, l) } as never,
      {
        actorOf: async () => ({ id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }),
        finance,
        inventory,
        store
      }
    )

    return mapa
  }

  it('receber lanca a conta a pagar no financeiro', async () => {
    const finance = new FinanceStore(financeStorePath(dir))
    const inventory = new InventoryStore(inventoryStorePath(dir))
    const store = new PurchasesStore(purchasesStorePath(dir))

    const ipc = canais(finance, inventory, store)
    const salvo = (await ipc.get('hermes:purchases:saveOrder')!(null, PEDIDO)) as { order: { id: string } }
    const r = (await ipc.get('hermes:purchases:receive')!(null, { ...PEDIDO, id: salvo.order.id })) as {
      finance: { ref: string } | null
      order: { total_cents: number }
    }

    expect(r.finance?.ref).toBe('compra:' + salvo.order.id)

    // E existe no arquivo do financeiro, não só no retorno.
    const lancamentos = await finance.list()
    const conta = lancamentos.find(l => l.ref === 'compra:' + salvo.order.id)

    expect(conta?.kind).toBe('pagar')
    expect(conta?.amount_cents).toBe(3000)
  })

  it('receber tambem lanca a entrada no estoque: as duas integracoes acontecem', async () => {
    const finance = new FinanceStore(financeStorePath(dir))
    const inventory = new InventoryStore(inventoryStorePath(dir))
    const store = new PurchasesStore(purchasesStorePath(dir))

    const ipc = canais(finance, inventory, store)
    const salvo = (await ipc.get('hermes:purchases:saveOrder')!(null, PEDIDO)) as { order: { id: string } }

    await ipc.get('hermes:purchases:receive')!(null, { ...PEDIDO, id: salvo.order.id })

    expect(await inventory.balances()).toEqual({ 'SKU-1': 2000 })
    expect((await finance.list()).some(l => l.ref === 'compra:' + salvo.order.id)).toBe(true)
  })

  it('receber duas vezes nao duplica a conta a pagar', async () => {
    const finance = new FinanceStore(financeStorePath(dir))
    const inventory = new InventoryStore(inventoryStorePath(dir))
    const store = new PurchasesStore(purchasesStorePath(dir))

    const ipc = canais(finance, inventory, store)
    const salvo = (await ipc.get('hermes:purchases:saveOrder')!(null, PEDIDO)) as { order: { id: string } }

    await ipc.get('hermes:purchases:receive')!(null, { ...PEDIDO, id: salvo.order.id })
    await ipc.get('hermes:purchases:receive')!(null, { ...PEDIDO, id: salvo.order.id })

    expect((await finance.list()).filter(l => l.ref === 'compra:' + salvo.order.id)).toHaveLength(1)
  })

  it('rascunho nao lanca nada no financeiro', async () => {
    const finance = new FinanceStore(financeStorePath(dir))
    const inventory = new InventoryStore(inventoryStorePath(dir))
    const store = new PurchasesStore(purchasesStorePath(dir))

    const ipc = canais(finance, inventory, store)

    await ipc.get('hermes:purchases:saveOrder')!(null, PEDIDO)

    expect(await finance.list()).toEqual([])
  })
})

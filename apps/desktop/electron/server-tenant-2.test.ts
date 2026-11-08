// Financeiro e estoque não aceitam o tenant do renderer (rodada 88).
//
// Estes dois eram os de maior impacto do IDOR da r85: dados financeiros e saldo de estoque. O canal
// recebia `tenant(tenantId)` do renderer, então pedir `empresa_b` devolvia os lançamentos e o saldo dela.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { FinanceStore, financeStorePath } from './finance-store'
import { registerFinanceIpc } from './finance-ipc'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { registerInventoryIpc } from './inventory-ipc'
import { INSTALLATION_TENANT } from './server-tenant'

const OUTRA = 'empresa_b'
const T0 = 1_700_000_000_000

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-idor2-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

type Canal = (event: unknown, payload: unknown) => unknown

function registrar(register: (ipc: never, store: never, deps?: never) => void, store: unknown) {
  const canais = new Map<string, Canal>()

  register(
    {
      handle: (canal: string, listener: Canal) => {
        canais.set(canal, listener)
      }
    } as never,
    store as never,
    // r224: os canais de dominio exigem ator desde r215 (financeiro) e r217 (estoque). O teste de
    // isolamento testa o TENANT, nao a permissao: o dono passa para que o isolamento seja o que se mede.
    { actorOf: async () => ({ id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }) } as never
  )

  return canais
}

describe('financeiro', () => {
  it('pedir a outra empresa NAO devolve os lancamentos dela', async () => {
    const store = new FinanceStore(financeStorePath(dir))

    await store.append({ amount_cents: 99_900, description: 'segredo', due_at: T0, kind: 'pagar', party: 'X', tenant_id: OUTRA })
    await store.append({ amount_cents: 100, description: 'meu', due_at: T0, kind: 'pagar', party: 'Y', tenant_id: INSTALLATION_TENANT })

    const canais = registrar(registerFinanceIpc as never, store)
    const r = (await canais.get('hermes:finance:list')!(null, OUTRA)) as { entries: { description: string }[] }

    expect(r.entries.map(e => e.description)).toEqual(['meu'])
  })

  it('pedir a outra empresa NAO devolve os totais dela', async () => {
    const store = new FinanceStore(financeStorePath(dir))

    await store.append({ amount_cents: 99_900, description: 'segredo', due_at: T0, kind: 'pagar', party: 'X', tenant_id: OUTRA })

    const canais = registrar(registerFinanceIpc as never, store)
    const r = (await canais.get('hermes:finance:totals')!(null, OUTRA)) as { totals: { openPayableCents: number } }

    expect(r.totals.openPayableCents).toBe(0)
  })
})

describe('estoque', () => {
  it('pedir a outra empresa NAO devolve o saldo dela', async () => {
    const store = new InventoryStore(inventoryStorePath(dir))

    await store.append({ kind: 'entrada', product_sku: 'SKU-B', quantity_milli: 5000, reason: 'segredo', tenant_id: OUTRA })

    const canais = registrar(registerInventoryIpc as never, store)
    const r = (await canais.get('hermes:inventory:balances')!(null, OUTRA)) as { balances: Record<string, number> }

    expect(r.balances['SKU-B']).toBeUndefined()
  })

  it('pedir a outra empresa NAO devolve as movimentacoes dela', async () => {
    const store = new InventoryStore(inventoryStorePath(dir))

    await store.append({ kind: 'entrada', product_sku: 'SKU-B', quantity_milli: 5000, reason: 'segredo', tenant_id: OUTRA })

    const canais = registrar(registerInventoryIpc as never, store)
    const r = (await canais.get('hermes:inventory:list')!(null, OUTRA)) as { movements: unknown[] }

    expect(r.movements).toEqual([])
  })
})

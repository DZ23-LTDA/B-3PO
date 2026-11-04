// Automacoes ligadas ao faturamento (rodada 63).
//
// O executor da rodada 62 existia e ninguem o chamava. Estes testes provam a ligacao pelo caminho
// real: `registerSalesIpc` -> `faturar` -> `onEvent` -> `runRules` -> `callTool` -> store.
//
// A invariante e a mesma do pos-venda: **a venda e o fato principal**. Uma automacao que falha nao
// pode desfazer a venda nem devolver erro ao operador.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { vi, describe, expect, it } from 'vitest'

import { buildDomainTools } from './agent-tools-catalog'
import { registerSalesIpc } from './sales-ipc'
import { runRules, type AutomationRule } from './automation-store'
import type { Actor } from './rbac'

const T0 = 1_700_000_000_000

const dono: Actor = { id: 'u1', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner', scopes: [] }

interface Canais {
  [canal: string]: (payload?: unknown) => Promise<any>
}

function registrar(deps: Parameters<typeof registerSalesIpc>[1]): Canais {
  const canais: Canais = {}
  const ipc = {
    handle: (canal: string, fn: (e: unknown, p?: unknown) => Promise<any>) => {
      canais[canal] = (payload?: unknown) => fn(null, payload)
    }
  }

  registerSalesIpc(ipc as never, deps)

  return canais
}

const PEDIDO = {
  contact_phone: '5511900000000',
  items: [{ product_sku: 'CAF', quantity_milli: 1000, unit_price_cents: 2000 }]
}

function deps(over: Record<string, unknown> = {}) {
  return {
    actorOf: async () => dono,
    finance: { append: async () => ({ entry: { id: 'f1' } }) },
    inventory: { append: async () => ({ balance: 0, movement: {} }), balances: async () => ({ CAF: 100_000 }) },
    sales: {
      create: async (input: any) => ({
        // `tenant_id` e `total_cents` sao do STORE, nao do payload: um mock que os omite faz o teste
        // falhar por um motivo que nao existe em producao.
        sale: { ...input, created_at: T0, id: 'v1', status: 'faturado', tenant_id: 'local', total_cents: 2000 },
        sales: []
      })
    },
    ...over
  } as unknown as Parameters<typeof registerSalesIpc>[1]
}

const regra = (over: Partial<AutomationRule> = {}): AutomationRule => ({
  action_args: { kind: 'entrada', product_sku: 'CAF', quantity_milli: 500, reason: 'auto' },
  action_name: 'inventory.append',
  active: true,
  actor_id: 'u1',
  created_at: T0,
  id: 'r1',
  name: 'Repor ao vender',
  tenant_id: 'local',
  trigger: 'venda.faturada',
  updated_at: T0,
  ...over
})

describe('faturar anuncia o evento', () => {
  it('onEvent recebe o resumo da venda, nao o payload cru', async () => {
    const onEvent = vi.fn(async () => {})

    await registrar(deps({ onEvent }))['hermes:sales:faturar']!(PEDIDO)

    expect(onEvent).toHaveBeenCalledWith({ sale_id: 'v1', tenant_id: 'local', total_cents: 2000, type: 'venda.faturada' })
  })

  it('automacao que falha NAO desfaz a venda nem devolve erro', async () => {
    const onEvent = vi.fn(async () => {
      throw new Error('regra explodiu')
    })

    const r = await registrar(deps({ onEvent }))['hermes:sales:faturar']!(PEDIDO)

    expect(r.error).toBeUndefined()
    expect(r.sale.id).toBe('v1')
    expect(onEvent).toHaveBeenCalled()
  })

  it('sem onEvent o faturamento segue normal', async () => {
    const r = await registrar(deps())['hermes:sales:faturar']!(PEDIDO)

    expect(r.error).toBeUndefined()
    expect(r.sale.id).toBe('v1')
  })
})

describe('faturamento ate a automacao, ponta a ponta', () => {
  it('a regra roda pelo catalogo depois que a venda e faturada', async () => {
    // O parametro tipado importa: `vi.fn(async () => ...)` infere `calls` como tupla vazia e o teste
    // nao consegue inspecionar o argumento sem conversao.
    const append = vi.fn(async (_input: unknown) => ({ balance: 500, movement: { id: 'm1' } }))
    const catalogo = buildDomainTools({ inventory: { append, balances: async () => ({}) } } as never)

    const canais = registrar(
      deps({
        // O elo que faltava: o evento vira execucao de regra.
        onEvent: async event => {
          await runRules([regra()], event.type, {
            actorFor: async id => (id === 'u1' ? dono : null),
            now: T0,
            tenantId: event.tenant_id,
            tools: catalogo
          })
        }
      })
    )

    const r = await canais['hermes:sales:faturar']!(PEDIDO)

    expect(r.error).toBeUndefined()
    // Uma venda faturada -> uma entrada de estoque pela regra.
    expect(append).toHaveBeenCalledTimes(1)
    expect(append.mock.calls[0]?.[0]).toMatchObject({ kind: 'entrada', product_sku: 'CAF', quantity_milli: 500 })
  })

  it('regra de outro gatilho nao dispara no faturamento', async () => {
    const append = vi.fn(async () => ({ balance: 0, movement: {} }))
    const catalogo = buildDomainTools({ inventory: { append, balances: async () => ({}) } } as never)

    await registrar(
      deps({
        onEvent: async event => {
          await runRules([regra({ trigger: 'ticket.aberto' })], event.type, {
            actorFor: async () => dono,
            now: T0,
            tenantId: event.tenant_id,
            tools: catalogo
          })
        }
      })
    )['hermes:sales:faturar']!(PEDIDO)

    expect(append).not.toHaveBeenCalled()
  })

  it('regra inativa nao dispara', async () => {
    const append = vi.fn(async () => ({ balance: 0, movement: {} }))
    const catalogo = buildDomainTools({ inventory: { append, balances: async () => ({}) } } as never)

    await registrar(
      deps({
        onEvent: async event => {
          await runRules([regra({ active: false })], event.type, {
            actorFor: async () => dono,
            now: T0,
            tenantId: event.tenant_id,
            tools: catalogo
          })
        }
      })
    )['hermes:sales:faturar']!(PEDIDO)

    expect(append).not.toHaveBeenCalled()
  })
})

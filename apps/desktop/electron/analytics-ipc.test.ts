// Contrato do painel contra os stores REAIS (rodada 57).
//
// O teste do `analytics.ts` prova a conta com dados escolhidos. Este prova a LEITURA: que os nomes de
// campo de cada store caem no lugar certo do snapshot. Um mapeamento trocado (pagar com receber, aberto
// com atrasado) passaria na conta pura e falharia aqui.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AfterSalesStore, afterSalesStorePath } from './after-sales-store'
import { gatherSnapshot } from './analytics-ipc'
import { FinanceStore, financeStorePath } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { MarketingStore, marketingStorePath } from './marketing-store'
import { SalesStore, salesStorePath } from './sales-store'
import { ServiceDeskStore, serviceDeskStorePath } from './service-desk-store'

const T0 = 1_700_000_000_000

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-dash-'))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

function deps() {
  return {
    actorOf: async () => ({ id: 'teste', kind: 'human' as const, level: 'EXECUTE_ALLOWED' as const, role: 'owner' as const }),
    afterSales: new AfterSalesStore(afterSalesStorePath(dir)),
    desk: new ServiceDeskStore(serviceDeskStorePath(dir)),
    finance: new FinanceStore(financeStorePath(dir)),
    inventory: new InventoryStore(inventoryStorePath(dir)),
    marketing: new MarketingStore(marketingStorePath(dir)),
    sales: new SalesStore(salesStorePath(dir))
  }
}

describe('leitura real dos dominios', () => {
  it('painel vazio nao inventa numero e nao alerta', async () => {
    const p = await gatherSnapshot(deps(), T0)

    expect(p.snapshot.sales.faturadas).toBe(0)
    expect(p.snapshot.sales.totalCents).toBe(0)
    expect(p.snapshot.finance.saldoCents).toBe(0)
    expect(p.snapshot.desk.satisfacaoMedia).toBeNull()
    expect(p.alerts).toEqual([])
  })

  it('aPaginar e aReceber nao se trocam: pagar 300, receber 100 da saldo negativo', async () => {
    const d = deps()

    await d.finance.append({ amount_cents: 30_000, due_at: T0 + 86_400_000, kind: 'pagar', party: 'Fornecedor' })
    await d.finance.append({ amount_cents: 10_000, due_at: T0 + 86_400_000, kind: 'receber', party: 'Cliente' })

    const p = await gatherSnapshot(d, T0)

    expect(p.snapshot.finance.aPagarCents).toBe(30_000)
    expect(p.snapshot.finance.aReceberCents).toBe(10_000)
    expect(p.snapshot.finance.saldoCents).toBe(-20_000)
    // E o alerta de caixa caro aparece por consequencia.
    expect(p.alerts[0]!.domain).toBe('finance')
  })

  it('estoque zerado aparece como zerado, nao como ausente', async () => {
    const d = deps()

    await d.inventory.append({ kind: 'entrada', product_sku: 'A', quantity_milli: 5000, reason: 'carga' })
    await d.inventory.append({ kind: 'entrada', product_sku: 'B', quantity_milli: 1000, reason: 'carga' })
    await d.inventory.append({ kind: 'saida', product_sku: 'B', quantity_milli: 1000, reason: 'venda' })

    const p = await gatherSnapshot(d, T0)

    expect(p.snapshot.inventory).toEqual({ comSaldo: 1, zerados: 1 })
  })

  it('venda faturada sem pos-venda gera alerta; com pos-venda, nao', async () => {
    const d = deps()

    await d.inventory.append({ kind: 'entrada', product_sku: 'CAF', quantity_milli: 10_000, reason: 'carga' })

    const criada = await d.sales.create({
      contact_phone: '5511900000000',
      items: [{ product_sku: 'CAF', quantity_milli: 1000, unit_price_cents: 2000 }],
      status: 'faturado'
    })

    if ('error' in criada) throw new Error(criada.error)

    const antes = await gatherSnapshot(d, T0)

    expect(antes.snapshot.sales.faturadas).toBe(1)
    expect(antes.alerts.some(a => a.domain === 'sales')).toBe(true)

    await d.afterSales.create({ kind: 'satisfacao', sale_at: criada.sale.created_at, sale_id: criada.sale.id })

    const depois = await gatherSnapshot(d, T0)

    expect(depois.alerts.some(a => a.domain === 'sales')).toBe(false)
  })

  it('atendimento aberto conta como pendente; atrasado conta separado', async () => {
    const d = deps()
    const aberto = await d.desk.open({ description: 'pedido nao chegou', priority: 'urgente', subject: 'Entrega atrasada' })

    if ('error' in aberto) throw new Error(aberto.error)

    const agora = await gatherSnapshot(d, Date.now())

    expect(agora.snapshot.desk.pendentes).toBe(1)
    expect(agora.snapshot.desk.atrasados).toBe(0)
    expect(agora.snapshot.desk.satisfacaoMedia).toBeNull()
  })
})

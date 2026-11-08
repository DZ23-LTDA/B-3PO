// O fluxo de venda entre dominios, como contrato permanente (rodada 174).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// Na r172 eu provei, no app compilado e pelos canais IPC reais, que uma venda faturada baixa o estoque e cria o
// recebivel. Isso foi uma medicao pontual: um script, um JSON de evidencia, e nada que impedisse a regressao.
//
// Este teste transforma a medicao em CONTRATO. Se alguem quebrar o efeito cruzado — o estoque parar de baixar, o
// recebivel deixar de ser criado, o saldo insuficiente deixar de recusar — este arquivo falha.
//
// O QUE ELE NAO PROVA
//
// Nada de interface: ele chama os mesmos canais que a tela chama, nao a tela. E tambem nao prova concorrencia
// (duas vendas do mesmo SKU ao mesmo tempo).

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CatalogStore, catalogStorePath } from './catalog-store'
import { FinanceStore, financeStorePath } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { registerSalesIpc } from './sales-ipc'
import { SalesStore, salesStorePath } from './sales-store'

type Ctx = {
  catalog: CatalogStore
  finance: FinanceStore
  inventory: InventoryStore
  invocar: (canal: string, ...args: unknown[]) => Promise<unknown>
}

let dir = ''
let ctx: Ctx

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-fluxo-venda-'))

  const catalog = new CatalogStore(catalogStorePath(dir))
  const finance = new FinanceStore(financeStorePath(dir))
  const inventory = new InventoryStore(inventoryStorePath(dir))
  const sales = new SalesStore(salesStorePath(dir))

  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>()

  registerSalesIpc(
    {
      handle: (canal: string, fn: (event: unknown, ...args: unknown[]) => Promise<unknown>) => {
        handlers.set(canal, fn)
      }
    } as never,
    {
      actorOf: async () => ({ id: 'u1', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' }),
      finance,
      inventory,
      sales
    } as never
  )

  ctx = {
    catalog,
    finance,
    inventory,
    invocar: async (canal: string, ...args: unknown[]) => {
      const handler = handlers.get(canal)

      if (!handler) throw new Error('canal nao registrado: ' + canal)

      return handler(null, ...args)
    }
  }
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const produto = {
  active: true,
  barcode: '7890000000001',
  category: 'Teste',
  cost_cents: 3000,
  id: 'prod-1',
  name: 'Produto de Teste',
  price_cents: 5000,
  sku: 'SKU-FLUXO',
  unit: 'un'
}

const venda = {
  client_id: 'cli-1',
  id: 'venda-fluxo-1',
  items: [{ discount_cents: 0, product_sku: 'SKU-FLUXO', quantity: 2, unit_price_cents: 5000 }]
}

describe('venda faturada no fluxo entre dominios', () => {
  it('baixa o estoque e cria o recebivel no mesmo ato', async () => {
    await ctx.catalog.upsert(produto)
    await ctx.inventory.append({ kind: 'entrada', product_sku: 'SKU-FLUXO', quantity: 10, reason: 'compra' })

    expect((await ctx.inventory.balances())['SKU-FLUXO']).toBe(10_000)

    await ctx.invocar('hermes:sales:create', venda)

    const resposta = (await ctx.invocar('hermes:sales:faturar', { ...venda, status: 'faturado' })) as {
      sale?: { status: string }
    }

    expect(resposta.sale?.status).toBe('faturado')

    // O efeito no ESTOQUE: 10 unidades menos 2 vendidas.
    expect((await ctx.inventory.balances())['SKU-FLUXO']).toBe(8_000)

    // O efeito no FINANCEIRO: um recebivel de 2 x 5000.
    const totais = await ctx.finance.totals()

    expect(totais.openReceivableCents).toBe(10_000)
  })

  it('recusa faturar sem saldo e NAO deixa venda faturada', async () => {
    // O comentario no codigo diz por que isto importa: "recusar depois seria deixar uma venda faturada que
    // nunca saiu do deposito". Este teste fixa essa promessa.
    await ctx.catalog.upsert(produto)
    await ctx.inventory.append({ kind: 'entrada', product_sku: 'SKU-FLUXO', quantity: 1, reason: 'compra' })

    await ctx.invocar('hermes:sales:create', venda)

    const resposta = (await ctx.invocar('hermes:sales:faturar', { ...venda, status: 'faturado' })) as {
      error?: string
    }

    expect(resposta.error).toBe('saldo_insuficiente')

    // O estoque NAO foi tocado: 1 unidade continua la.
    expect((await ctx.inventory.balances())['SKU-FLUXO']).toBe(1_000)

    // E nenhum recebivel foi criado.
    expect((await ctx.finance.totals()).openReceivableCents).toBe(0)
  })

  it('faturar duas vezes o mesmo conteudo nao duplica o recebivel', async () => {
    // O `ref` de cada lancamento e deterministico (`venda:<id>`): faturar de novo deve ser idempotente no
    // financeiro, mesmo que a venda seja regravada.
    await ctx.catalog.upsert(produto)
    await ctx.inventory.append({ kind: 'entrada', product_sku: 'SKU-FLUXO', quantity: 10, reason: 'compra' })

    await ctx.invocar('hermes:sales:create', venda)
    await ctx.invocar('hermes:sales:faturar', { ...venda, status: 'faturado' })

    const primeiro = (await ctx.finance.totals()).openReceivableCents

    await ctx.invocar('hermes:sales:faturar', { ...venda, status: 'faturado' })

    const segundo = (await ctx.finance.totals()).openReceivableCents

    expect(segundo).toBe(primeiro)
  })
})

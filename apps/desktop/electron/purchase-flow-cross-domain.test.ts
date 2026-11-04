// O fluxo de compra entre dominios, como contrato permanente (rodada 175).
//
// E o espelho do fluxo de venda (sale-flow-cross-domain.test.ts): la uma venda baixa o estoque e cria um
// recebivel; aqui um recebimento de compra sobe o estoque e cria uma conta a pagar.
//
// Se os dois lados nao forem simetricos, o produto tem uma verdade para vender e outra para comprar — e o
// saldo do estoque vira a soma de duas regras diferentes.
//
// Contratos lidos do codigo, nao adivinhados:
//   normalizeSupplier  -> { name } (obrigatorio)
//   normalizePurchase  -> { supplier_id, items: [{ product_sku, quantity | quantity_milli }] }
//   purchases.receive  -> recebe o pedido COMPLETO, como o `faturar` da venda

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { FinanceStore, financeStorePath } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { registerPurchasesIpc } from './purchases-ipc'
import { PurchasesStore, purchasesStorePath } from './purchases-store'
import type { LimiteDeCompra } from './purchase-approval'

type Ctx = {
  finance: FinanceStore
  inventory: InventoryStore
  invocar: (canal: string, ...args: unknown[]) => Promise<unknown>
}

let dir = ''
let ctx: Ctx
let limiteAtual: LimiteDeCompra | undefined

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-fluxo-compra-'))

  const finance = new FinanceStore(financeStorePath(dir))
  const inventory = new InventoryStore(inventoryStorePath(dir))
  const store = new PurchasesStore(purchasesStorePath(dir))

  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>()

  limiteAtual = undefined

  registerPurchasesIpc(
    {
      handle: (canal: string, fn: (event: unknown, ...args: unknown[]) => Promise<unknown>) => {
        handlers.set(canal, fn)
      }
    } as never,
    {
      finance,
      inventory,
      limiteDeCompra: async () => limiteAtual ?? { aprovadores: [], cents: null },
      store
    } as never
  )

  ctx = {
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

const pedido = {
  id: 'compra-1',
  items: [{ product_sku: 'SKU-COMPRA', quantity: 5, unit_cost_cents: 2000 }],
  supplier_id: 'forn-1'
}

describe('compra recebida no fluxo entre dominios', () => {
  it('sobe o estoque e cria a conta a pagar no mesmo ato', async () => {
    await ctx.invocar('hermes:purchases:saveSupplier', { id: 'forn-1', name: 'Fornecedor de Teste' })

    const resposta = (await ctx.invocar('hermes:purchases:receive', pedido)) as {
      error?: string
      order?: { status: string }
      stock?: unknown[]
    }

    expect(resposta.error).toBeUndefined()
    expect(resposta.order?.status).toBe('recebido')

    // O efeito no ESTOQUE: 5 unidades entraram (em milesimos).
    expect((await ctx.inventory.balances())['SKU-COMPRA']).toBe(5_000)

    // O efeito no FINANCEIRO: uma conta a pagar de 5 x 2000.
    const totais = await ctx.finance.totals()

    expect(totais.openPayableCents).toBe(10_000)

    // E o recebimento gerou os movimentos de estoque que diz ter gerado.
    expect(resposta.stock?.length).toBeGreaterThan(0)
  })

  it('recusa pedido sem fornecedor e nao toca no estoque', async () => {
    const resposta = (await ctx.invocar('hermes:purchases:receive', { ...pedido, supplier_id: '' })) as {
      error?: string
    }

    expect(resposta.error).toBe('supplier_required')

    expect((await ctx.inventory.balances())['SKU-COMPRA']).toBeUndefined()
    expect((await ctx.finance.totals()).openPayableCents).toBe(0)
  })

  it('recusa pedido sem itens e nao toca no estoque', async () => {
    await ctx.invocar('hermes:purchases:saveSupplier', { id: 'forn-1', name: 'Fornecedor de Teste' })

    const resposta = (await ctx.invocar('hermes:purchases:receive', { ...pedido, items: [] })) as {
      error?: string
    }

    expect(resposta.error).toBe('items_required')

    expect((await ctx.inventory.balances())['SKU-COMPRA']).toBeUndefined()
    expect((await ctx.finance.totals()).openPayableCents).toBe(0)
  })

  it('pedido ja recebido nao pode ser recebido de novo', async () => {
    // `pedido_recebido_imutavel` e a promessa de que um recebimento nao pode ser aplicado duas vezes — o que
    // dobraria o estoque e a conta a pagar.
    await ctx.invocar('hermes:purchases:saveSupplier', { id: 'forn-1', name: 'Fornecedor de Teste' })
    await ctx.invocar('hermes:purchases:receive', pedido)

    const primeiroEstoque = (await ctx.inventory.balances())['SKU-COMPRA']
    const primeiroPagavel = (await ctx.finance.totals()).openPayableCents

    const segunda = (await ctx.invocar('hermes:purchases:receive', pedido)) as { error?: string }

    expect(segunda.error).toBe('pedido_recebido_imutavel')
    expect((await ctx.inventory.balances())['SKU-COMPRA']).toBe(primeiroEstoque)
    expect((await ctx.finance.totals()).openPayableCents).toBe(primeiroPagavel)
  })
})

describe('limite de compra (GOAL §15)', () => {
  it('com limite configurado, recusa ANTES de tocar estoque e financeiro', async () => {
    // O ponto do requisito: a recusa precisa acontecer antes dos efeitos. Recusar depois seria deixar
    // mercadoria no estoque e uma divida criada para alguem descobrir que faltava assinatura.
    limiteAtual = { aprovadores: ['dono'], cents: 9_999 }

    await ctx.invocar('hermes:purchases:saveSupplier', { id: 'forn-1', name: 'Fornecedor de Teste' })

    const resposta = (await ctx.invocar('hermes:purchases:receive', pedido)) as { error?: string }

    expect(resposta.error).toBe('aprovacao_necessaria')
    expect((await ctx.inventory.balances())['SKU-COMPRA']).toBeUndefined()
    expect((await ctx.finance.totals()).openPayableCents).toBe(0)
  })

  it('compra abaixo do limite continua passando', async () => {
    limiteAtual = { aprovadores: ['dono'], cents: 1_000_000 }

    await ctx.invocar('hermes:purchases:saveSupplier', { id: 'forn-1', name: 'Fornecedor de Teste' })

    const resposta = (await ctx.invocar('hermes:purchases:receive', pedido)) as { error?: string }

    expect(resposta.error).toBeUndefined()
    expect((await ctx.inventory.balances())['SKU-COMPRA']).toBe(5_000)
  })

  it('sem limite configurado, nada muda', async () => {
    limiteAtual = undefined

    await ctx.invocar('hermes:purchases:saveSupplier', { id: 'forn-1', name: 'Fornecedor de Teste' })

    const resposta = (await ctx.invocar('hermes:purchases:receive', pedido)) as { error?: string }

    expect(resposta.error).toBeUndefined()
  })
})
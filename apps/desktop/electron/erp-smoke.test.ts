// Teste de fumaça do ciclo comercial, com os três domínios reais e nenhum mock.
//
// A revisão independente da rodada 1 propôs exatamente este teste como contra-medida ao risco de o
// ciclo inteiro produzir módulos desconectados: se criar produto → vender → baixar estoque não fechar,
// não se avança para tela. Ele usa os stores de verdade, sobre arquivos temporários.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CatalogStore, catalogStorePath, type Product } from './catalog-store'
import { FinanceStore, financeStorePath, receivableForSale } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { SalesStore, salesStorePath, stockMovementsFor } from './sales-store'

async function withErp<T>(
  run: (erp: { catalog: CatalogStore; finance: FinanceStore; inventory: InventoryStore; sales: SalesStore }) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-erp-smoke-'))

  try {
    return await run({
      catalog: new CatalogStore(catalogStorePath(dir)),
      finance: new FinanceStore(financeStorePath(dir)),
      inventory: new InventoryStore(inventoryStorePath(dir)),
      sales: new SalesStore(salesStorePath(dir))
    })
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('ciclo comercial completo (produto -> estoque -> venda)', () => {
  it('cadastra produto, recebe estoque, vende e o saldo cai exatamente o vendido', async () => {
    await withErp(async ({ catalog, inventory, sales }) => {
      // 1) Catálogo
      const criado = await catalog.upsert({
        name: 'Café 500g',
        price_cents: 2490,
        sku: 'CAF-500',
        unit: 'un'
      })

      expect('products' in criado).toBe(true)

      const produto = 'products' in criado ? (criado.products[0] as Product) : null

      expect(produto?.sku).toBe('CAF-500')

      // 2) Entrada de estoque: 10 unidades
      const entrada = await inventory.append({ kind: 'entrada', product_sku: 'CAF-500', quantity: 10, ref: 'compra:1' })

      expect('balance' in entrada && entrada.balance).toBe(10000)

      // 3) Venda faturada de 3 unidades
      const venda = await sales.create({
        contact_phone: '+5511999991111',
        items: [{ product_sku: 'CAF-500', quantity: 3, unit_price_cents: 2490 }],
        status: 'faturado'
      })

      expect('sale' in venda).toBe(true)
      if (!('sale' in venda)) return

      expect(venda.sale.total_cents).toBe(7470)

      // 4) Baixa no estoque pelas movimentações que a venda declarou
      for (const movimento of stockMovementsFor(venda.sale)) {
        const baixa = await inventory.append(movimento)

        expect('movement' in baixa).toBe(true)
      }

      expect(await inventory.balances()).toEqual({ 'CAF-500': 7000 })

      // 5) Faturar de novo não baixa de novo (ref determinística)
      for (const movimento of stockMovementsFor(venda.sale)) {
        expect(await inventory.append(movimento)).toEqual({ error: 'ref_duplicado' })
      }

      expect(await inventory.balances()).toEqual({ 'CAF-500': 7000 })
    })
  })

  it('recusa vender mais do que existe, sem corromper o livro', async () => {
    await withErp(async ({ inventory, sales }) => {
      await inventory.append({ kind: 'entrada', product_sku: 'CAF-500', quantity: 2 })

      const venda = await sales.create({
        items: [{ product_sku: 'CAF-500', quantity: 5, unit_price_cents: 1000 }],
        status: 'faturado'
      })

      expect('sale' in venda).toBe(true)
      if (!('sale' in venda)) return

      const resultados = []

      for (const movimento of stockMovementsFor(venda.sale)) {
        resultados.push(await inventory.append(movimento))
      }

      // A baixa é recusada; o saldo original continua intacto e auditável.
      expect(resultados[0]).toEqual({ error: 'saldo_insuficiente' })
      expect(await inventory.balances()).toEqual({ 'CAF-500': 2000 })
      expect(await inventory.list()).toHaveLength(1)
    })
  })

  it('o total da venda é a soma dos itens, inclusive com desconto', async () => {
    await withErp(async ({ sales }) => {
      const venda = await sales.create({
        items: [
          { product_sku: 'A', quantity: 2, unit_price_cents: 1000 },
          { product_sku: 'B', quantity: 1, unit_price_cents: 500, discount_cents: 100 }
        ]
      })

      expect('sale' in venda && venda.sale.total_cents).toBe(2000 + 400)
    })
  })

  it('CICLO COMPLETO: produto -> estoque -> venda -> receita, sem mock', async () => {
    await withErp(async ({ catalog, finance, inventory, sales }) => {
      await catalog.upsert({ name: 'Café 500g', price_cents: 2490, sku: 'CAF-500', unit: 'un' })
      await inventory.append({ kind: 'entrada', product_sku: 'CAF-500', quantity: 10, ref: 'compra:1' })

      const venda = await sales.create({
        contact_phone: '+5511999991111',
        items: [{ product_sku: 'CAF-500', quantity: 3, unit_price_cents: 2490 }],
        status: 'faturado'
      })

      expect('sale' in venda).toBe(true)
      if (!('sale' in venda)) return

      // Estoque baixa pelo que a venda declarou
      for (const movimento of stockMovementsFor(venda.sale)) {
        expect('movement' in (await inventory.append(movimento))).toBe(true)
      }

      // Receita entra no financeiro
      const receber = receivableForSale(venda.sale)

      expect(receber).not.toBeNull()
      if (!receber) return

      expect('entry' in (await finance.append(receber))).toBe(true)

      // O ciclo fecha com números coerentes entre os três domínios
      expect(await inventory.balances()).toEqual({ 'CAF-500': 7000 })
      expect(venda.sale.total_cents).toBe(7470)

      const totais = await finance.totals()

      expect(totais.openReceivableCents).toBe(7470)
      expect(totais.paidReceivableCents).toBe(0)

      // Faturar de novo não duplica nem estoque nem receita
      for (const movimento of stockMovementsFor(venda.sale)) {
        expect(await inventory.append(movimento)).toEqual({ error: 'ref_duplicado' })
      }

      expect(await finance.append(receber)).toEqual({ error: 'ref_duplicado' })
      expect((await finance.totals()).openReceivableCents).toBe(7470)
    })
  })
})

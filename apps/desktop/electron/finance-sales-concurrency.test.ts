// Concorrência no financeiro e nas vendas (rodada 235).
//
// A r234 encontrou o mesmo defeito no estoque: read -> valida -> write sem serialização, e duas chamadas
// simultâneas perdiam uma escrita. Aqui a pergunta é a mesma para dinheiro.
//
// O que importa NÃO é a resposta de cada chamada — é o que o ARQUIVO tem depois. Duas respostas "ok" e uma
// entrada a menos significa dinheiro que entra sem registro.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { FinanceStore, financeStorePath } from './finance-store'
import { SalesStore, salesStorePath } from './sales-store'

async function comDir(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-conc2-'))

  try {
    await run(dir)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('financeiro: lancamentos simultaneos', () => {
  it('cinco entradas simultaneas viram cinco registros', async () => {
    await comDir(async dir => {
      const store = new FinanceStore(financeStorePath(dir))

      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          store.append({
            amount_cents: 1_000,
            description: `entrada ${i}`,
            due_at: Date.now() + 86_400_000,
            kind: 'receber'
          })
        )
      )

      const entradas = await store.list()

      expect(entradas.length).toBe(5)
    })
  })

  it('o total bate com a soma dos lancamentos gravados', async () => {
    await comDir(async dir => {
      const store = new FinanceStore(financeStorePath(dir))

      await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          store.append({ amount_cents: 2_500, description: `e${i}`, due_at: Date.now() + 86_400_000, kind: 'receber' })
        )
      )

      const entradas = await store.list()
      const soma = entradas.reduce((s, e) => s + e.amount_cents, 0)

      // 4 x 2500 = 10000. Se o total divergir da soma das entradas, o agregado leu outro estado.
      expect({ registros: entradas.length, soma }).toEqual({ registros: 4, soma: 10_000 })
    })
  })
})

describe('vendas: criacao simultanea', () => {
  it('quatro vendas simultaneas viram quatro registros', async () => {
    await comDir(async dir => {
      const store = new SalesStore(salesStorePath(dir))

      await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          store.create({
            items: [{ product_sku: 'CAFE', quantity: 1, unit_price_cents: 1_500 }],
            note: `venda ${i}`
          })
        )
      )

      const vendas = await store.list()

      expect(vendas.length).toBe(4)
    })
  })

  it('cada venda tem id proprio - nenhuma sobrescreve a outra', async () => {
    await comDir(async dir => {
      const store = new SalesStore(salesStorePath(dir))

      await Promise.all(
        Array.from({ length: 3 }, () =>
          store.create({ items: [{ product_sku: 'CAFE', quantity: 1, unit_price_cents: 1_000 }] })
        )
      )

      const vendas = await store.list()
      const ids = new Set(vendas.map(v => v.id))

      expect({ registros: vendas.length, ids_unicos: ids.size }).toEqual({ registros: 3, ids_unicos: 3 })
    })
  })
})

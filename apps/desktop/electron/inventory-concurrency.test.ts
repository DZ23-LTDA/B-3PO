// Concorrência no ledger de estoque (rodada 234).
//
// A PERGUNTA QUE NUNCA TINHA SIDO FEITA
//
// `InventoryStore.append` faz read -> valida -> push -> write. O `write` é atômico (temp + rename), mas a
// SEQUÊNCIA não é serializada. Duas chamadas que se sobrepõem leem o mesmo estado, validam contra o mesmo saldo
// e gravam uma por cima da outra.
//
// Este teste dispara duas saidas simultâneas do mesmo SKU e verifica o que o LEDGER diz depois. O que importa não
// é a resposta de cada chamada — é quantos movimentos existem no arquivo e qual é o saldo.
//
// Se as duas passarem e o ledger tiver UM movimento, houve lost update: uma venda desapareceu e o estoque ficou
// maior que a realidade.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { InventoryStore, inventoryStorePath } from './inventory-store'

const ENTRADA = 10

async function comEstoque(run: (store: InventoryStore) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-conc-'))

  try {
    const store = new InventoryStore(inventoryStorePath(dir))

    await store.append({ kind: 'entrada', product_sku: 'CAFE', quantity: ENTRADA })
    await run(store)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('duas saidas simultaneas do mesmo SKU', () => {
  it('as duas cabem: o ledger tem 3 movimentos e o saldo e o esperado', async () => {
    // Saldo 10. Duas saidas de 3. As duas cabem (10 - 6 = 4). Ambas devem gravar.
    await comEstoque(async store => {
      const [a, b] = await Promise.all([
        store.append({ kind: 'saida', product_sku: 'CAFE', quantity: 3 }),
        store.append({ kind: 'saida', product_sku: 'CAFE', quantity: 3 })
      ])

      const movimentos = await store.list()
      const saldo = (await store.balances())['CAFE']

      // O contrato: duas vendas aceitas => dois movimentos, saldo 4000.
      expect({ movimentos: movimentos.length, saldo }).toEqual({ movimentos: 3, saldo: 4_000 })
      expect('error' in a).toBe(false)
      expect('error' in b).toBe(false)
    })
  })

  it('quando as duas juntas estouram o saldo, SO UMA pode passar', async () => {
    // Saldo 10. Duas saidas de 8: juntas dao 16, nao cabem. O aceitavel e 1 aceita + 1 recusada.
    // Duas aceitas seriam saldo negativo; duas recusadas seriam uma recusa indevida.
    await comEstoque(async store => {
      const [a, b] = await Promise.all([
        store.append({ kind: 'saida', product_sku: 'CAFE', quantity: 8 }),
        store.append({ kind: 'saida', product_sku: 'CAFE', quantity: 8 })
      ])

      const aceitas = [a, b].filter(r => !('error' in r)).length
      const saldo = (await store.balances())['CAFE']

      expect({ aceitas, saldo }).toEqual({ aceitas: 1, saldo: 2_000 })
    })
  })

  it('o saldo nunca fica negativo, mesmo com cinco saidas simultaneas', async () => {
    await comEstoque(async store => {
      await Promise.all(
        Array.from({ length: 5 }, () => store.append({ kind: 'saida', product_sku: 'CAFE', quantity: 4 }))
      )

      const saldo = (await store.balances())['CAFE']

      expect(saldo).toBeGreaterThanOrEqual(0)
    })
  })

  it('cinco saidas que cabem viram cinco movimentos', async () => {
    // Saldo 10, cinco saidas de 2. Todas cabem. Perder qualquer uma e lost update.
    await comEstoque(async store => {
      await Promise.all(
        Array.from({ length: 5 }, () => store.append({ kind: 'saida', product_sku: 'CAFE', quantity: 2 }))
      )

      const movimentos = await store.list()

      expect({ movimentos: movimentos.length, saldo: (await store.balances())['CAFE'] }).toEqual({
        movimentos: 6,
        saldo: 0
      })
    })
  })
})

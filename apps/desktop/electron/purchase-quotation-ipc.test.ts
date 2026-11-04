// Cotacao pelo canal IPC (rodada 190).
//
// A r188 entregou o modulo puro; a r189 mediu que ele nao tinha superficie. Este teste prova que o canal
// existe e responde — o elo entre "o produto sabe comparar" e "a tela pode pedir a comparacao".

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { FinanceStore, financeStorePath } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { registerPurchasesIpc } from './purchases-ipc'
import { PurchasesStore, purchasesStorePath } from './purchases-store'

let dir = ''
let invocar: (canal: string, ...args: unknown[]) => Promise<unknown>

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-cotacao-'))

  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>()

  registerPurchasesIpc(
    {
      handle: (canal: string, fn: (event: unknown, ...args: unknown[]) => Promise<unknown>) => {
        handlers.set(canal, fn)
      }
    } as never,
    {
      finance: new FinanceStore(financeStorePath(dir)),
      inventory: new InventoryStore(inventoryStorePath(dir)),
      store: new PurchasesStore(purchasesStorePath(dir))
    } as never
  )

  invocar = async (canal: string, ...args: unknown[]) => {
    const handler = handlers.get(canal)

    if (!handler) throw new Error('canal nao registrado: ' + canal)

    return handler(null, ...args)
  }
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const proposta = (supplier_id: string, preco: number) => ({
  prazo_dias: 5,
  preco_unit_cents: preco,
  quantidade_disponivel: 100,
  supplier_id
})

describe('canal de cotacao', () => {
  it('existe e devolve a melhor proposta', async () => {
    const r = (await invocar('hermes:purchases:cotacao', {
      cotacoes: [proposta('caro', 2_000), proposta('barato', 1_500)],
      quantidade: 10
    })) as { proposta?: { preco_total_cents: number; supplier_id: string } }

    expect(r.proposta?.supplier_id).toBe('barato')
    expect(r.proposta?.preco_total_cents).toBe(15_000)
  })

  it('devolve a economia contra a segunda', async () => {
    const r = (await invocar('hermes:purchases:cotacao', {
      cotacoes: [proposta('a', 1_500), proposta('b', 1_800)],
      quantidade: 10
    })) as { economia_contra_segunda_cents: number | null }

    expect(r.economia_contra_segunda_cents).toBe(3_000)
  })

  it('sem cotacoes responde sem_cotacoes', async () => {
    const r = (await invocar('hermes:purchases:cotacao', { cotacoes: [], quantidade: 10 })) as { motivo: string }

    expect(r.motivo).toBe('sem_cotacoes')
  })

  it('proposta parcial nao atende', async () => {
    const r = (await invocar('hermes:purchases:cotacao', {
      cotacoes: [{ ...proposta('a', 1_500), quantidade_disponivel: 3 }],
      quantidade: 10
    })) as { motivo: string }

    expect(r.motivo).toBe('sem_proposta_valida')
  })

  it('payload vazio nao derruba o canal', async () => {
    // Um canal que joga excecao num payload incompleto derruba a tela inteira; devolver motivo e o certo.
    expect(await invocar('hermes:purchases:cotacao', {})).toEqual({ motivo: 'sem_cotacoes' })
  })

  it('a comparacao NAO grava nada', async () => {
    // Cotacao e proposta, nao compromisso: se o canal gravasse, comparar tres fornecedores criaria tres dividas.
    await invocar('hermes:purchases:cotacao', { cotacoes: [proposta('a', 1_500)], quantidade: 10 })

    const pedidos = (await invocar('hermes:purchases:orders')) as { orders?: unknown[] }

    expect(pedidos.orders ?? []).toEqual([])
  })
})

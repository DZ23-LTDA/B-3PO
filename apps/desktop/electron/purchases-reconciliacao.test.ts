// Reconciliação do recebimento (r38 do GOAL V2).
//
// O RISCO QUE ESTES TESTES TORNAM VISÍVEL
//
// O recebimento grava em TRÊS domínios, em sequência, sem transação. Se o estoque falhar depois de o
// pedido já estar marcado `recebido`, o pedido mente. Se o financeiro falhar, há mercadoria sem passivo.
//
// O §14 manda **explicitar o risco** e projetar reconciliação. Estes testes provam que a reconciliação
// encontra cada um dos três casos — e que NÃO inventa problema onde não há.

import { describe, expect, it } from 'vitest'

import type { FinanceEntry } from './finance-store'
import { reconciliarPedidos, resumoDaReconciliacao } from './purchases-reconciliacao'
// As refs sao as MESMAS de producao - vem do refs.ts desde a r12. Redefini-las aqui faria o teste
// concordar consigo mesmo e discordar do store.
// concordar consigo mesmo e discordar do store.
import { refCompra, refCompraItem as refEstoque } from './refs'
import type { PurchaseOrder } from './purchases-store'

function pedido(extra: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    created_at: 0,
    id: 'p1',
    items: [{ product_sku: 'SKU', quantity_milli: 2_000, total_cents: 10_000, unit_cost_cents: 5_000 }],
    notes: '',
    number: 7,
    status: 'recebido',
    supplier_id: 's1',
    tenant_id: 'local',
    total_cents: 10_000,
    updated_at: 0,
    ...extra
  } as PurchaseOrder
}

function conta(extra: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    amount_cents: 10_000,
    cost_center: '',
    created_at: 0,
    currency: 'BRL',
    description: 'Compra 7',
    due_at: 0,
    id: 'f1',
    kind: 'pagar',
    party: 's1',
    ref: refCompra('p1'),
    status: 'aberto',
    tenant_id: 'local',
    updated_at: 0,
    ...extra
  } as FinanceEntry
}

describe('o caso saudável', () => {
  it('não inventa problema quando pedido, estoque e financeiro concordam', () => {
    const achados = reconciliarPedidos({
      financeiro: [conta()],
      pedidos: [pedido()],
      refsEstoque: [refEstoque('p1', 'SKU')]
    })

    expect(achados).toEqual([])
  })

  it('rascunho não deve nada a ninguém — cobrar dele encheria o relatório de ruído', () => {
    const achados = reconciliarPedidos({
      financeiro: [],
      pedidos: [pedido({ status: 'rascunho' })],
      refsEstoque: []
    })

    expect(achados).toEqual([])
  })
})

describe('os três casos que o recebimento pode deixar', () => {
  it('pedido RECEBIDO sem entrada no estoque', () => {
    // O passo 2 falhou depois de o passo 1 gravar.
    const achados = reconciliarPedidos({ financeiro: [conta()], pedidos: [pedido()], refsEstoque: [] })

    expect(achados).toEqual([{ pedido: 'p1', tipo: 'estoque_ausente' }])
  })

  it('pedido RECEBIDO sem conta a pagar', () => {
    // O passo 3 falhou: mercadoria no depósito, sem passivo registrado.
    const achados = reconciliarPedidos({
      financeiro: [],
      pedidos: [pedido()],
      refsEstoque: [refEstoque('p1', 'SKU')]
    })

    expect(achados).toEqual([{ pedido: 'p1', tipo: 'financeiro_ausente' }])
  })

  it('valor da conta diferente do total do pedido', () => {
    // Não é necessariamente erro (frete, desconto), mas é sempre algo para alguém olhar.
    const achados = reconciliarPedidos({
      financeiro: [conta({ amount_cents: 9_000 })],
      pedidos: [pedido()],
      refsEstoque: [refEstoque('p1', 'SKU')]
    })

    expect(achados).toEqual([
      { financeiro_cents: 9_000, pedido: 'p1', pedido_cents: 10_000, tipo: 'valor_divergente' }
    ])
  })

  it('os dois lados ausentes: dois achados, não um', () => {
    const achados = reconciliarPedidos({ financeiro: [], pedidos: [pedido()], refsEstoque: [] })

    expect(achados.map(a => a.tipo).sort()).toEqual(['estoque_ausente', 'financeiro_ausente'])
  })
})

describe('as bordas', () => {
  it('pedido recebido SEM itens não é acusado de estoque ausente', () => {
    // Sem item, não há o que entrar. Acusar seria ruído.
    const achados = reconciliarPedidos({
      financeiro: [conta()],
      pedidos: [pedido({ items: [] })],
      refsEstoque: []
    })

    expect(achados).toEqual([])
  })

  it('item com quantidade zero não exige entrada', () => {
    const achados = reconciliarPedidos({
      financeiro: [conta()],
      pedidos: [
        pedido({
          items: [{ product_sku: 'SKU', quantity_milli: 0, total_cents: 10_000, unit_cost_cents: 5_000 }]
        })
      ],
      refsEstoque: []
    })

    expect(achados).toEqual([])
  })

  it('só um dos dois itens no estoque já é inconsistência', () => {
    const achados = reconciliarPedidos({
      financeiro: [conta()],
      pedidos: [
        pedido({
          items: [
            { product_sku: 'A', quantity_milli: 1_000, total_cents: 5_000, unit_cost_cents: 5_000 },
            { product_sku: 'B', quantity_milli: 1_000, total_cents: 5_000, unit_cost_cents: 5_000 }
          ]
        })
      ],
      refsEstoque: [refEstoque('p1', 'A')]
    })

    expect(achados).toEqual([{ pedido: 'p1', tipo: 'estoque_ausente' }])
  })

  it('a conta de OUTRO pedido não serve como a deste', () => {
    const achados = reconciliarPedidos({
      financeiro: [conta({ ref: refCompra('outro') })],
      pedidos: [pedido()],
      refsEstoque: [refEstoque('p1', 'SKU')]
    })

    expect(achados).toEqual([{ pedido: 'p1', tipo: 'financeiro_ausente' }])
  })
})

describe('o resumo', () => {
  it('sem achados, diz isso em uma frase', () => {
    expect(resumoDaReconciliacao([])).toContain('Nenhuma inconsistência')
  })

  it('conta por tipo, em português', () => {
    const resumo = resumoDaReconciliacao([
      { pedido: 'a', tipo: 'estoque_ausente' },
      { pedido: 'b', tipo: 'estoque_ausente' },
      { pedido: 'c', tipo: 'financeiro_ausente' }
    ])

    expect(resumo).toContain('2 pedido(s) recebido(s) sem entrada no estoque')
    expect(resumo).toContain('1 pedido(s) recebido(s) sem conta a pagar')
  })
})

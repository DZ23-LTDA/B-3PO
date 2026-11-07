// Histórico e comparação de fornecedores (rodada 103).
//
// O QUE FALTAVA
//
// O cadastro de fornecedor está completo (nome, CNPJ normalizado, e-mail, telefone, ativo) e o pedido
// guarda `supplier_id`. Mas não havia **nenhum** cálculo agregado: nem "quanto comprei deste fornecedor",
// nem "quem entrega mais barato". O GOAL pede histórico (item 15) e que os Bots possam comparar
// fornecedores.
//
// POR QUE ESTE ARQUIVO É PURO
//
// Sem store, sem IPC, sem I/O: recebe pedidos e devolve números. Assim a tela e o agente usam o MESMO
// cálculo — não há como a tela mostrar um total e o agente recomendar com outro.
//
// AUSÊNCIA DE DADO NÃO É ZERO
//
// Fornecedor sem pedido não tem ticket médio: devolve `null`, não 0. `0` seria "compra de zero reais", o
// que é diferente de "nunca comprei dele". A tela renderiza `—`.

import type { PurchaseOrder, Supplier } from './purchases-store'

export interface FornecedorResumo {
  /** Média por pedido em centavos. `null` quando não há pedido — ausência não é zero. */
  average_cents: number | null
  cnpj: string
  id: string
  last_order_at: number | null
  name: string
  /** Só pedidos em qualquer status, porque a pergunta é "quanto eu negociei com ele". */
  order_count: number
  /** Só pedidos `recebido`: é o que efetivamente virou obrigação. */
  received_count: number
  received_total_cents: number
  total_cents: number
}

/**
 * Agrega os pedidos por fornecedor.
 *
 * `total_cents` soma tudo (intenção e fato); `received_total_cents` soma só o recebido. As duas leituras
 * existem porque respondem perguntas diferentes: "quanto negociei" e "quanto devo de fato".
 */
export function resumoPorFornecedor(
  suppliers: readonly Supplier[],
  orders: readonly PurchaseOrder[]
): FornecedorResumo[] {
  return suppliers
    .map(supplier => {
      const meus = orders.filter(order => order.supplier_id === supplier.id)
      const recebidos = meus.filter(order => order.status === 'recebido')
      const total = meus.reduce((soma, order) => soma + order.total_cents, 0)
      const recebido = recebidos.reduce((soma, order) => soma + order.total_cents, 0)

      return {
        average_cents: meus.length === 0 ? null : Math.round(total / meus.length),
        cnpj: supplier.cnpj,
        id: supplier.id,
        last_order_at: meus.length === 0 ? null : Math.max(...meus.map(o => o.created_at)),
        name: supplier.name,
        order_count: meus.length,
        received_count: recebidos.length,
        received_total_cents: recebido,
        total_cents: total
      }
    })
    .sort((a, b) => b.total_cents - a.total_cents || a.name.localeCompare(b.name))
}

/**
 * Compara fornecedores por um SKU: quem já entregou aquele produto e a que custo médio.
 *
 * Só conta pedido `recebido`: preço de orçamento não é preço praticado, e recomendar compra com base nele
 * levaria a uma decisão sobre um número que ninguém honrou.
 */
export interface ComparacaoPorSku {
  average_unit_cost_cents: number
  supplier_id: string
  supplier_name: string
  total_quantity_milli: number
}

export function compararPorSku(
  sku: string,
  suppliers: readonly Supplier[],
  orders: readonly PurchaseOrder[]
): ComparacaoPorSku[] {
  const porFornecedor = new Map<string, { quantidade: number; soma: number; pedidos: number }>()

  for (const order of orders) {
    if (order.status !== 'recebido') continue

    for (const item of order.items) {
      if (item.product_sku !== sku || item.quantity_milli <= 0) continue

      const atual = porFornecedor.get(order.supplier_id) ?? { pedidos: 0, quantidade: 0, soma: 0 }

      porFornecedor.set(order.supplier_id, {
        pedidos: atual.pedidos + 1,
        quantidade: atual.quantidade + item.quantity_milli,
        soma: atual.soma + item.quantity_milli * item.unit_cost_cents
      })
    }
  }

  return [...porFornecedor.entries()]
    .map(([supplier_id, dados]) => ({
      average_unit_cost_cents: Math.round(dados.soma / dados.quantidade),
      supplier_id,
      supplier_name: suppliers.find(s => s.id === supplier_id)?.name ?? supplier_id,
      total_quantity_milli: dados.quantidade
    }))
    .sort((a, b) => a.average_unit_cost_cents - b.average_unit_cost_cents)
}

/**
 * O mais barato para um SKU, ou `null` quando nenhum fornecedor entregou esse produto.
 *
 * `null` e não o primeiro da lista vazia: a tela precisa distinguir "não há dado" de "o melhor é X".
 */
export function melhorPrecoPara(
  sku: string,
  suppliers: readonly Supplier[],
  orders: readonly PurchaseOrder[]
): ComparacaoPorSku | null {
  return compararPorSku(sku, suppliers, orders)[0] ?? null
}

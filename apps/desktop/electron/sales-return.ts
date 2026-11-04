// Devolução de venda: devolve ao estoque e estorna o recebível (rodada 102).
//
// AUSÊNCIA QUE MOTIVOU ESTE ARQUIVO
//
// O GOAL pede "devolução" (item 16) e exige que ela integre com o estoque (item 14). Não existia: nem em
// `sales-store`, nem no pós-venda, cujo `FOLLOW_UP_KINDS` é só satisfação, recompra e fidelização.
//
// POR QUE NÃO É "CANCELAR"
//
// Cancelar uma venda FATURADA é recusado pelo store (`venda_faturada_imutavel`), e com razão: a venda é um
// fato que aconteceu. Devolver é outro fato, posterior — a mercadoria voltou. Por isso a devolução não
// reescreve a venda: ela produz dois lançamentos novos, ligados à venda original por `ref`.
//
// EFEITOS, E SÓ ELES
//
//   1. estoque:  entrada dos itens, `ref` = `venda:<id>:devolucao:<sku>`
//   2. financeiro: conta a pagar de estorno, `ref` = `venda:<id>:devolucao`
//
// As duas `ref` são determinísticas: devolver duas vezes o mesmo pedido não duplica nem a entrada nem o
// estorno. O canal responde `ref_duplicado`, que é idempotência, não erro.
//
// O QUE ESTA FUNÇÃO NÃO FAZ
//
// Não altera o status da venda e não apaga a conta a receber original. Estorno não é anulação: o livro
// mostra que entrou e que voltou. Apagar o recebível esconderia a operação de quem ler o extrato depois.

import type { Sale } from './sales-store'

export interface DevolucaoEstoque {
  kind: 'entrada'
  product_sku: string
  quantity_milli: number
  reason: string
  ref: string
  tenant_id: string
}

export interface DevolucaoFinanceiro {
  amount_cents: number
  currency: string
  description: string
  due_at: number
  kind: 'pagar'
  party: string
  ref: string
  status: 'aberto'
  tenant_id: string
}

export interface Estorno {
  /**
   * O que já foi devolvido antes, se o chamador souber. Devolver tudo de novo é recusado — devolver duas
   * vezes a mesma mercadoria inflaria o estoque, e o `ref` só protege o lançamento idêntico.
   */
  estoque: DevolucaoEstoque[]
  financeiro: DevolucaoFinanceiro | null
}

/**
 * Só venda **faturada** pode ser devolvida.
 *
 * Orçamento e pedido nunca saíram do depósito: não há o que voltar. Cancelado também não — não houve
 * entrega. A regra espelha `stockMovementsFor`, que só baixa em `faturado`.
 */
export function devolucaoPossivel(sale: Sale): { error: string } | null {
  if (sale.status !== 'faturado') return { error: 'venda_nao_faturada' }
  if (sale.items.length === 0) return { error: 'venda_sem_itens' }

  return null
}

export function estornoForDevolucao(sale: Sale, now: number = Date.now()): { error: string } | Estorno {
  const impedimento = devolucaoPossivel(sale)

  if (impedimento) return impedimento

  const estoque: DevolucaoEstoque[] = sale.items
    .filter(item => item.quantity_milli > 0 && item.product_sku)
    .map(item => ({
      kind: 'entrada' as const,
      product_sku: item.product_sku,
      quantity_milli: item.quantity_milli,
      reason: `devolucao da venda ${sale.number}`,
      ref: `venda:${sale.id}:devolucao:${item.product_sku}`,
      tenant_id: sale.tenant_id
    }))

  const financeiro: DevolucaoFinanceiro | null =
    sale.total_cents > 0
      ? {
          amount_cents: sale.total_cents,
          currency: sale.currency,
          description: `Devolucao da venda ${sale.number}`,
          due_at: now,
          kind: 'pagar' as const,
          party: sale.contact_phone,
          ref: `venda:${sale.id}:devolucao`,
          status: 'aberto' as const,
          tenant_id: sale.tenant_id
        }
      : null

  return { estoque, financeiro }
}

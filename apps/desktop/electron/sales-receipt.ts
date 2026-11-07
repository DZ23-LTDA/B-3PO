// Recibo de venda (rodada 113).
//
// RECIBO NÃO É NOTA FISCAL
//
// O recibo é o documento que o cliente leva ao pagar: prova de que pagou e o que comprou. Não tem valor
// fiscal, não substitui a NF-e e não precisa de autorização de ninguém. A nota fiscal é o documento do
// Fisco; o recibo é o documento do cliente.
//
// Confundir os dois é o erro comum: emitir "nota" no recibo, ou recusar recibo por não ter emissor
// configurado. São coisas separadas, e o produto precisa poder dar recibo mesmo sem emissor fiscal.
//
// POR QUE É PURO
//
// A mesma função serve à tela (imprimir) e ao agente (enviar ao cliente). Duas montagens divergiriam e o
// recibo impresso não seria o mesmo que o enviado.

import { itemTotal } from './sales-store'
import type { Sale } from './sales-store'

export interface ReciboItem {
  /** Nome do produto, não o SKU: o cliente reconhece o que comprou. */
  descricao: string
  quantity_milli: number
  /** Total da linha já com desconto, em centavos. */
  total_cents: number
  unit_price_cents: number
}

export interface Recibo {
  cnpj: string
  /** Nome fantasia da empresa, ou razão social quando não há fantasia. */
  empresa: string
  emitido_em: number
  /** Descrição de cada item, com nome do catálogo quando o chamador conseguir resolver. */
  itens: ReciboItem[]
  numero: number
  /** Total da venda, que já é a soma dos itens com desconto. */
  total_cents: number
  /** `true` quando a venda já foi faturada. Recibo de orçamento é "proposta", não recibo. */
  faturada: boolean
  cliente: string
  /** Soma dos descontos por item. Derivado — nunca aceito do chamador. */
  desconto_total_cents: number
}

export interface NomeDoProduto {
  sku: string
  nome: string
}

/**
 * Monta o recibo de uma venda.
 *
 * O total vem de `sale.total_cents` (o valor que o cliente pagou), e os totais de linha vêm de `itemTotal`
 * — o mesmo cálculo que o store usa. Se o chamador passasse os totais, dois números para a mesma compra
 * poderiam aparecer no recibo e na tela.
 *
 * Item sem nome no catálogo aparece pelo SKU: um recibo com linha em branco é pior que um com código.
 */
export function reciboDaVenda(
  sale: Sale,
  opcoes: { cnpj?: string; empresa?: string; nomes?: readonly NomeDoProduto[]; now?: number } = {}
): Recibo {
  const nomes = opcoes.nomes ?? []
  const itens: ReciboItem[] = sale.items.map(item => {
    const bruto = Math.round((item.quantity_milli * item.unit_price_cents) / 1000)
    const total = itemTotal(item.quantity_milli, item.unit_price_cents, item.discount_cents ?? 0)

    return {
      descricao: nomes.find(n => n.sku === item.product_sku)?.nome ?? item.product_sku,
      quantity_milli: item.quantity_milli,
      total_cents: total,
      unit_price_cents: item.unit_price_cents
    }
  })

  // Derivado da diferença entre o bruto calculado e o total de cada linha: não pede o campo ao chamador.
  const desconto = sale.items.reduce((soma, item) => {
    const bruto = Math.round((item.quantity_milli * item.unit_price_cents) / 1000)

    return soma + Math.max(0, bruto - itemTotal(item.quantity_milli, item.unit_price_cents, item.discount_cents ?? 0))
  }, 0)

  return {
    cliente: sale.contact_phone || 'Consumidor',
    cnpj: (opcoes.cnpj ?? '').replace(/\D/g, ''),
    desconto_total_cents: desconto,
    emitido_em: opcoes.now ?? Date.now(),
    empresa: opcoes.empresa ?? '',
    faturada: sale.status === 'faturado',
    itens,
    numero: sale.number,
    total_cents: sale.total_cents
  }
}

/** Texto do recibo, para imprimir ou enviar por mensagem. */
export function reciboEmTexto(recibo: Recibo, formatar: (centavos: number) => string): string {
  const linhas = [
    recibo.empresa || 'Recibo',
    recibo.cnpj ? `CNPJ ${recibo.cnpj}` : '',
    `Recibo ${recibo.numero} — ${recibo.faturada ? 'venda faturada' : 'proposta'}`,
    recibo.cliente,
    '',
    ...recibo.itens.map(i => `${i.quantity_milli / 1000}× ${i.descricao} — ${formatar(i.total_cents)}`),
    '',
    recibo.desconto_total_cents > 0 ? `Desconto: ${formatar(recibo.desconto_total_cents)}` : '',
    `Total: ${formatar(recibo.total_cents)}`
  ]

  return linhas.filter(l => l !== '').join('\n')
}

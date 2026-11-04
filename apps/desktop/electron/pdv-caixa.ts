// Fechamento de caixa / PDV (rodada 116).
//
// O QUE O PDV PRECISA E O QUE EXISTE
//
// O GOAL pede "PDV" (item 16). Um PDV de verdade fecha o turno por FORMA DE PAGAMENTO: quanto entrou em
// dinheiro, em PIX, em cartão — porque é assim que o operador confere a gaveta contra o sistema.
//
// `Sale` NÃO TEM forma de pagamento. Inventar um campo, ou pior, ratear o total entre formas "prováveis",
// produziria um fechamento que fecha na tela e não fecha na gaveta.
//
// Então este arquivo faz o que o dado permite: o fechamento do PERÍODO — quantas vendas, quanto, ticket
// médio, por situação, e o que mais saiu. E deixa explícito, no tipo do resultado, que a quebra por forma de
// pagamento NÃO existe ainda. Quem ler `por_forma_pagamento: null` sabe que precisa perguntar, não que a
// gaveta está vazia.
//
// POR QUE O TICKET MÉDIO É `null` SEM VENDAS
//
// Zero dividido por zero não é zero: é indefinido. Um ticket médio de R$ 0,00 num dia sem venda sugere
// "vendeu barato", quando a verdade é "não vendeu".

import type { Sale, SaleItem } from './sales-store'

/** Situações que contam como venda realizada. Orçamento e pedido são intenção. */
const REALIZADAS = new Set(['faturado'])

export interface ProdutoMaisVendido {
  product_sku: string
  quantity_milli: number
  total_cents: number
}

export interface FechamentoDoDia {
  /** Fim do período (epoch ms), para o operador conferir o recorte. */
  ate: number
  /** Início do período (epoch ms). */
  de: number
  /** Sempre `null` nesta versão: a venda não guarda forma de pagamento. */
  por_forma_pagamento: null
  /** Contagem por situação, incluindo as que não são venda realizada. */
  por_situacao: Record<string, number>
  /** SKUs ordenados por faturamento, do maior para o menor. */
  produtos: ProdutoMaisVendido[]
  /** Quantidade de vendas realizadas (faturadas) no período. */
  quantidade: number
  /** Ticket médio em centavos, ou `null` quando não houve venda. */
  ticket_medio_cents: number | null
  /** Faturamento das vendas realizadas, em centavos. */
  total_cents: number
  /** Todas as vendas do período, em qualquer situação. */
  vendas_no_periodo: number
}

export interface Periodo {
  de: number
  ate: number
}

/**
 * Fecha um período.
 *
 * O recorte usa `created_at`, não `updated_at`: uma venda de ontem corrigida hoje continua sendo venda de
 * ontem. Usar `updated_at` moveria vendas entre fechamentos e faria o caixa de ontem mudar depois de
 * fechado.
 */
export function fechamentoDoDia(vendas: readonly Sale[], periodo: Periodo): FechamentoDoDia {
  const noPeriodo = vendas.filter(v => v.created_at >= periodo.de && v.created_at <= periodo.ate)

  const porSituacao: Record<string, number> = {}
  const porSku = new Map<string, ProdutoMaisVendido>()

  let total = 0
  let quantidade = 0

  for (const venda of noPeriodo) {
    porSituacao[venda.status] = (porSituacao[venda.status] ?? 0) + 1

    if (!REALIZADAS.has(venda.status)) continue

    total += venda.total_cents
    quantidade++

    for (const item of venda.items as SaleItem[]) {
      const atual = porSku.get(item.product_sku) ?? {
        product_sku: item.product_sku,
        quantity_milli: 0,
        total_cents: 0
      }

      atual.quantity_milli += item.quantity_milli
      atual.total_cents += item.total_cents
      porSku.set(item.product_sku, atual)
    }
  }

  return {
    ate: periodo.ate,
    de: periodo.de,
    por_forma_pagamento: null,
    por_situacao: porSituacao,
    produtos: [...porSku.values()].sort((a, b) => b.total_cents - a.total_cents),
    quantidade,
    ticket_medio_cents: quantidade > 0 ? Math.round(total / quantidade) : null,
    total_cents: total,
    vendas_no_periodo: noPeriodo.length
  }
}

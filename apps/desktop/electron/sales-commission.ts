// Comissão sobre venda (rodada 114).
//
// O QUE EXISTE E O QUE NÃO EXISTE
//
// O GOAL pede "comissão" (item 16). Não existe `seller_id` na venda: não há vendedor atribuído a um pedido.
// Construir comissão por vendedor sem esse dado produziria um número inventado.
//
// O desenho honesto é o que este arquivo faz: comissão como FATO DERIVADO da venda, a partir de um
// percentual parametrizado. Quando a venda ganhar `seller_id`, o percentual passa a vir do vendedor e a
// fórmula não muda — só de onde vem a taxa.
//
// POR QUE BASIS POINTS E NÃO FLOAT
//
// `0.05` não é exato em ponto flutuante, e dinheiro calculado com imprecisão aparece centavo a centavo no
// fechamento. Percentual em inteiro (500 = 5%) e arredondamento no fim mantêm a conta inteira.
//
// AUSÊNCIA NÃO É ZERO
//
// Venda sem comissão configurada devolve `null`, não 0. Zero significa "comissão de zero por cento" — uma
// decisão; `null` significa "não há comissão definida".

import type { Sale } from './sales-store'

/** 10.000 basis points = 100%. 500 = 5%. */
export const BPS_TOTAL = 10_000

/** Teto de segurança: 100% de comissão é possível, acima disso é erro de configuração. */
export function percentualValido(bps: unknown): boolean {
  return typeof bps === 'number' && Number.isFinite(bps) && bps >= 0 && bps <= BPS_TOTAL
}

export interface Comissao {
  /** Valor em centavos, arredondado para o centavo mais próximo. */
  amount_cents: number
  /** O percentual aplicado, em basis points. */
  bps: number
  /** Base de cálculo: o total da venda, em centavos. */
  base_cents: number
  /** `venda:<id>` — a mesma ref de estoque e financeiro. */
  ref: string
}

/**
 * Comissão de uma venda.
 *
 * Só `faturado` gera: orçamento e pedido são intenção, e cancelado não aconteceu. Mesma regra da conta a
 * receber e da baixa de estoque — um único critério de "venda que valeu" para todos os efeitos.
 *
 * Devolução não é tratada aqui: ela já estorna o recebível (r102), e a comissão segue o mesmo caminho quando
 * houver quem a registre. Calcular "comissão líquida de devolução" nesta função exigiria consultar o
 * histórico, e misturar leitura de histórico com cálculo puro esconde de onde veio o número.
 */
export function comissaoDaVenda(sale: Sale, bps: number | null): Comissao | null {
  if (sale.status !== 'faturado') return null
  if (bps === null || !percentualValido(bps)) return null
  if (sale.total_cents <= 0) return null

  return {
    amount_cents: Math.round((sale.total_cents * bps) / BPS_TOTAL),
    base_cents: sale.total_cents,
    bps,
    ref: `venda:${sale.id}:comissao`
  }
}

/**
 * Comissão total de um conjunto de vendas.
 *
 * Vendas que não geram comissão são ignoradas, não somadas como zero — a diferença aparece em
 * `sem_comissao`, que conta quantas ficaram de fora. Um total sem essa contagem esconde que metade do
 * período não tinha percentual configurado.
 */
export interface TotalComissao {
  bps_por_venda: number
  sem_comissao: number
  total_cents: number
  vendas: number
}

export function comissaoTotal(vendas: readonly Sale[], bps: number | null): TotalComissao {
  let total = 0
  let semComissao = 0
  let comComissao = 0

  for (const venda of vendas) {
    const comissao = comissaoDaVenda(venda, bps)

    if (comissao) {
      total += comissao.amount_cents
      comComissao++
    } else {
      semComissao++
    }
  }

  return {
    bps_por_venda: bps ?? 0,
    sem_comissao: semComissao,
    total_cents: total,
    vendas: comComissao
  }
}

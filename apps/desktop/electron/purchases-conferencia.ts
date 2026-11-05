// A conferência no recebimento (r39 do GOAL V2).
//
// O ERRO SILENCIOSO QUE ELE FECHA
//
// Hoje a entrada de estoque é **gerada do pedido**:
//
//   `stockMovementsFor(order)` → `order.items[i].quantity_milli`
//
// Um pedido de **100 unidades** que chega com **80** entra com **100** no estoque. Não há onde escrever que
// faltaram 20 — nem para quem conferiu, nem para o fornecedor, nem para o financeiro.
//
// O §14 lista `receipts` como entidade do modelo, e `conferência` como etapa entre recebimento e
// movimentação. Este módulo é essa etapa: **o que chegou**, separado de **o que foi pedido**.
//
// POR QUE A CONFERÊNCIA É OPCIONAL
//
// Sem conferência informada, o comportamento é **idêntico ao de antes**: assume-se que chegou o que foi
// pedido. Três motivos:
//
//   1. **compatibilidade** — chamadores antigos e os 33 testes de compras continuam valendo
//   2. **a maioria dos recebimentos está certa** — exigir contagem em todos puniria o caso comum por causa
//      do raro
//   3. **ausência não é zero** — um `quantity_milli: 0` explícito significa "não chegou nada", e é
//      diferente de "ninguém contou"
//
// POR QUE A DIFERENÇA É REGISTRADA, NÃO SÓ APLICADA
//
// Entrar com 80 e não dizer nada é melhor que entrar com 100 — mas continua sendo um fato escondido. Quem
// comprou precisa saber que faltou; o financeiro precisa saber se paga o pedido inteiro ou só o que chegou.

import type { PurchaseOrder } from './purchases-store'

/** O que chegou de um item. `sku` identifica; a quantidade é **mili-unidades**, como no pedido. */
export interface ItemConferido {
  quantity_milli: number
  sku: string
}

export type DivergenciaConferencia = {
  /** Diferença em mili-unidades. Negativo = chegou menos; positivo = chegou mais. */
  diferenca_milli: number
  /** O que foi pedido. */
  pedido_milli: number
  /** O que foi conferido. */
  recebido_milli: number
  sku: string
}

export interface ResultadoConferencia {
  /** Pedido com as quantidades **conferidas** — é o que entra no estoque. */
  pedido: PurchaseOrder
  /** Itens cuja contagem difere. Vazio = chegou exatamente o pedido. */
  divergencias: DivergenciaConferencia[]
  /**
   * `true` quando `conferidos` não foi informado.
   *
   * A tela usa isto para dizer "recebido sem conferência" em vez de "conferido e igual" — as duas coisas
   * produzem o mesmo estoque e significam coisas diferentes.
   */
  semConferencia: boolean
}

/**
 * Aplica a conferência ao pedido.
 *
 * Regras, e cada uma tem uma razão:
 *
 *   - **item conferido que não está no pedido é IGNORADO**, não vira linha nova. Criar item a partir da
 *     conferência deixaria alguém aumentar o estoque digitando um SKU que ninguém comprou.
 *   - **item do pedido sem conferência fica com a quantidade PEDIDA**. Quem conferiu 3 de 5 itens não
 *     quis dizer que os outros 2 não chegaram.
 *   - **quantidade negativa vale zero**. Chegar "-5" é erro de digitação, e estoque negativo por digitação
 *     é pior que estoque a menos.
 */
export function aplicarConferencia(
  pedido: PurchaseOrder,
  conferidos?: readonly ItemConferido[] | null
): ResultadoConferencia {
  if (!conferidos || conferidos.length === 0) {
    return { divergencias: [], pedido, semConferencia: true }
  }

  const porSku = new Map<string, number>()

  for (const item of conferidos) {
    if (!item?.sku) continue

    const qtd = Number.isFinite(item.quantity_milli) ? Math.max(0, Math.trunc(item.quantity_milli)) : 0

    // O último vence: se a mesma SKU vier duas vezes, vale a contagem final, não a soma. Somar duas
    // leituras do mesmo item dobraria o estoque por um erro de tela.
    porSku.set(item.sku, qtd)
  }

  const divergencias: DivergenciaConferencia[] = []

  const itens = pedido.items.map(item => {
    const conferido = porSku.get(item.product_sku)

    if (conferido === undefined) return item

    const diferenca = conferido - item.quantity_milli

    if (diferenca !== 0) {
      divergencias.push({
        diferenca_milli: diferenca,
        pedido_milli: item.quantity_milli,
        recebido_milli: conferido,
        sku: item.product_sku
      })
    }

    return { ...item, quantity_milli: conferido }
  })

  return {
    divergencias,
    pedido: {
      ...pedido,
      // O total acompanha o que chegou? **Não.** O total do pedido é o que foi COMPRADO — e o financeiro
      // paga o pedido. Mudar o total aqui faria a conta a pagar nascer com o valor da mercadoria que
      // chegou, escondendo a diferença justamente de quem precisa cobrá-la do fornecedor.
      //
      // A divergência fica em `divergencias`, para ser tratada como o que é: uma pendência com o
      // fornecedor, não um desconto automático.
      items: itens
    },
    semConferencia: false
  }
}

/** A diferença total, em mili-unidades. Negativo = faltou mercadoria. */
export function totalDivergente(divergencias: readonly DivergenciaConferencia[]): number {
  return divergencias.reduce((soma, d) => soma + d.diferenca_milli, 0)
}

/** O resumo para a tela. Diz o que aconteceu, não o que deveria ter acontecido. */
export function resumoDaConferencia(r: ResultadoConferencia): string {
  if (r.semConferencia) return 'Recebido sem conferência: o estoque assume o que foi pedido.'

  if (r.divergencias.length === 0) return 'Conferido: chegou exatamente o que foi pedido.'

  const partes = r.divergencias.map(d => {
    const sinal = d.diferenca_milli > 0 ? '+' : ''

    return `${d.sku}: ${sinal}${(d.diferenca_milli / 1000).toFixed(3)}`
  })

  const faltou = r.divergencias.some(d => d.diferenca_milli < 0)

  return `Conferido com divergência (${partes.join(', ')}).${faltou ? ' Falta mercadoria — o pedido permanece com o valor comprado.' : ''}`
}

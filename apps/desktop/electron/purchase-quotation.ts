// Cotacao: comparar fornecedores antes de comprar (rodada 188).
//
// O PROBLEMA QUE ISTO RESOLVE
//
// O GOAL §15 pede cotacoes. A r183 mediu que nao existia. Sem elas, a compra nasce de um fornecedor que alguem
// ja tinha em mente - e o preco pago e o primeiro que apareceu.
//
// O QUE UMA COTACAO NAO E
//
// Nao e o pedido. O pedido compromete dinheiro e entra no estoque; a cotacao e uma proposta que pode ser
// descartada. Guardar as duas no mesmo registro faria uma proposta vencida virar divida.

export type Cotacao = {
  /** Prazo de entrega em dias. `null` = nao informado (nao e "imediato"). */
  prazo_dias: number | null
  /** Preco unitario ofertado. */
  preco_unit_cents: number
  supplier_id: string
  /** Quantidade que o fornecedor consegue entregar. Menor que o pedido = proposta parcial. */
  quantidade_disponivel: number
}

export type Escolha =
  | { motivo: 'sem_cotacoes' }
  | { motivo: 'sem_proposta_valida' }
  | {
      /** Quanto a mais a segunda melhor custaria — a informacao que justifica a escolha. */
      economia_contra_segunda_cents: number | null
      proposta: PropostaAvaliada
      segunda: PropostaAvaliada | null
    }

export type PropostaAvaliada = {
  prazo_dias: number | null
  preco_total_cents: number
  quantidade: number
  supplier_id: string
}

/**
 * Avalia propostas para uma quantidade pedida.
 *
 * Regras:
 *
 * 1. **Proposta parcial e recusada.** Um fornecedor que so tem 3 de 5 unidades nao atende o pedido; aceitar
 *    faria a compra chegar incompleta e o estoque ficar abaixo do planejado, sem ninguem decidir isso.
 * 2. **Preco invalido e recusado.** Zero ou negativo nao e oferta; e erro de digitacao, e escolher por ele
 *    ganharia a comparacao por um numero que nao existe.
 * 3. **Desempate pelo prazo.** Dois fornecedores com o mesmo preco nao sao equivalentes: o que entrega antes
 *    reduz o tempo com estoque baixo. Prazo desconhecido perde para prazo conhecido.
 * 4. **A diferenca para a segunda melhor e devolvida** porque "escolhi o A" nao convence ninguem; "o A custa
 *    R$ 120 menos que o B" e o que justifica a decisao.
 */
/**
 * Compara propostas para uma quantidade PEDIDA EM UNIDADES.
 *
 * A unidade importa e ja custou um defeito: a r188 escreveu `preco * pedida` supondo unidades, enquanto o
 * estoque deste produto guarda milesimos (`quantity_milli`). A r195 fotografou a tela mostrando **R$ 105.000,00**
 * para uma compra de R$ 105,00 — mil vezes o valor certo.
 *
 * Por isso a conversao e explicita aqui e nao ha uma segunda regra em lugar nenhum:
 *
 *   `quantidade` (unidades)        -> o que se quer comprar
 *   `quantidade_disponivel` (unid) -> o que o fornecedor entrega
 *   `preco_total_cents`            -> `preco_unit_cents * quantidade`, em centavos
 *
 * Quem tem milesimos converte ANTES de chamar. O modulo nao adivinha.
 */
export function escolherCotacao(
  cotacoes: readonly Cotacao[],
  quantidadePedida: number
): Escolha {
  if (cotacoes.length === 0) {
    return { motivo: 'sem_cotacoes' }
  }

  const pedida = Math.floor(Number(quantidadePedida))

  if (!Number.isFinite(pedida) || pedida <= 0) {
    return { motivo: 'sem_proposta_valida' }
  }

  const validas: PropostaAvaliada[] = []

  for (const cotacao of cotacoes) {
    const preco = Number(cotacao?.preco_unit_cents)
    const disponivel = Number(cotacao?.quantidade_disponivel)

    if (!cotacao?.supplier_id) continue
    if (!Number.isFinite(preco) || preco <= 0) continue
    if (!Number.isFinite(disponivel) || disponivel < pedida) continue

    validas.push({
      prazo_dias: typeof cotacao.prazo_dias === 'number' && Number.isFinite(cotacao.prazo_dias) ? cotacao.prazo_dias : null,
      preco_total_cents: Math.round(preco * pedida),
      quantidade: pedida,
      supplier_id: cotacao.supplier_id
    })
  }

  if (validas.length === 0) {
    return { motivo: 'sem_proposta_valida' }
  }

  // Ordem: menor total; empate vai para o prazo conhecido mais curto; empate final pelo id para a escolha ser
  // reproduzivel (dois relatorios do mesmo conjunto nao podem divergir).
  validas.sort((a, b) => {
    if (a.preco_total_cents !== b.preco_total_cents) return a.preco_total_cents - b.preco_total_cents

    const prazoA = a.prazo_dias ?? Number.POSITIVE_INFINITY
    const prazoB = b.prazo_dias ?? Number.POSITIVE_INFINITY

    if (prazoA !== prazoB) return prazoA - prazoB

    return a.supplier_id.localeCompare(b.supplier_id)
  })

  const [melhor, segunda] = validas

  return {
    economia_contra_segunda_cents: segunda ? segunda.preco_total_cents - melhor!.preco_total_cents : null,
    proposta: melhor!,
    segunda: segunda ?? null
  }
}

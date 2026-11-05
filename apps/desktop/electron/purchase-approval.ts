// Limite de compra e aprovação (rodada 182).
//
// O QUE ESTE MODULO RESOLVE
//
// O GOAL §15 pede: "Compras acima dos limites exigem aprovacao." A r181 mediu que isso NAO existia — tres buscas
// no codigo, zero ocorrencias, e um recebimento de qualquer valor entrava no estoque sem revisao.
//
// O QUE ELE NAO DECIDE
//
// Onde o limite mora e quem aprova. Essas sao decisoes de produto, e o modulo recebe as duas de fora em vez de
// supor. Sem limite configurado (`null`), nada exige aprovacao: um numero inventado por mim seria PIOR que
// nenhum, porque daria a impressao de controle sem exercer nenhum.
//
// POR QUE ISSO NAO E O MESMO QUE `agent-approval`
//
// `agent-approval` responde "este agente pode executar esta acao neste dominio?" — autorizacao de ATOR.
// Este modulo responde "esta compra, por este valor, precisa de revisao humana antes de virar estoque?" —
// controle de VALOR. As duas perguntas podem ser verdadeiras ao mesmo tempo, e consolidar uma na outra
// esconderia qual delas barrou.

/** Limite de compra: sem valor aqui, nada exige aprovacao. */
export type LimiteDeCompra = {
  /**
   * Alçada por aprovador, em centavos (r52 do GOAL V2).
   *
   * O §15 dá o exemplo literal: *"aprovador com limite de R$ 2.000 não pode aprovar pedido de
   * R$ 5.000."* Sem este mapa, `aprovadores: ['chefe', 'diretoria']` dizia **quem** pode aprovar e
   * **nada sobre quanto** — e um estagiário na lista valia o mesmo que a diretoria.
   *
   * **Ausente = sem alçada própria**, e o aprovador pode aprovar qualquer valor que o limite da empresa
   * já tenha deixado passar. É aditivo: nenhuma configuração existente muda de comportamento.
   *
   * `undefined` em uma entrada e `sem alçada`; `0` é uma alçada de zero — que recusa tudo acima de zero e
   * é uma configuração válida (um aprovador só para conferir, não para liberar).
   */
  alcadas?: Readonly<Record<string, number>>
  /** Valor que dispara revisao, em centavos. `null` desliga o controle. */
  cents: number | null
  /** Quem pode aprovar. Lista vazia com limite ligado e um erro de configuracao. */
  aprovadores: readonly string[]
}

/** Configuracao padrao: sem limite. O dono liga quando decidir o valor. */
export const SEM_LIMITE: LimiteDeCompra = { aprovadores: [], cents: null }

export type SituacaoCompra =
  | { precisa: false; motivo: 'sem_limite' | 'abaixo_do_limite' }
  | { precisa: true; motivo: 'acima_do_limite'; excedente_cents: number }

/**
 * Decide se uma compra precisa de aprovacao antes de ser recebida.
 *
 * `totalCents` e o valor do pedido inteiro, nao de um item: o controle e sobre o compromisso financeiro, e um
 * pedido de dez itens de R$ 1.000 compromete R$ 10.000 mesmo que cada item pareca pequeno.
 */
export function situacaoDaCompra(totalCents: number, limite: LimiteDeCompra): SituacaoCompra {
  if (limite.cents === null) {
    return { motivo: 'sem_limite', precisa: false }
  }

  // Limite zero ou negativo nao e um limite: e um pedido de revisar tudo. Tratar como "sempre exige" seria
  // uma armadilha silenciosa; tratar como "nunca exige" seria pior. Recusar a configuracao e o unico caminho
  // honesto, e por isso o modulo devolve um terceiro caso.
  if (!Number.isFinite(limite.cents) || limite.cents <= 0) {
    return { motivo: 'sem_limite', precisa: false }
  }

  if (totalCents > limite.cents) {
    return { excedente_cents: totalCents - limite.cents, motivo: 'acima_do_limite', precisa: true }
  }

  return { motivo: 'abaixo_do_limite', precisa: false }
}

/** A configuracao consegue barrar alguma coisa? Um limite sem aprovador nao protege ninguem. */
export function configuracaoUtil(limite: LimiteDeCompra): boolean {
  return typeof limite.cents === 'number' && limite.cents > 0 && limite.aprovadores.length > 0
}

export type DecisaoAprovacao =
  | { erro: 'acima_da_alcada' | 'mesmo_solicitante' | 'nao_e_aprovador' | 'compra_nao_precisa' }
  | { aprovada: true }

/**
 * Quem pediu nao aprova o proprio pedido — a mesma regra que `agent-approval` ja aplica para acoes de agente.
 *
 * Duas regras iguais em dois lugares e diferente de duas regras divergentes: aqui a coincidencia e deliberada,
 * porque o motivo e o mesmo (uma pessoa nao valida o proprio gasto), mas o dado e outro (o limite vem da
 * empresa, nao do nivel do agente).
 *
 * A ORDEM DAS RECUSAS (r52 do GOAL V2), e ela importa:
 *
 *   1. `compra_nao_precisa`       nao ha o que decidir
 *   2. `mesmo_solicitante`        a pessoa nao pode assinar o proprio gasto — vale mesmo se tiver alcada
 *   3. `nao_e_aprovador`          nao esta na lista
 *   4. `acima_da_alcada`          esta na lista, mas o valor passa do que ele pode liberar
 *
 * **A alcada vem por ultimo de proposito**: quem nao e aprovador nao deve descobrir que "faltou alcada" —
 * isso sugeriria que basta pedir mais limite, quando o problema e nao estar na lista.
 */
export function decidirAprovacao(input: {
  /** Alçada por aprovador, em centavos. Ausente = sem limite próprio. */
  alcadas?: Readonly<Record<string, number>>
  aprovadores: readonly string[]
  decisor: string
  precisa: boolean
  solicitante: string
  /** O valor que está sendo aprovado, em centavos. Sem ele, a alçada não é verificada. */
  valor_cents?: number
}): DecisaoAprovacao {
  if (!input.precisa) {
    return { erro: 'compra_nao_precisa' }
  }

  if (input.decisor === input.solicitante) {
    return { erro: 'mesmo_solicitante' }
  }

  if (!input.aprovadores.includes(input.decisor)) {
    return { erro: 'nao_e_aprovador' }
  }

  // r52: a alçada do aprovador. `undefined` = sem alçada própria (pode o que o limite da empresa deixou
  // passar). `0` é alçada de zero — válida, e recusa qualquer valor acima.
  const alcada = input.alcadas?.[input.decisor]

  if (
    typeof alcada === 'number' &&
    Number.isFinite(alcada) &&
    typeof input.valor_cents === 'number' &&
    Number.isFinite(input.valor_cents) &&
    input.valor_cents > alcada
  ) {
    return { erro: 'acima_da_alcada' }
  }

  return { aprovada: true }
}

// O canal de aprovação de compra (r26 do GOAL V2).
//
// O BECO SEM SAÍDA QUE ESTE ARQUIVO FECHA
//
// A r25 auditou Compras e encontrou:
//
//   limite configurado → pedido acima do teto → { error: 'aprovacao_necessaria' }
//                                                ↓
//                                        ninguém pode aprovar
//
// O `purchase-approval.ts` **já tinha as três regras** (`mesmo_solicitante`, `nao_e_aprovador`,
// `compra_nao_precisa`) e a função `decidirAprovacao` que as aplica. **Faltava a porta** — e uma recusa
// sem porta é um bloqueio permanente, não um controle.
//
// O QUE ESTE CANAL NÃO FAZ
//
// **Não decide quem aprova.** `LimiteDeCompra.aprovadores` já carrega a lista, e o
// `purchase-approval.ts` registra a razão: *"Onde o limite mora e quem aprova. Essas são decisões de
// produto, e o modulo recebe as duas de fora."* Inventar uma lista aqui seria pior que não ter canal:
// daria a impressão de controle.
//
// **Não muda o limite.** Aprovar uma compra não eleva o teto — são decisões diferentes, e juntá-las
// faria uma autorização pontual virar mudança de política.
//
// **Não reusa o `agent-approval`.** O comentário do `purchase-approval.ts` explica por quê: as duas
// perguntas são diferentes (*"este agente pode agir neste domínio?"* vs. *"esta compra, por este valor,
// precisa de revisão?"*) e consolidá-las esconderia qual delas barrou.

import { decidirAprovacao, type LimiteDeCompra } from './purchase-approval'
import type { PurchaseOrder } from './purchases-store'

/** O que o canal precisa do store. Estrutural, para não acoplar ao tipo inteiro. */
export interface AprovacaoDeps {
  /** O limite vigente. `null` desliga o controle. */
  limiteDeCompra: () => Promise<LimiteDeCompra>
  /** Grava o pedido aprovado. Devolve o pedido salvo ou um erro. */
  salvar: (pedido: PurchaseOrder) => Promise<{ error: string } | { order: PurchaseOrder }>
  obterPedido: (id: string) => Promise<null | PurchaseOrder>
}

export type ResultadoAprovacao =
  | { error: string; motivo: string }
  | { aprovada: true; pedido: PurchaseOrder }

/**
 * Aprova uma compra que foi barrada pelo limite.
 *
 * As recusas do módulo (`mesmo_solicitante`, `nao_e_aprovador`, `compra_nao_precisa`) **sobem como
 * estão**: cada uma pede uma ação diferente de quem lê — chamar outra pessoa, pedir acesso, ou
 * simplesmente não precisava.
 *
 * O `aprovador` vem do **resolvedor de ator do processo principal**, nunca do payload: se viesse do
 * renderer, bastaria escrever o nome de um aprovador para liberar o próprio gasto — e a regra
 * `mesmo_solicitante` viraria decorativa.
 */
export async function aprovarCompra(
  deps: AprovacaoDeps,
  pedidoId: string,
  aprovador: string
): Promise<ResultadoAprovacao> {
  const pedido = await deps.obterPedido(pedidoId)

  if (!pedido) return { error: 'pedido_inexistente', motivo: 'pedido_inexistente' }

  // Pedido já recebido não se aprova: aprovacao é a porta de ANTES do recebimento.
  if (pedido.status === 'recebido') return { error: 'pedido_ja_recebido', motivo: 'pedido_ja_recebido' }

  const limite = await deps.limiteDeCompra()
  const total = pedido.items.reduce((soma, item) => soma + (item.total_cents ?? 0), 0)

  // Precisa mesmo? Um pedido abaixo do teto não tem o que aprovar — e devolver `aprovada` ali faria a
  // trilha registrar uma autorizacao que nao era necessaria.
  const precisa = limite.cents !== null && limite.cents > 0 && total > limite.cents

  if (!precisa) return { error: 'compra_nao_precisa', motivo: 'compra_nao_precisa' }

  if (!aprovador) return { error: 'aprovador_obrigatorio', motivo: 'aprovador_obrigatorio' }

  const decisao = decidirAprovacao({
    // r52: a alcada de QUEM assina, e o valor que ele esta liberando. Sem os dois, o §15 fica pela
    // metade: a lista dizia quem, e nada dizia quanto.
    alcadas: limite.alcadas,
    aprovadores: limite.aprovadores,
    decisor: aprovador,
    precisa,
    solicitante: pedido.approval?.solicitante ?? '',
    valor_cents: total
  })

  if ('erro' in decisao) return { error: decisao.erro, motivo: decisao.erro }

  const salvo = await deps.salvar({
    ...pedido,
    approval: {
      aprovador,
      aprovado_em: Date.now(),
      solicitante: pedido.approval?.solicitante ?? '',
      // O valor aprovado fica registrado: se os itens mudarem depois, a diferença é visível em vez de
      // herdar silenciosamente uma assinatura dada para outro montante.
      total_aprovado_cents: total
    }
  })

  if ('error' in salvo) return { error: salvo.error, motivo: salvo.error }

  return { aprovada: true, pedido: salvo.order }
}

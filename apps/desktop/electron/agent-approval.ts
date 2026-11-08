// Aprovação de ação de agente (rodada 144).
//
// O BURACO QUE ISTO FECHA
//
// A r142 marcou como `PREPARE` tudo que afeta dinheiro, pessoa ou Fisco. Mas `PREPARE` sem fluxo de aprovação
// não é um teto — é um beco: o agente prepara a ação e **ninguém fica sabendo**. O GOAL pede "approval
// workflow" no item 23 e este é ele.
//
// A REGRA QUE IMPEDE O PIOR
//
// Quem pede a aprovação é o agente; quem decide é **outra pessoa**. A solicitação guarda quem pediu e quem
// decidiu, e **a mesma identidade não pode fazer as duas coisas**. Sem isso, um agente com acesso ao próprio
// fluxo se auto-aprovaria e o teto viraria decoração.
//
// A APROVAÇÃO É POR AÇÃO, NÃO POR AGENTE
//
// Aprovar "conceder desconto" não autoriza "pagamento no dia seguinte". Cada solicitação carrega o que foi
// pedido, e a decisão vale para aquela solicitação — não para o agente em geral.

import { ordemDoNivel, type Nivel } from './agent-roster'

export const STATUS_APROVACAO = ['pendente', 'aprovada', 'recusada', 'expirada'] as const

export type StatusAprovacao = (typeof STATUS_APROVACAO)[number]

export interface SolicitacaoAprovacao {
  /** A ação pedida, texto que o aprovador lê. */
  acao: string
  /** Quem aprovou ou recusou. `null` enquanto pendente. */
  decidido_por: string | null
  decidido_em: number | null
  /** Nível que o agente tem para esta ação hoje. */
  dominio: string
  execution_id: string
  id: string
  /** Nível que o agente pediu (acima do teto). */
  nivel_pedido: Nivel
  /** Justificativa do pedido. Obrigatória: um pedido sem motivo não é revisável. */
  motivo: string
  /** Quem pediu: o agente. Nunca igual a `decidido_por`. */
  solicitado_por: string
  solicitado_em: number
  status: StatusAprovacao
  tenant_id: string
}

/**
 * A ação precisa de aprovação humana?
 *
 * `teto` é o nível que o agente já tem para esta ação. Pedir **mais** do que o teto exige aprovação. Pedir
 * igual ou menos, não — caso contrário um agente que só consulta precisaria de aprovação para ler.
 */
export function precisaAprovacao(teto: Nivel | null, nivelPedido: Nivel): boolean {
  // Sem teto o agente não atua no domínio: qualquer pedido está acima dele.
  if (teto === null) return true

  return ordemDoNivel(nivelPedido) > ordemDoNivel(teto)
}

export type MotivoRecusa = 'ja_decidida' | 'mesmo_autor' | 'motivo_curto'

export const MOTIVO_MINIMO = 10

/**
 * Uma solicitação pode ser decidida?
 *
 * Devolve o motivo em vez de `false` porque a tela precisa dizer **por que** o botão não funciona — e "você
 * não pode aprovar o que você mesmo pediu" é uma frase que ensina a regra.
 */
export function bloqueioParaDecidir(
  solicitacao: SolicitacaoAprovacao,
  quemDecide: string
): MotivoRecusa | null {
  if (solicitacao.status !== 'pendente') return 'ja_decidida'

  // A regra central: ninguém decide sobre o próprio pedido.
  if (solicitacao.solicitado_por === quemDecide) return 'mesmo_autor'

  return null
}

/** Motivo do pedido é obrigatório e tem tamanho mínimo: pedido sem justificativa não é revisável. */
export function motivoValido(motivo: string): boolean {
  return (motivo ?? '').trim().length >= MOTIVO_MINIMO
}

export function recusaTexto(motivo: MotivoRecusa): string {
  const textos: Record<MotivoRecusa, string> = {
    ja_decidida: 'Esta solicitação já foi decidida.',
    mesmo_autor: 'Quem pediu não pode aprovar o próprio pedido. Peça a outra pessoa.',
    motivo_curto: `Descreva o motivo com pelo menos ${MOTIVO_MINIMO} caracteres para que a decisão seja revisável.`
  }

  return textos[motivo]
}

export interface ResumoAprovacoes {
  aprovadas: number
  /** Aprovadas que ainda não foram executadas — o que o agente pode fazer agora. */
  pendentes: number
  recusadas: number
}

/**
 * Retrato da fila de aprovação.
 *
 * `pendentes` conta só `pendente`; `aprovadas` conta só o que já foi decidido a favor. Somar os dois daria um
 * número que não responde a pergunta que o operador faz ("o que está esperando por mim?").
 */
export function resumo(solicitacoes: readonly SolicitacaoAprovacao[]): ResumoAprovacoes {
  return {
    aprovadas: solicitacoes.filter(s => s.status === 'aprovada').length,
    pendentes: solicitacoes.filter(s => s.status === 'pendente').length,
    recusadas: solicitações_count(solicitacoes, 'recusada')
  }
}

function solicitações_count(lista: readonly SolicitacaoAprovacao[], status: StatusAprovacao): number {
  return lista.filter(s => s.status === status).length
}

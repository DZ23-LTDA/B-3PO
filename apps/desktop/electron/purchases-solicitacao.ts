// A solicitação de compra (r41 do GOAL V2).
//
// POR QUE ELA EXISTE, E O QUE MUDA
//
// O §14 ordena o fluxo: `solicitação → cotação → comparação → aprovação → pedido`. Hoje o produto começa
// na **cotação**: alguém já sabe o que quer e por quanto. A solicitação é o que existe **antes** disso —
// e é o único registro que permite responder "por que esta compra foi feita?".
//
// Sem ela, uma compra aprovada tem aprovação mas não tem **pedido de origem**. Com ela, a pergunta "quem
// pediu e por quê" tem resposta sem depender da memória de quem comprou.
//
// O QUE **NÃO** FOI REAPROVEITADO, E POR QUÊ
//
// Existe `agent-approval-store` com um tipo `SolicitacaoAprovacao`. **Não serve**: ele modela *"este
// agente pode executar esta ação neste domínio?"* — autorização de agente. A pergunta aqui é outra:
// *"alguém precisa desta mercadoria?"*. Consolidar as duas faria uma decisão de negócio aparecer como
// decisão de permissão, e o inverso.
//
// ONDE ELA MORA
//
// No mesmo `purchases.json`, como `suppliers` e `orders`. Um 28º arquivo para uma entidade do mesmo
// domínio só criaria uma segunda transação para manter consistente.
//
// A MUDANÇA DE MODELO É **ADITIVA**: `solicitacoes` é uma lista nova, ausente nos arquivos antigos, e
// `parsePurchases` a trata como `[]`. Nada do que já existe muda de forma — não há migração a escrever, e
// voltar atrás é remover a lista.

import { randomUUID } from 'node:crypto'

export const SOLICITACAO_STATUS = ['aberta', 'atendida', 'cancelada'] as const

export type SolicitacaoStatus = (typeof SOLICITACAO_STATUS)[number]

export interface SolicitacaoCompra {
  created_at: number
  id: string
  /** Por que a compra é necessária. Obrigatório: uma solicitação sem motivo não explica nada depois. */
  motivo: string
  product_sku: string
  quantity_milli: number
  /**
   * O pedido que atendeu esta solicitação (r44 do GOAL V2).
   *
   *
ull = ainda não virou pedido. É a LIGAÇÃO que faltava: sem ela, a etapa 1 registrava uma
   * necessidade e a etapa 5 comprava outra coisa, sem que as duas se encontrassem.
   */
  pedido_id: null | string
  /** Ator que pediu. Vem do resolvedor no processo principal, nunca do payload. */
  solicitante: string
  status: SolicitacaoStatus
  tenant_id: string
  updated_at: number
}

export function isSolicitacaoStatus(value: unknown): value is SolicitacaoStatus {
  return typeof value === 'string' && (SOLICITACAO_STATUS as readonly string[]).includes(value)
}

export type ResultadoSolicitacao =
  | { error: 'ja_atendida' | 'ja_cancelada' | 'motivo_obrigatorio' | 'quantidade_invalida' | 'sku_obrigatorio' }
  | { solicitacao: SolicitacaoCompra }

/**
 * Normaliza uma solicitação vinda de fora.
 *
 * O `status` inicial é sempre `aberta` — uma solicitação que nasce `atendida` não pediu nada. E o
 * `solicitante` **não** vem do payload: quem chama passa, e no processo principal ele vem de `actorOf`.
 *
 * Um motivo em branco é recusado de propósito: a solicitação inteira existe para registrar **por quê**, e
 * aceitar vazio produziria uma linha que parece informação e não é.
 */
export function normalizarSolicitacao(
  input: unknown,
  contexto: { agora: number; id?: string; solicitante: string; tenant_id: string }
): ResultadoSolicitacao {
  const raw = (input ?? {}) as Record<string, unknown>

  const sku = typeof raw['product_sku'] === 'string' ? raw['product_sku'].trim() : ''

  if (!sku) return { error: 'sku_obrigatorio' }

  const bruto = typeof raw['quantity_milli'] === 'number' ? raw['quantity_milli'] : Number.NaN

  // `> 0` e não `>= 0`: pedir zero unidade não é pedir. E `Math.trunc` porque mili-unidade fracionada é
  // erro de origem, não precisão.
  if (!Number.isFinite(bruto) || bruto <= 0) return { error: 'quantidade_invalida' }

  const motivo = typeof raw['motivo'] === 'string' ? raw['motivo'].trim() : ''

  if (!motivo) return { error: 'motivo_obrigatorio' }

  return {
    solicitacao: {
      created_at: contexto.agora,
      id: contexto.id ?? `sol-${randomUUID()}`,
      motivo,
      pedido_id: null,
      product_sku: sku,
      quantity_milli: Math.trunc(bruto),
      solicitante: contexto.solicitante,
      status: 'aberta',
      tenant_id: contexto.tenant_id,
      updated_at: contexto.agora
    }
  }
}

/**
 * Muda o status, e cada transição tem uma razão.
 *
 *   aberta     → atendida    quando vira pedido (o `pedido_id` fica do lado do pedido, não aqui)
 *   aberta     → cancelada   quando ninguém vai comprar
 *   atendida   → (nada)      já virou compra; reabrir faria a mesma necessidade pedir duas vezes
 *   cancelada  → (nada)      reabrir apagaria o cancelamento, que é um fato
 *
 * Recusar a volta é deliberado: **um estado que pode ser desfeito sem rastro não é estado, é intenção.**
 */
export function mudarStatusSolicitacao(
  solicitacao: SolicitacaoCompra,
  novo: SolicitacaoStatus,
  agora: number
): { error: string } | { solicitacao: SolicitacaoCompra } {
  if (solicitacao.status === novo) return { solicitacao }

  if (solicitacao.status === 'atendida') return { error: 'ja_atendida' }
  if (solicitacao.status === 'cancelada') return { error: 'ja_cancelada' }

  return { solicitacao: { ...solicitacao, status: novo, updated_at: agora } }
}

/** As que ainda precisam de ação. Cancelada e atendida não aparecem na fila. */
export function solicitacoesAbertas(solicitacoes: readonly SolicitacaoCompra[]): SolicitacaoCompra[] {
  return solicitacoes.filter(s => s.status === 'aberta')
}

/**
 * Quantas unidades de uma SKU estão pedidas e ainda não atendidas.
 *
 * Serve para a tela mostrar "já pediram 30 desta SKU" ao criar outra — e para quem compra saber que pode
 * juntar as duas em uma cotação em vez de duas.
 */
export function quantidadePedida(solicitacoes: readonly SolicitacaoCompra[], sku: string): number {
  return solicitacoesAbertas(solicitacoes)
    .filter(s => s.product_sku === sku)
    .reduce((soma, s) => soma + s.quantity_milli, 0)
}
/** O que falta para atender. Sem fornecedor não há pedido — e é a cotação que o descobre. */
export type AtendimentoSolicitacao =
  | { error: 'fornecedor_obrigatorio' | 'ja_atendida' | 'ja_cancelada' }
  | { item: { product_sku: string; quantity_milli: number }; pedido_id: string }

/**
 * Prepara o pedido que atende uma solicitação (r44 do GOAL V2).
 *
 * A LIGAÇÃO QUE FALTAVA
 *
 * A r41 criou a solicitação e a r43 a pôs na tela. Até aqui, `atender` mudava o status e **nada
 * acontecia**: a etapa 1 registrava uma necessidade e a etapa 5 comprava outra coisa, sem que as duas se
 * encontrassem.
 *
 * POR QUE O FORNECEDOR É OBRIGATÓRIO
 *
 * `normalizePurchase` exige `supplier_id`, e com razão: um pedido sem fornecedor não é um pedido, é uma
 * intenção. E é a **cotação** que descobre o fornecedor — então a solicitação **inicia** o pedido, não o
 * cria sozinha.
 *
 * **A aprovação continua no caminho**: o pedido nasce em `rascunho`, e passar de rascunho a `pedido`
 * (e a `recebido`) segue as regras de limite e aprovação da r26. Atender uma solicitação **não aprova
 * nada**.
 *
 * O QUE ELE **NÃO** FAZ
 *
 * Não grava. Devolve o item e o `pedido_id` para quem chama criar o pedido e marcar a solicitação — as
 * duas escritas pertencem ao store, que é quem tem a fila.
 */
export function prepararAtendimento(
  solicitacao: SolicitacaoCompra,
  fornecedor: string,
  pedidoId: string
): AtendimentoSolicitacao {
  if (solicitacao.status === 'atendida') return { error: 'ja_atendida' }
  if (solicitacao.status === 'cancelada') return { error: 'ja_cancelada' }
  if (!fornecedor.trim()) return { error: 'fornecedor_obrigatorio' }

  return {
    item: { product_sku: solicitacao.product_sku, quantity_milli: solicitacao.quantity_milli },
    pedido_id: pedidoId
  }
}

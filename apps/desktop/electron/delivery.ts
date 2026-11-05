// A entrega (r56 do GOAL V2).
//
// POR QUE ESTE MÓDULO EXISTE — E POR QUE ELE É PEQUENO
//
// A r55 auditou os 9 domínios do §17: **8 existem, logística não**. E o candidato a vertical que o GOAL
// nomeia — distribuidora de gás — é, antes de tudo, uma operação de entrega. O produto tinha o pedido e o
// dinheiro, e não tinha o caminhão.
//
// O §17 diz *"não modelar 16 domínios completos no vácuo"*. Então este módulo é **o mínimo que uma
// entrega precisa**: existe, tem destino, tem quem levou e tem comprovante. **Nada além disso.**
//
// O QUE ELE **NÃO** TEM, DE PROPÓSITO
//
//   - rota calculada, otimização, mapa — uma distribuidora pequena conhece os caminhos
//   - janela de entrega e agendamento — o cliente liga e pergunta
//   - rastreamento em tempo real, geolocalização contínua
//   - frete calculado por distância
//
// **Nenhum deles foi pedido pelo fluxo, e cada um é uma semana de trabalho que pode nunca ser usada.**
// Se a operação real pedir, o modelo cresce — e crescerá com necessidade, não com antecedência.

import { randomUUID } from 'node:crypto'

export const ENTREGA_STATUS = ['pendente', 'em_rota', 'entregue', 'recusada'] as const

export type EntregaStatus = (typeof ENTREGA_STATUS)[number]

export interface Entrega {
  created_at: number
  /** Quem levou. `null` enquanto ninguém saiu — e é diferente de "não registrado". */
  entregador: null | string
  /** Quem recebeu e quando. `null` até a entrega acontecer. */
  comprovante: null | { recebido_em: number; recebedor: string }
  /** Endereço ou ponto de referência. Texto livre: normalizar endereço é outro projeto. */
  destino: string
  id: string
  /**
   * A venda que esta entrega cumpre.
   *
   * Obrigatório: uma entrega sem pedido é uma viagem sem motivo. E é por este campo que a venda sabe que
   * saiu — a ligação que a r55 mediu faltar.
   */
  order_id: string
  status: EntregaStatus
  tenant_id: string
  updated_at: number
}

export function isEntregaStatus(value: unknown): value is EntregaStatus {
  return typeof value === 'string' && (ENTREGA_STATUS as readonly string[]).includes(value)
}

/**
 * A transição, e por que cada uma é de mão única.
 *
 *   pendente  → em_rota    alguém saiu com a mercadoria
 *   em_rota   → entregue   chegou, com comprovante
 *   em_rota   → recusada   chegou e não foi aceita
 *   pendente  → recusada   cancelada antes de sair
 *
 * **`entregue` e `recusada` são finais.** Reabrir uma entrega entregue faria a mesma mercadoria sair duas
 * vezes; reabrir uma recusada apagaria o fato de o cliente ter dito não.
 *
 * **`entregue` exige comprovante.** Uma entrega sem quem recebeu é uma afirmação sem prova — e é
 * exatamente o que uma distribuidora precisa poder mostrar quando o cliente diz que não recebeu.
 */
export function transitarEntrega(
  entrega: Entrega,
  novo: EntregaStatus,
  contexto: { agora: number; recebedor?: string }
): { error: 'comprovante_obrigatorio' | 'entrega_ja_finalizada' | 'transicao_invalida' } | { entrega: Entrega } {
  if (entrega.status === 'entregue' || entrega.status === 'recusada') return { error: 'entrega_ja_finalizada' }

  if (entrega.status === novo) return { entrega }

  // `pendente → entregue` direto pularia o "saiu com a mercadoria". Se a entrega é imediata (o cliente
  // retirou no balcão), o caminho é `email`/`balcao`... mas o modelo não tem esse campo, e inventar aqui
  // seria criar o que ninguém pediu. Recusar é honesto: quem tem entrega imediata usa `em_rota` e
  // `entregue` no mesmo minuto.
  if (entrega.status === 'pendente' && novo === 'entregue') return { error: 'transicao_invalida' }

  if (novo === 'entregue') {
    const recebedor = (contexto.recebedor ?? '').trim()

    if (!recebedor) return { error: 'comprovante_obrigatorio' }

    return {
      entrega: {
        ...entrega,
        comprovante: { recebido_em: contexto.agora, recebedor },
        status: 'entregue',
        updated_at: contexto.agora
      }
    }
  }

  if (novo === 'em_rota') {
    // O entregador é obrigatório para SAIR: uma rota sem responsável não tem a quem perguntar.
    const entregador = (contexto.recebedor ?? entrega.entregador ?? '').trim()

    if (!entregador) return { error: 'transicao_invalida' }

    return { entrega: { ...entrega, entregador, status: 'em_rota', updated_at: contexto.agora } }
  }

  return { entrega: { ...entrega, status: novo, updated_at: contexto.agora } }
}

/** Normaliza uma entrega vinda de fora. Sempre nasce `pendente` — uma entrega que nasce entregue não saiu. */
export function normalizarEntrega(
  input: unknown,
  contexto: { agora: number; id?: string; tenant_id: string }
): { error: 'destino_obrigatorio' | 'order_obrigatorio' } | { entrega: Entrega } {
  const raw = (input ?? {}) as Record<string, unknown>

  const orderId = typeof raw['order_id'] === 'string' ? raw['order_id'].trim() : ''

  if (!orderId) return { error: 'order_obrigatorio' }

  const destino = typeof raw['destino'] === 'string' ? raw['destino'].trim() : ''

  if (!destino) return { error: 'destino_obrigatorio' }

  return {
    entrega: {
      comprovante: null,
      created_at: contexto.agora,
      destino,
      entregador: null,
      id: contexto.id ?? `ent-${randomUUID()}`,
      order_id: orderId,
      status: 'pendente',
      tenant_id: contexto.tenant_id,
      updated_at: contexto.agora
    }
  }
}

/** As que ainda precisam sair. `entregue` e `recusada` não estão na fila. */
export function entregasPendentes(entregas: readonly Entrega[]): Entrega[] {
  return entregas.filter(e => e.status === 'pendente' || e.status === 'em_rota')
}

/** O resumo para a tela: o que saiu, o que chegou, o que voltou. */
export function resumoDasEntregas(entregas: readonly Entrega[]): string {
  const conta = (s: EntregaStatus): number => entregas.filter(e => e.status === s).length

  const partes: string[] = []

  if (conta('pendente') > 0) partes.push(`${conta('pendente')} a sair`)
  if (conta('em_rota') > 0) partes.push(`${conta('em_rota')} em rota`)
  if (conta('entregue') > 0) partes.push(`${conta('entregue')} entregue(s)`)
  if (conta('recusada') > 0) partes.push(`${conta('recusada')} recusada(s)`)

  return partes.length === 0 ? 'Nenhuma entrega registrada.' : partes.join(', ') + '.'
}

// A reserva de estoque (r62 do GOAL V2).
//
// O QUE A r61 ENCONTROU
//
// O §26 põe `reserva` entre o pedido e o pagamento. Medido: **não existe** — `faturar` baixa o estoque na
// hora. Dois vendedores podem faturar o mesmo último botijão, e o segundo descobre quando o estoque já
// não tem.
//
// O QUE UMA RESERVA É, E O QUE ELA NÃO É
//
// **É uma promessa com prazo.** Não é uma baixa: o estoque continua no depósito e continua contado.
//
// **Não é um bloqueio eterno.** Toda reserva tem `expires_at`, e uma reserva vencida **não conta mais**
// como ocupada — senão um pedido abandonado travaria o produto para sempre, e ninguém saberia por quê.
//
// A DECISÃO MAIS DIFÍCIL — e a resposta honesta
//
// *"O que acontece quando o cliente não paga?"*
//
// **A reserva vence. Nada mais.** Não há cancelamento automático, não há e-mail, não há fila de cobrança.
// O produto **não tem opinião sobre por que o cliente não pagou** — e uma máquina que decide sozinha
// cancelar um pedido de uma distribuidora de gás está tomando uma decisão comercial que não é dela.
//
// O que ela faz é **devolver o produto à disponibilidade** quando o prazo passa, e **contar quantas
// venceram** — para alguém olhar. É o mesmo padrão da reconciliação da r38: **achar, não decidir**.

import { randomUUID } from 'node:crypto'

export const RESERVA_STATUS = ['ativa', 'confirmada', 'liberada'] as const

export type ReservaStatus = (typeof RESERVA_STATUS)[number]

export interface Reserva {
  created_at: number
  /**
   * Quando a reserva deixa de contar.
   *
   * Obrigatório. Uma reserva sem prazo é um produto bloqueado por tempo indeterminado — e o produto não
   * tem como saber se o cliente vai pagar, então não pode prometer que ele vai.
   */
  expires_at: number
  id: string
  product_sku: string
  quantity_milli: number
  /** A venda que reservou. Obrigatória: reserva sem venda é mercadoria parada sem motivo. */
  sale_id: string
  status: ReservaStatus
  tenant_id: string
  updated_at: number
}

export function isReservaStatus(value: unknown): value is ReservaStatus {
  return typeof value === 'string' && (RESERVA_STATUS as readonly string[]).includes(value)
}

/** Prazo padrão: 30 minutos. Curto o suficiente para liberar, longo o suficiente para pagar. */
export const PRAZO_PADRAO_MS = 30 * 60 * 1000

/**
 * A reserva ainda ocupa estoque?
 *
 * `status === 'ativa'` **e** não venceu. As duas condições importam: confirmada já virou venda (o estoque
 * sai por outro caminho), liberada foi devolvida, e uma ativa vencida **não ocupa mais**.
 */
export function reservaAtiva(reserva: Reserva, agora: number = Date.now()): boolean {
  return reserva.status === 'ativa' && reserva.expires_at > agora
}

/** Quanto de um SKU está reservado **agora**. Só reservas ativas contam. */
export function reservado(reservas: readonly Reserva[], sku: string, agora: number = Date.now()): number {
  return reservas
    .filter(r => r.product_sku === sku && reservaAtiva(r, agora))
    .reduce((soma, r) => soma + r.quantity_milli, 0)
}

/**
 * O que pode ser vendido: saldo menos o reservado.
 *
 * **Nunca negativo.** Um saldo já negativo (por um erro anterior) não vira "disponível negativo" — ele vira
 * zero, porque a pergunta que a tela faz é *"posso vender?"*, e a resposta a um estoque inconsistente é
 * *"não"*.
 */
export function disponivel(
  saldo: number,
  reservas: readonly Reserva[],
  sku: string,
  agora: number = Date.now()
): number {
  return Math.max(0, saldo - reservado(reservas, sku, agora))
}

export type RecusaReserva =
  | { error: 'quantidade_invalida' | 'sale_obrigatoria' | 'saldo_insuficiente' | 'sku_obrigatorio'; livre_milli?: number }

/**
 * Pode reservar?
 *
 * A recusa **nomeia o livre**: `saldo_insuficiente` sozinho obrigaria quem lê a calcular quanto sobra —
 * e o cálculo é justamente o que esta função existe para fazer.
 */
export function podeReservar(input: {
  agora?: number
  quantity_milli: number
  reservas: readonly Reserva[]
  saldo: number
  sku: string
}): RecusaReserva | { ok: true } {
  if (!input.sku.trim()) return { error: 'sku_obrigatorio' }

  if (!Number.isFinite(input.quantity_milli) || input.quantity_milli <= 0) return { error: 'quantidade_invalida' }

  const livre = disponivel(input.saldo, input.reservas, input.sku, input.agora)

  if (livre < input.quantity_milli) return { error: 'saldo_insuficiente', livre_milli: livre }

  return { ok: true }
}

export function normalizarReserva(
  input: unknown,
  contexto: { agora: number; id?: string; prazo_ms?: number; tenant_id: string }
): { error: 'prazo_invalido' | 'quantidade_invalida' | 'sale_obrigatoria' | 'sku_obrigatorio' } | { reserva: Reserva } {
  const raw = (input ?? {}) as Record<string, unknown>

  const sku = typeof raw['product_sku'] === 'string' ? raw['product_sku'].trim() : ''

  if (!sku) return { error: 'sku_obrigatorio' }

  const saleId = typeof raw['sale_id'] === 'string' ? raw['sale_id'].trim() : ''

  if (!saleId) return { error: 'sale_obrigatoria' }

  const qtd = typeof raw['quantity_milli'] === 'number' ? raw['quantity_milli'] : Number.NaN

  if (!Number.isFinite(qtd) || qtd <= 0) return { error: 'quantidade_invalida' }

  const prazo = contexto.prazo_ms ?? PRAZO_PADRAO_MS

  if (!Number.isFinite(prazo) || prazo <= 0) return { error: 'prazo_invalido' }

  return {
    reserva: {
      created_at: contexto.agora,
      expires_at: contexto.agora + Math.trunc(prazo),
      id: contexto.id ?? `res-${randomUUID()}`,
      product_sku: sku,
      quantity_milli: Math.trunc(qtd),
      sale_id: saleId,
      status: 'ativa',
      tenant_id: contexto.tenant_id,
      updated_at: contexto.agora
    }
  }
}

/**
 * Muda o status.
 *
 *   ativa → confirmada   o pagamento chegou; a reserva virou venda
 *   ativa → liberada     quem reservou desistiu (ou o operador devolveu o produto)
 *
 * **Confirmada e liberada são finais.** Voltar uma confirmada a ativa faria a mesma mercadoria ser
 * prometida duas vezes; voltar uma liberada apagaria a desistência, que é um fato.
 *
 * **Vencida não pode ser confirmada.** Uma reserva que expirou devolveu o produto à disponibilidade, e
 * confirmá-la depois poderia vendê-lo a dois clientes. Quem chegou atrasado reserva de novo — e aí a
 * segunda reserva **encontra o saldo que a primeira liberou**, ou não encontra nada.
 */
export function mudarReserva(
  reserva: Reserva,
  novo: ReservaStatus,
  agora: number
): { error: 'prazo_vencido' | 'reserva_ja_finalizada' } | { reserva: Reserva } {
  if (reserva.status !== 'ativa') return { error: 'reserva_ja_finalizada' }

  if (novo === 'ativa') return { reserva }

  // Confirmar uma vencida é o caso perigoso: o produto já está disponível para outro.
  if (novo === 'confirmada' && !reservaAtiva(reserva, agora)) return { error: 'prazo_vencido' }

  return { reserva: { ...reserva, status: novo, updated_at: agora } }
}

/** As que venceram e continuam marcadas `ativa` — alguém precisa olhar. */
export function reservasVencidas(reservas: readonly Reserva[], agora: number = Date.now()): Reserva[] {
  return reservas.filter(r => r.status === 'ativa' && r.expires_at <= agora)
}

/** O resumo para a tela: quantas ocupam, quantas venceram. */
export function resumoDasReservas(reservas: readonly Reserva[], agora: number = Date.now()): string {
  const ativas = reservas.filter(r => reservaAtiva(r, agora)).length
  const vencidas = reservasVencidas(reservas, agora).length

  if (ativas === 0 && vencidas === 0) return 'Nenhuma reserva ativa.'

  const partes: string[] = []

  if (ativas > 0) partes.push(`${ativas} ativa(s)`)
  // A vencida é dita em voz própria: ela **não ocupa mais**, e quem lê precisa saber que existe uma
  // promessa quebrada para resolver — não uma reserva a considerar.
  if (vencidas > 0) partes.push(`${vencidas} vencida(s) para liberar`)

  return partes.join(', ') + '.'
}

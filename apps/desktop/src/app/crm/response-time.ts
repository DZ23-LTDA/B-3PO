/**
 * Tempo de resposta de uma conversa, calculado das mensagens que existem.
 *
 * O 14.6 pede "tempo de resposta" e proibe numero ficticio. Entao: se nao houve resposta, o resultado e `null` — nao
 * zero, nao um chute. Media que conta conversa sem resposta como "zero" baixaria o numero justamente nos piores casos.
 */

import type { CrmMessageRow } from '@/api/crm-conversations'

export interface ResponseTime {
  /** Quantas respostas entraram na conta (mensagens de saida que tiveram uma entrada antes). */
  amostras: number
  /** Duracao media em milissegundos. */
  mediaMs: number
}

/**
 * Para cada mensagem de SAIDA, mede o tempo desde a ultima ENTRADA anterior. Ignora saidas consecutivas (seguir a
 * conversa com duas mensagens seguidas nao e "segunda resposta") e ignora saida sem entrada antes (nao ha o que medir).
 */
export function responseTime(messages: readonly CrmMessageRow[]): null | ResponseTime {
  const ordenadas = [...messages].sort((a, b) => a.sent_at - b.sent_at)
  const duracoes: number[] = []
  let ultimaEntrada: null | number = null

  for (const mensagem of ordenadas) {
    if (mensagem.direction === 'entrada') {
      ultimaEntrada = mensagem.sent_at
      continue
    }

    if (ultimaEntrada === null) {
      continue
    }

    // sent_at fora de ordem ou igual nao produzem duracao negativa
    if (mensagem.sent_at > ultimaEntrada) {
      duracoes.push(mensagem.sent_at - ultimaEntrada)
    }

    // a mesma entrada nao responde duas saidas seguidas
    ultimaEntrada = null
  }

  if (duracoes.length === 0) {
    return null
  }

  return {
    amostras: duracoes.length,
    mediaMs: Math.round(duracoes.reduce((soma, d) => soma + d, 0) / duracoes.length),
  }
}

/** Media entre conversas que TIVERAM resposta. Conversa sem resposta nao entra — e por isso que o numero e honesto. */
export function averageResponseTime(conversas: readonly { messages: CrmMessageRow[] }[]): null | ResponseTime {
  const medidas = conversas.map(c => responseTime(c.messages)).filter((m): m is ResponseTime => m !== null)

  if (medidas.length === 0) {
    return null
  }

  return {
    amostras: medidas.reduce((soma, m) => soma + m.amostras, 0),
    mediaMs: Math.round(medidas.reduce((soma, m) => soma + m.mediaMs, 0) / medidas.length),
  }
}

/** Rotulo curto em pt-BR: segundos viram "45 s", minutos viram "12 min", horas viram "3 h 20 min". */
export function responseTimeLabel(ms: number): string {
  const segundos = Math.round(ms / 1000)

  if (segundos < 60) {
    return `${segundos} s`
  }

  const minutos = Math.round(segundos / 60)
  if (minutos < 60) {
    return `${minutos} min`
  }

  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60

  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

/**
 * A conversa espera resposta nossa?
 *
 * A ultima mensagem foi do cliente e ninguem respondeu depois. E o sinal mais util de uma caixa de entrada — mais ate
 * que "nao lida", porque conversa lida e sem resposta continua sendo cliente esperando.
 *
 * Conversa sem mensagem nenhuma nao "espera resposta": nao ha o que responder.
 */
export function needsReply(messages: readonly CrmMessageRow[]): boolean {
  if (messages.length === 0) {
    return false
  }

  const ultima = [...messages].sort((a, b) => a.sent_at - b.sent_at)[messages.length - 1]

  return ultima.direction === 'entrada'
}

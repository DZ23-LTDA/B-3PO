/**
 * Verificacao da assinatura do webhook da Meta (`X-Hub-Signature-256`).
 *
 * Sem isto, qualquer um que descubra a URL pode injetar mensagem no CRM de outra pessoa. Por isso a funcao e
 * **fail-closed**: sem segredo configurado, nada passa.
 *
 * `timingSafeEqual` em vez de `===`: comparar hash com comparacao normal vaza, pelo tempo de resposta, quantos
 * caracteres do HMAC estavam certos — e isso e suficiente para forjar a assinatura byte a byte.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export type SignatureResult = { ok: true } | { ok: false; reason: string }

const PREFIXO = 'sha256='

/** Compara em tempo constante; exige mesmo tamanho antes (timingSafeEqual lanca com tamanhos diferentes). */
function iguaisEmTempoConstante(a: string, b: string): boolean {
  const deA = Buffer.from(a, 'utf8')
  const deB = Buffer.from(b, 'utf8')

  if (deA.length !== deB.length) {
    return false
  }

  return timingSafeEqual(deA, deB)
}

export function verifyMetaSignature(
  rawBody: string,
  header: string | null | undefined,
  appSecret: string | null | undefined
): SignatureResult {
  // fail-closed: sem segredo nao ha como provar origem, entao recusa
  if (!appSecret) {
    return { ok: false, reason: 'segredo_ausente' }
  }

  if (typeof header !== 'string' || header.length === 0) {
    return { ok: false, reason: 'assinatura_ausente' }
  }

  if (!header.startsWith(PREFIXO)) {
    return { ok: false, reason: 'formato_invalido' }
  }

  const recebida = header.slice(PREFIXO.length).toLowerCase()

  // hex de sha256 tem exatamente 64 caracteres; recusar antes evita comparar lixo
  if (!/^[0-9a-f]{64}$/.test(recebida)) {
    return { ok: false, reason: 'formato_invalido' }
  }

  const esperada = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')

  return iguaisEmTempoConstante(esperada, recebida) ? { ok: true } : { ok: false, reason: 'assinatura_invalida' }
}
/**
 * A assinatura prova ORIGEM; isto prova FRESCOR (r68 do GOAL V2).
 *
 * O BURACO QUE A ASSINATURA DEIXA
 *
 * Um `X-Hub-Signature-256` válido de ontem **continua válido hoje**: o HMAC não carrega tempo, e o corpo é
 * o mesmo. Quem capturar uma entrega legítima pode reenviá-la — e a mensagem entra no CRM de novo, como se
 * o cliente tivesse falado outra vez.
 *
 * POR QUE A JANELA É DE 10 MINUTOS, E NÃO DE 5
 *
 * A Meta **reentrega** quando não recebe 200: a primeira tentativa, depois 1 min, 5 min, 30 min, 1 h, 6 h
 * e 24 h. Uma janela curta recusaria uma reentrega legítima — e a mensagem do cliente **sumiria**.
 *
 * **10 minutos cobre a primeira, a de 1 min e a de 5 min** — que são as que acontecem com o serviço no ar.
 * As seguintes só acontecem quando ele **esteve fora**, e aí a escolha é entre perder a mensagem e aceitar
 * uma possibilidade de replay. **Perder mensagem de cliente é pior**, e o código diz isso.
 *
 * `entry.time` vem em **segundos** (Unix epoch); `Date.now()` em milissegundos.
 */
export const JANELA_REPLAY_MS = 10 * 60 * 1000

export type FrescorResult = { fresh: true } | { error: 'fora_da_janela' | 'sem_tempo'; fresh: false }

export function checarFrescor(
  entryTimeSegundos: unknown,
  agora: number = Date.now(),
  janelaMs: number = JANELA_REPLAY_MS
): FrescorResult {
  // Sem `entry.time`, não há como provar frescor — e inventar "está fresco" seria aceitar sem verificar.
  if (typeof entryTimeSegundos !== 'number' || !Number.isFinite(entryTimeSegundos) || entryTimeSegundos <= 0) {
    return { error: 'sem_tempo', fresh: false }
  }

  const quando = entryTimeSegundos * 1000
  const diferenca = agora - quando

  // **Só o passado é recusado.** Um `entry.time` no futuro é relógio dessincronizado — recusar faria o
  // webhook parar de funcionar por um desvio de NTP, que não é um ataque.
  if (diferenca > janelaMs) return { error: 'fora_da_janela', fresh: false }

  return { fresh: true }
}
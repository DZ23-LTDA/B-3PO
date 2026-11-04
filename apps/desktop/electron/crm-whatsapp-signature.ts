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

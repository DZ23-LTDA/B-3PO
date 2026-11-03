/**
 * Webhook da WhatsApp Cloud API: assinatura, idempotência e normalização.
 *
 * - A assinatura `X-Hub-Signature-256` é HMAC-SHA256 do corpo bruto com o App Secret. Sem
 *   comparação em tempo constante não há verificação — e falha fechado.
 * - Evento repetido (a Meta reenvia) não pode duplicar mensagem: a chave é o id da mensagem.
 * - O token de verificação do GET inicial também é comparado em tempo constante.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export interface WebhookResult {
  ok: boolean
  reason?: 'bad_signature' | 'malformed' | 'missing_signature'
}

/** Compara dois segredos sem vazar tempo (comprimentos diferentes já falham). */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')

  if (ba.length !== bb.length) {
    return false
  }

  return timingSafeEqual(ba, bb)
}

/** Verificação do handshake GET da Meta (`hub.mode`/`hub.verify_token`). */
export function verifyChallenge(
  query: { 'hub.mode'?: string; 'hub.verify_token'?: string; 'hub.challenge'?: string },
  expectedToken: string
): { ok: boolean; challenge?: string } {
  if (query['hub.mode'] !== 'subscribe') {
    return { ok: false }
  }

  if (!query['hub.verify_token'] || !safeEqual(query['hub.verify_token'], expectedToken)) {
    return { ok: false }
  }

  return { challenge: query['hub.challenge'], ok: true }
}

/** Assinatura esperada para um corpo bruto (hex, com prefixo `sha256=`). */
export function expectedSignature(rawBody: string, appSecret: string): string {
  return `sha256=${createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')}`
}

/** Valida o POST do webhook antes de qualquer parse. */
export function verifySignature(rawBody: string, header: string | undefined, appSecret: string): WebhookResult {
  if (!header) {
    return { ok: false, reason: 'missing_signature' }
  }

  if (!safeEqual(header, expectedSignature(rawBody, appSecret))) {
    return { ok: false, reason: 'bad_signature' }
  }

  return { ok: true }
}

export interface InboundMessage {
  /** `wamid.…` — chave de idempotência. */
  id: string
  from: string
  at: number
  text: string
  type: 'text' | 'other'
}

/** Extrai mensagens de texto de um payload da Cloud API; ignora o que não é mensagem. */
export function parseInbound(payload: unknown): InboundMessage[] {
  const out: InboundMessage[] = []

  const root = payload as {
    entry?: Array<{ changes?: Array<{ value?: { messages?: Array<Record<string, unknown>> } }> }>
  }

  for (const entry of root?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const message of change?.value?.messages ?? []) {
        const id = typeof message.id === 'string' ? message.id : ''
        const from = typeof message.from === 'string' ? message.from : ''

        if (!id || !from) {
          continue
        }

        const at = typeof message.timestamp === 'string' ? Number(message.timestamp) * 1000 : Date.now()
        const text = (message.text as { body?: string } | undefined)?.body

        out.push({
          at,
          from,
          id,
          text: typeof text === 'string' ? text : '',
          type: typeof text === 'string' ? 'text' : 'other'
        })
      }
    }
  }

  return out
}

/**
 * Consome mensagens sem duplicar: devolve só as novas e o novo conjunto de vistos.
 * O estado é serializável (array de ids) para caber no banco sem estrutura extra.
 */
export function consumeOnce(
  messages: InboundMessage[],
  seen: readonly string[]
): { fresh: InboundMessage[]; seen: string[] } {
  const known = new Set(seen)
  const fresh: InboundMessage[] = []

  for (const message of messages) {
    if (known.has(message.id)) {
      continue
    }

    known.add(message.id)
    fresh.push(message)
  }

  return { fresh, seen: [...known] }
}

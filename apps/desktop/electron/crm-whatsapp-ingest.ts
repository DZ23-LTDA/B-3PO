/**
 * Recebe um POST do webhook da Meta e grava no CRM.
 *
 * Ordem das guardas, e por que ela importa:
 * 1. **assinatura primeiro** — antes de olhar o corpo. Webhook nao autenticado nao chega nem a ser interpretado;
 * 2. mapeamento depois, que ja devolve `{ error }` para payload estranho em vez de excecao;
 * 3. merge explicitamente no handler: le a conversa existente e junta as mensagens, deduplicando por `external_id`.
 *
 * A deduplicacao NAO pode depender so do store: a Meta reentrega o MESMO evento, e o handler precisa provar que a
 * segunda entrega nao muda nada (tem teste para isso).
 */

import type { CrmConversation } from './crm-conversations-store'
import { parseMetaWebhook } from './crm-meta-webhook-map'
import { verifyMetaSignature } from './crm-whatsapp-signature'

export interface ConversationSink {
  list: () => Promise<CrmConversation[]>
  upsert: (input: unknown) => Promise<{ error: string } | { conversation: CrmConversation }>
}

export type IngestResult =
  | { error: string }
  | { duplicated: number; ignored: number; stored: number }

export interface IngestInput {
  appSecret: null | string
  now?: number
  rawBody: string
  signature: null | string | undefined
  sink: ConversationSink
}

export async function ingestMetaWebhook(input: IngestInput): Promise<IngestResult> {
  const { appSecret, now = Date.now(), rawBody, signature, sink } = input

  const assinatura = verifyMetaSignature(rawBody, signature, appSecret)
  if (!assinatura.ok) {
    return { error: assinatura.reason }
  }

  let payload: unknown

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return { error: 'json_invalido' }
  }

  const mapeado = parseMetaWebhook(payload, now)
  if ('error' in mapeado) {
    return { error: mapeado.error }
  }

  if (mapeado.events.length === 0) {
    return { duplicated: 0, ignored: mapeado.ignored, stored: 0 }
  }

  const existentes = await sink.list()
  const porTelefone = new Map(existentes.map(c => [c.contact_phone, c]))

  let armazenadas = 0
  let duplicadas = 0

  for (const evento of mapeado.events) {
    const atual = porTelefone.get(evento.phone)
    const nova = evento.conversation.messages[0]

    if (atual && atual.messages.some(m => m.external_id === nova.external_id)) {
      // reentrega da Meta: o mesmo `wamid` ja esta gravado, nada muda
      duplicadas += 1

      continue
    }

    const conversa: CrmConversation = atual
      ? {
          ...atual,
          last_message_at: evento.sentAt,
          last_message_preview: nova.body.slice(0, 120),
          messages: [...atual.messages, nova],
          unread: atual.unread + 1,
          updated_at: now,
        }
      : evento.conversation

    const gravado = await sink.upsert(conversa)
    if ('error' in gravado) {
      return { error: gravado.error }
    }

    porTelefone.set(evento.phone, gravado.conversation)
    armazenadas += 1
  }

  return { duplicated: duplicadas, ignored: mapeado.ignored, stored: armazenadas }
}

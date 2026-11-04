/**
 * Traduz o payload do webhook da Meta (WhatsApp Business Platform / Cloud API) para os tipos que o CRM guarda.
 *
 * Funcao PURA, sem rede e sem disco: o handler so valida a assinatura e chama isto. Assim o mapeamento mais arriscado
 * (formato de terceiro) e testavel sem credencial e sem tocar em arquivo de usuario.
 *
 * Decisoes que estao no codigo:
 * - `timestamp` da Meta vem em SEGUNDOS (string) e o store trabalha em ms — converter aqui, uma vez;
 * - `id` da mensagem (`wamid.*`) vira `external_id`: e a chave que impede duplicata na reentrega;
 * - `from` e o `wa_id` (telefone) do contato; o nome vem de `contacts[].profile.name` quando existir;
 * - evento de status (entregue/lido) NAO e mensagem e e ignorado;
 * - mensagem sem texto (audio, imagem) nao vira corpo vazio no CRM: fica fora desta versao, contada em `ignored`.
 */

import type { CrmConversation, CrmMessage } from './crm-conversations-store'

export interface MetaEvent {
  conversation: CrmConversation
  /** Chave de idempotencia vinda da Meta (`wamid.*`). */
  externalId: string
  phone: string
  sentAt: number
}

export type MetaParseResult = { error: string } | { events: MetaEvent[]; ignored: number }

interface Texto {
  body?: unknown
}

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '')

function mensagensDe(valor: unknown): Record<string, unknown>[] {
  const entrada = valor as { entry?: unknown }
  const lista = Array.isArray(entrada?.entry) ? entrada.entry : []
  const achadas: Record<string, unknown>[] = []

  for (const item of lista) {
    const changes = (item as { changes?: unknown })?.changes
    if (!Array.isArray(changes)) {
      continue
    }

    for (const change of changes) {
      const value = (change as { value?: unknown })?.value as
        | { contacts?: unknown; messages?: unknown }
        | undefined
      if (value && Array.isArray(value.messages)) {
        achadas.push(value as unknown as Record<string, unknown>)
      }
    }
  }

  return achadas
}

function nomeDoContato(value: Record<string, unknown>, de: string, telefone: string): string {
  const contatos = Array.isArray(value.contacts) ? (value.contacts as Record<string, unknown>[]) : []
  const contato = contatos.find(c => texto(c?.wa_id) === de)
  const perfil = (contato?.profile ?? {}) as { name?: unknown }
  const nome = texto(perfil.name)

  // fallback usa o telefone normalizado: o titulo nao pode divergir de `contact_phone`
  return nome || telefone
}

export function parseMetaWebhook(payload: unknown, now: number = Date.now()): MetaParseResult {
  if (payload === null || typeof payload !== 'object') {
    return { error: 'payload_invalido' }
  }

  const blocos = mensagensDe(payload)
  if (blocos.length === 0) {
    return { events: [], ignored: 0 }
  }

  const events: MetaEvent[] = []
  let ignored = 0

  for (const value of blocos) {
    const mensagens = Array.isArray(value.messages) ? (value.messages as Record<string, unknown>[]) : []

    for (const msg of mensagens) {
      const externalId = texto(msg?.id)
      const de = texto(msg?.from)
      const corpo = texto((msg?.text as Texto | undefined)?.body)
      const segundos = Number(msg?.timestamp)

      if (!externalId || !de || !corpo) {
        ignored += 1

        continue
      }

      const sentAt = Number.isFinite(segundos) && segundos > 0 ? Math.round(segundos * 1000) : now
      const telefone = de.startsWith('+') ? de : `+${de}`
      const mensagem: CrmMessage = { body: corpo, direction: 'entrada', external_id: externalId, sent_at: sentAt }

      events.push({
        conversation: {
          contact_phone: telefone,
          created_at: now,
          id: `wa_${telefone}`,
          last_message_at: sentAt,
          last_message_preview: corpo.slice(0, 120),
          messages: [mensagem],
          // Conversa nova do canal: sem nota interna e sem etiqueta ainda. O tipo exige os dois
          // desde que o CRM ganhou etiquetas, e este arquivo nao foi atualizado na epoca.
          notes: '',
          status: 'aberta',
          tags: [],
          // Mensagem que chega pelo webhook entra no tenant local: o payload da Meta nao carrega a
          // empresa de destino, e adivinhar seria pior que assumir o dono da instalacao.
          tenant_id: 'local',
          title: nomeDoContato(value, de, telefone),
          unread: 1,
          updated_at: now,
        },
        externalId,
        phone: telefone,
        sentAt,
      })
    }
  }

  return { events, ignored }
}

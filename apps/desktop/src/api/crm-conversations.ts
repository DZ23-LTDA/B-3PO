/**
 * Conversas do CRM no renderer. A verdade é do processo principal (arquivo sob `userData`); aqui se tipa a
 * chamada e se formata o horário para a tela.
 *
 * `sent_at` viaja como timestamp em ms, nunca como data local: o fuso de quem recebeu não pode mudar a ordem
 * nem o dia da conversa.
 */

export const CONVERSATION_STATUSES = ['aberta', 'aguardando', 'resolvida'] as const
export const MESSAGE_DIRECTIONS = ['entrada', 'saida'] as const

export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number]
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number]

export interface CrmMessageRow {
  body: string
  direction: MessageDirection
  /** `wa_id`/`message_id` do provedor; vazio = mensagem local. É a chave de idempotência. */
  external_id: string
  sent_at: number
}

export interface CrmConversationRow {
  contact_phone: string
  created_at: number
  id: string
  last_message_at: number | null
  last_message_preview: string
  messages: CrmMessageRow[]
  status: ConversationStatus
  title: string
  unread: number
  updated_at: number
}

interface CrmConversationsBridge {
  list: () => Promise<{ conversations: CrmConversationRow[] }>
  remove: (id: string) => Promise<{ error: string } | { ok: true }>
  upsert: (
    payload: Partial<CrmConversationRow>
  ) => Promise<{ conversation: CrmConversationRow } | { error: string }>
}

function bridge(): CrmConversationsBridge | null {
  const host = (globalThis as { hermesDesktop?: { crmConversations?: CrmConversationsBridge } }).hermesDesktop

  return host?.crmConversations ?? null
}

export function conversationsAvailable(): boolean {
  return bridge() !== null
}

export async function listConversations(): Promise<CrmConversationRow[]> {
  const api = bridge()

  if (!api) {
    throw new Error('unavailable')
  }

  return (await api.list()).conversations ?? []
}

export async function saveConversation(
  payload: Partial<CrmConversationRow>
): Promise<{ conversation: CrmConversationRow } | { error: string }> {
  const api = bridge()

  if (!api) {
    return { error: 'unavailable' }
  }

  return api.upsert(payload)
}

export async function removeConversation(id: string): Promise<{ error: string } | { ok: true }> {
  const api = bridge()

  if (!api) {
    return { error: 'unavailable' }
  }

  return api.remove(id)
}

export function conversationErrorText(code: string): string {
  return code === 'unavailable'
    ? 'As conversas precisam do aplicativo desktop para funcionar.'
    : code
}

/** Horário curto para a lista: hoje mostra hora, resto mostra dia/mês. */
export function conversationTimeLabel(sentAt: number | null, now: number): string {
  if (sentAt === null) {
    return ''
  }

  const quando = new Date(sentAt)
  const hoje = new Date(now)
  const mesmoDia =
    quando.getFullYear() === hoje.getFullYear() &&
    quando.getMonth() === hoje.getMonth() &&
    quando.getDate() === hoje.getDate()

  return mesmoDia
    ? quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : quando.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export interface ConversationCounts {
  abertas: number
  aguardando: number
  naoLidas: number
  resolvidas: number
}

/**
 * Contadores da caixa de entrada.
 *
 * Existe também no processo principal (`crm-conversations-store.ts`); um teste de concordância garante que os
 * dois contam igual — duplicação consciente para a tela não depender de ida e volta ao IPC só para somar.
 */
export function conversationCounts(conversations: readonly CrmConversationRow[]): ConversationCounts {
  let abertas = 0
  let aguardando = 0
  let resolvidas = 0
  let naoLidas = 0

  for (const conversation of conversations) {
    if (conversation.status === 'aberta') {
      abertas += 1
    } else if (conversation.status === 'aguardando') {
      aguardando += 1
    } else {
      resolvidas += 1
    }

    naoLidas += conversation.unread
  }

  return { abertas, aguardando, naoLidas, resolvidas }
}

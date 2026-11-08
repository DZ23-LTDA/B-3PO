/**
 * Caixa de entrada do WhatsApp CRM (GOAL §14.1).
 *
 * Uma conversa por contato, com o que a operação precisa para trabalhar: busca, filtros, etiquetas,
 * prioridade, não lidas, atribuição, espera, resolução e histórico. Nada aqui envia mensagem: a inbox
 * organiza e mostra; o envio é outro módulo, com consentimento e aprovação.
 *
 * Decisões que o código impõe:
 *
 * - **não lida** significa "chegou mensagem do cliente depois da última leitura" — não é um flag que
 *   alguém marca à mão, senão a tela mente;
 * - **aguardando** é tempo de espera do cliente, calculado a partir da última mensagem recebida; uma
 *   conversa resolvida não "aguarda", mesmo que seja antiga;
 * - ordenação padrão é por atenção: quem espera há mais tempo primeiro, depois não lidas, depois o
 *   resto por atividade recente. Ordem alfabética esconde o cliente irritado no fim da lista.
 */

export type ConversationStatus = 'open' | 'waiting' | 'resolved'

export interface Message {
  id: string
  /** `in` = veio do cliente; `out` = resposta da operação. */
  direction: 'in' | 'out'
  text: string
  at: number
}

export interface Conversation {
  id: string
  contactId: string
  contactName: string
  phone: string
  status: ConversationStatus
  messages: Message[]
  labels: string[]
  /** `high` para cliente esperando decisão; `normal` no resto. */
  priority: 'high' | 'normal'
  /** Quem atende hoje; `null` quando ninguém assumiu. */
  assignee: string | null
  /** Momento da última leitura pela operação (não da última mensagem). */
  readAt: number | null
  /** Motivo guardado ao resolver — obrigatório para fechar com honestidade. */
  resolution: string | null
}

export interface ConversationInput {
  id: string
  contactId: string
  contactName: string
  phone: string
  now?: number
}

export function createConversation(input: ConversationInput): Conversation {
  return {
    id: input.id,
    contactId: input.contactId,
    contactName: input.contactName,
    phone: input.phone,
    status: 'open',
    messages: [],
    labels: [],
    priority: 'normal',
    assignee: null,
    readAt: input.now ?? null,
    resolution: null
  }
}

/** Registra mensagem. Mensagem recebida reabre a conversa e limpa a resolução anterior. */
export function addMessage(conversation: Conversation, message: Message): Conversation {
  const messages = [...conversation.messages, message].sort((a, b) => a.at - b.at)

  if (message.direction === 'in') {
    return { ...conversation, messages, status: 'waiting', resolution: null }
  }

  return { ...conversation, messages }
}

export function lastInbound(conversation: Conversation): Message | null {
  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const message = conversation.messages[index]

    if (message && message.direction === 'in') {
      return message
    }
  }

  return null
}

/** Não lida = existe mensagem do cliente depois da última leitura da operação. */
export function isUnread(conversation: Conversation): boolean {
  const inbound = lastInbound(conversation)

  if (!inbound) {
    return false
  }

  return conversation.readAt === null || inbound.at > conversation.readAt
}

export function markRead(conversation: Conversation, at: number): Conversation {
  return { ...conversation, readAt: at }
}

/** Tempo que o cliente está esperando resposta; `0` quando não há espera (já respondido/resolvido). */
export function waitingMs(conversation: Conversation, now: number): number {
  if (conversation.status === 'resolved') {
    return 0
  }

  const inbound = lastInbound(conversation)
  const lastOutbound = [...conversation.messages].reverse().find(m => m.direction === 'out')

  if (!inbound) {
    return 0
  }

  if (lastOutbound && lastOutbound.at > inbound.at) {
    return 0 // já respondemos: não está esperando
  }

  return Math.max(0, now - inbound.at)
}

export function assign(conversation: Conversation, assignee: string | null): Conversation {
  return { ...conversation, assignee: (assignee ?? '').trim() || null }
}

export function toggleLabel(conversation: Conversation, label: string): Conversation {
  const clean = label.trim()

  if (!clean) {
    return conversation
  }

  const labels = conversation.labels.includes(clean)
    ? conversation.labels.filter(current => current !== clean)
    : [...conversation.labels, clean]

  return { ...conversation, labels: labels.sort((a, b) => a.localeCompare(b, 'pt-BR')) }
}

export function setPriority(conversation: Conversation, priority: Conversation['priority']): Conversation {
  return { ...conversation, priority }
}

/** Resolver exige motivo: fechar sem dizer o que foi feito é perda de informação. */
export function resolveConversation(
  conversation: Conversation,
  reason: string
): Conversation | { error: 'reason_required' } {
  const clean = reason.trim()

  if (clean.length < 3) {
    return { error: 'reason_required' }
  }

  return { ...conversation, status: 'resolved', resolution: clean }
}

export function reopenConversation(conversation: Conversation): Conversation {
  return { ...conversation, status: 'open', resolution: null }
}

export interface InboxFilter {
  /** Texto livre: nome, telefone ou conteúdo da última mensagem. */
  search?: string
  status?: ConversationStatus | 'all'
  onlyUnread?: boolean
  labels?: string[]
  assignee?: string | 'unassigned'
  priority?: Conversation['priority']
}

function lastText(conversation: Conversation): string {
  const last = conversation.messages[conversation.messages.length - 1]

  return last ? last.text : ''
}

function matchesSearch(conversation: Conversation, query: string): boolean {
  const needle = query.trim().toLowerCase()

  if (!needle) {
    return true
  }

  return (
    conversation.contactName.toLowerCase().includes(needle) ||
    conversation.phone.toLowerCase().includes(needle) ||
    lastText(conversation).toLowerCase().includes(needle)
  )
}

export function filterInbox(
  conversations: readonly Conversation[],
  filter: InboxFilter
): Conversation[] {
  return conversations.filter(conversation => {
    if (filter.status && filter.status !== 'all' && conversation.status !== filter.status) {
      return false
    }

    if (filter.onlyUnread && !isUnread(conversation)) {
      return false
    }

    if (filter.priority && conversation.priority !== filter.priority) {
      return false
    }

    if (filter.assignee === 'unassigned' && conversation.assignee !== null) {
      return false
    }

    if (filter.assignee && filter.assignee !== 'unassigned' && conversation.assignee !== filter.assignee) {
      return false
    }

    if (filter.labels && filter.labels.length > 0) {
      const has = filter.labels.every(label => conversation.labels.includes(label))

      if (!has) {
        return false
      }
    }

    return matchesSearch(conversation, filter.search ?? '')
  })
}

/** Ordem de atenção: esperando há mais tempo, depois não lidas, depois atividade recente. */
export function sortInbox(conversations: readonly Conversation[], now: number): Conversation[] {
  const activity = (conversation: Conversation) => {
    const last = conversation.messages[conversation.messages.length - 1]

    return last ? last.at : 0
  }

  return [...conversations].sort((a, b) => {
    const waitA = waitingMs(a, now)
    const waitB = waitingMs(b, now)

    if (waitA !== waitB) {
      return waitB - waitA
    }

    const unreadA = isUnread(a) ? 1 : 0
    const unreadB = isUnread(b) ? 1 : 0

    if (unreadA !== unreadB) {
      return unreadB - unreadA
    }

    return activity(b) - activity(a)
  })
}

export interface InboxRow {
  id: string
  contactName: string
  phone: string
  status: ConversationStatus
  unread: boolean
  waitingLabel: string
  assigneeLabel: string
  labels: string[]
  priority: Conversation['priority']
  accessibilityLabel: string
}

/** Rótulo de espera legível: minutos até 1 h, depois horas, depois dias. */
export function waitingLabel(ms: number): string {
  if (ms <= 0) {
    return 'sem espera'
  }

  const minutes = Math.floor(ms / 60_000)

  if (minutes < 60) {
    return `esperando ${Math.max(1, minutes)} min`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `esperando ${hours} h`
  }

  return `esperando ${Math.floor(hours / 24)} d`
}

/** Linhas prontas para a tela — nenhum texto é montado no componente. */
export function inboxRows(
  conversations: readonly Conversation[],
  filter: InboxFilter,
  now: number
): InboxRow[] {
  return sortInbox(filterInbox(conversations, filter), now).map(conversation => {
    const unread = isUnread(conversation)
    const wait = waitingLabel(waitingMs(conversation, now))
    const assigneeLabel = conversation.assignee ?? 'sem responsável'

    return {
      id: conversation.id,
      contactName: conversation.contactName,
      phone: conversation.phone,
      status: conversation.status,
      unread,
      waitingLabel: wait,
      assigneeLabel,
      labels: conversation.labels,
      priority: conversation.priority,
      accessibilityLabel: `${conversation.contactName}, ${conversation.status === 'resolved' ? 'resolvida' : wait}, ${assigneeLabel}${
        unread ? ', não lida' : ''
      }`
    }
  })
}

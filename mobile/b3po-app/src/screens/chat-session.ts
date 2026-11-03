/**
 * Tela de conversa do mobile: transforma a resposta real do backend em bolhas.
 *
 * Contrato descoberto contra o servidor rodando (`/api/sessions` e `/api/sessions/{id}/messages`):
 *
 *   sessão:   { id, title, preview, message_count, unread, last_activity_at, … }
 *   mensagem: { id, role: 'user'|'assistant'|'tool'|'system', content, timestamp, … }
 *
 * Regras que os testes provam:
 *
 * - **mensagem de ferramenta não vira fala do bot**: o conteúdo dela é saída de programa, não conversa;
 * - **`role` desconhecido não é descartado nem inventado**: aparece marcado como "sistema", para quem
 *   depurar ver o que veio;
 * - **conteúdo vazio não gera bolha vazia**;
 * - **ordem é por timestamp**, com desempate pelo `id` (numérico ou texto);
 * - **data de referência é o que o servidor mandou** (`timestamp` em segundos), não o relógio local.
 */

export interface RawMessage {
  id?: number | string
  role?: string
  content?: unknown
  timestamp?: number
  tool_name?: string | null
}

export type BubbleRole = 'user' | 'assistant' | 'system'

export interface ChatBubble {
  id: string
  role: BubbleRole
  body: string
  /** Rótulo curto para leitor de tela ("Você", "Bot", "Sistema"). */
  label: string
  /** Alinhamento sugerido: mensagem do usuário à direita. */
  align: 'left' | 'right'
  at: number
}

const ROLE_LABEL: Record<BubbleRole, string> = {
  user: 'Você',
  assistant: 'Bot',
  system: 'Sistema'
}

function asText(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    // Formato multimodal: junta as partes de texto, ignora binário.
    return content
      .map(part => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
          return (part as { text: string }).text
        }

        return ''
      })
      // descarta as partes sem texto antes de juntar, senão sobra espaço duplo no meio da frase
      .filter(part => part.trim().length > 0)
      .join(' ')
      .trim()
  }

  if (content === null || content === undefined) {
    return ''
  }

  return String(content).trim()
}

function roleOf(raw: RawMessage): BubbleRole {
  switch (raw.role) {
    case 'user':
      return 'user'
    case 'assistant':
      return 'assistant'
    case 'tool':
      // saída de ferramenta não é fala do bot; fica como sistema, fora do fluxo de conversa
      return 'system'
    default:
      return 'system'
  }
}

function compareMessages(a: ChatBubble, b: ChatBubble): number {
  if (a.at !== b.at) {
    return a.at - b.at
  }

  return a.id.localeCompare(b.id, 'en', { numeric: true })
}

export function chatBubbles(messages: readonly RawMessage[]): ChatBubble[] {
  const bubbles: ChatBubble[] = []

  for (const [index, message] of messages.entries()) {
    const body = asText(message.content)

    if (!body) {
      continue
    }

    const role = roleOf(message)
    const at = typeof message.timestamp === 'number' && Number.isFinite(message.timestamp) ? message.timestamp : 0

    bubbles.push({
      id: String(message.id ?? `m-${index}`),
      role,
      body,
      label: ROLE_LABEL[role],
      align: role === 'user' ? 'right' : 'left',
      at
    })
  }

  return bubbles.sort(compareMessages)
}

export interface SessionRow {
  id: string
  title: string
  preview: string
  messageCount: number
  unread: boolean
  lastActivityAt: number | null
}

/** Sessões do bot, da atividade mais recente para a mais antiga. */
export function sessionRows(sessions: readonly Record<string, unknown>[]): SessionRow[] {
  return sessions
    .flatMap(session => {
      const id = typeof session['id'] === 'string' ? session['id'] : ''

      if (!id) {
        return []
      }

      const lastActivity = typeof session['last_activity_at'] === 'number' ? session['last_activity_at'] : null

      return [
        {
          id,
          title: typeof session['title'] === 'string' && session['title'].trim() ? session['title'] : 'Sem título',
          preview: typeof session['preview'] === 'string' ? session['preview'] : '',
          messageCount: typeof session['message_count'] === 'number' ? session['message_count'] : 0,
          unread: session['unread'] === true,
          lastActivityAt: lastActivity
        }
      ]
    })
    .sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0))
}

/** Texto do estado vazio da conversa, separado por motivo. */
export function chatEmptyCopy(reason: 'no-sessions' | 'no-messages' | 'not-connected'): { title: string; body: string } {
  switch (reason) {
    case 'not-connected':
      return {
        title: 'Sem conexão com o computador',
        body: 'Pareie o aparelho para ver as conversas deste bot.'
      }
    case 'no-sessions':
      return {
        title: 'Nenhuma conversa ainda',
        body: 'Quando você conversar com este bot no computador, a conversa aparece aqui.'
      }
    case 'no-messages':
      return { title: 'Conversa sem mensagens', body: 'A sessão existe, mas ainda não tem mensagem.' }
  }
}

/**
 * Busca e filtro da caixa de entrada.
 *
 * Funcao pura: a tela nao filtra no `map` do componente porque a regra precisa de teste — e porque busca em conversa
 * tem armadilha: procurar por "maria" deve achar "Maria Souza", e procurar por telefone deve achar tanto com quanto sem
 * mascara (`+55 11 99999-1111` e `5511999991111`).
 */

import type { CrmConversationRow, ConversationStatus } from '@/api/crm-conversations'

export type ConversationFilter = 'todas' | ConversationStatus

const digitos = (valor: string): string => valor.replace(/\D/g, '')

/**
 * Uma conversa casa com a busca quando o termo aparece no titulo, no telefone (comparando digitos), na previa
 * ou em qualquer mensagem. Termo vazio casa com tudo.
 */
export function matchesSearch(conversation: CrmConversationRow, termo: string): boolean {
  const busca = termo.trim().toLowerCase()

  if (busca === '') {
    return true
  }

  const alvos = [
    conversation.title,
    conversation.contact_phone,
    conversation.last_message_preview,
    ...conversation.messages.map(mensagem => mensagem.body),
  ]

  if (alvos.some(alvo => (alvo ?? '').toLowerCase().includes(busca))) {
    return true
  }

  // telefone: compara so digitos, para "11999" achar "+55 11 99999-1111"
  const buscaDigitos = digitos(busca)
  if (buscaDigitos !== '') {
    return digitos(conversation.contact_phone).includes(buscaDigitos)
  }

  return false
}

export function filterConversations(
  conversations: readonly CrmConversationRow[],
  filtro: ConversationFilter,
  termo: string
): CrmConversationRow[] {
  return conversations.filter(
    conversation =>
      (filtro === 'todas' || conversation.status === filtro) && matchesSearch(conversation, termo)
  )
}

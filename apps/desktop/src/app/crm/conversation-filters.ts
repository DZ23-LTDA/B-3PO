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

  if (
    alvos.some(alvo => (alvo ?? '').toLowerCase().includes(busca)) ||
    (conversation.tags ?? []).some(tag => tag.toLowerCase().includes(busca))
  ) {
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

/**
 * A conversa tem esta etiqueta?
 *
 * Compara sem diferenciar maiuscula porque o store ja impede duplicata dentro da mesma conversa, mas nao entre conversas:
 * "VIP" numa e "vip" noutra sao a MESMA etiqueta para quem procura. Filtro que diferencia caixa esconde metade da lista.
 *
 * Etiqueta vazia/ausente casa com tudo — e como "sem filtro".
 */
export function matchesTag(conversation: CrmConversationRow, etiqueta: null | string): boolean {
  const alvo = (etiqueta ?? '').trim().toLowerCase()

  if (alvo === '') {
    return true
  }

  return (conversation.tags ?? []).some(tag => tag.trim().toLowerCase() === alvo)
}

/** Todas as etiquetas em uso, sem repetir caixa, ordenadas — o que a lista de filtro precisa mostrar. */
export function usedTags(conversations: readonly CrmConversationRow[]): string[] {
  const vistas = new Map<string, string>()

  for (const conversa of conversations) {
    for (const tag of conversa.tags ?? []) {
      const chave = tag.trim().toLowerCase()
      if (chave !== '' && !vistas.has(chave)) {
        vistas.set(chave, tag.trim())
      }
    }
  }

  return [...vistas.values()].sort((a, b) => a.localeCompare(b))
}

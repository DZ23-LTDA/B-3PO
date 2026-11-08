import { describe, expect, it } from 'vitest'

import type { CrmConversationRow } from '@/api/crm-conversations'

import { filterConversations, matchesSearch, matchesTag, usedTags } from './conversation-filters'

const conversa = (extra: Partial<CrmConversationRow> = {}): CrmConversationRow => ({
  contact_phone: '+5511999991111',
  created_at: 1,
  id: 'c1',
  last_message_at: 1,
  last_message_preview: 'Pode sim, qual o prazo?',
  messages: [],
  status: 'aberta',
  title: 'Maria Souza',
  unread: 0,
  updated_at: 1,
  ...extra,
})

describe('matchesSearch', () => {
  it('termo vazio casa com tudo', () => {
    expect(matchesSearch(conversa(), '')).toBe(true)
    expect(matchesSearch(conversa(), '   ')).toBe(true)
  })

  it('acha pelo titulo sem diferenciar maiuscula', () => {
    expect(matchesSearch(conversa(), 'MARIA')).toBe(true)
    expect(matchesSearch(conversa({ title: 'maria souza' }), 'Maria')).toBe(true)
  })

  it('acha pelo telefone mesmo quando a busca nao tem mascara', () => {
    expect(matchesSearch(conversa(), '119999')).toBe(true)
    expect(matchesSearch(conversa(), '55 11 99999')).toBe(true)
  })

  it('acha pelo conteudo das mensagens', () => {
    const comMensagem = conversa({ messages: [{ body: 'quer o orcamento', direction: 'entrada', external_id: 'x', sent_at: 1 }] })

    expect(matchesSearch(comMensagem, 'orcamento')).toBe(true)
  })

  it('nao acha o que nao existe', () => {
    expect(matchesSearch(conversa(), 'joao')).toBe(false)
  })
})

describe('filterConversations', () => {
  const lista = [
    conversa({ id: 'a', status: 'aberta', title: 'Maria Souza' }),
    conversa({ id: 'b', status: 'aguardando', title: 'Joao Lima' }),
    conversa({ id: 'c', status: 'resolvida', title: 'Ana Paula' }),
  ]

  it("'todas' devolve tudo que casa com a busca", () => {
    expect(filterConversations(lista, 'todas', '').map(c => c.id)).toEqual(['a', 'b', 'c'])
  })

  it('filtra por status', () => {
    expect(filterConversations(lista, 'aguardando', '').map(c => c.id)).toEqual(['b'])
  })

  it('combina filtro e busca', () => {
    expect(filterConversations(lista, 'aberta', 'joao')).toEqual([])
    expect(filterConversations(lista, 'aberta', 'maria').map(c => c.id)).toEqual(['a'])
  })
})

describe('matchesTag', () => {
  it('acha a etiqueta sem diferenciar maiuscula', () => {
    expect(matchesTag(conversa({ tags: ['VIP'] }), 'vip')).toBe(true)
    expect(matchesTag(conversa({ tags: ['vip'] }), 'VIP')).toBe(true)
  })

  it('etiqueta nula ou vazia casa com tudo', () => {
    expect(matchesTag(conversa({ tags: [] }), null)).toBe(true)
    expect(matchesTag(conversa({ tags: [] }), '  ')).toBe(true)
  })

  it('nao acha etiqueta que nao existe nem confunde com pedaco', () => {
    expect(matchesTag(conversa({ tags: ['vip'] }), 'vi')).toBe(false)
    expect(matchesTag(conversa({ tags: [] }), 'vip')).toBe(false)
  })

  it('conversa sem o campo nao quebra', () => {
    expect(matchesTag(conversa(), 'vip')).toBe(false)
  })
})

describe('usedTags', () => {
  it('junta de todas as conversas sem repetir caixa e ordena', () => {
    const lista = [conversa({ tags: ['VIP', 'orcamento'] }), conversa({ tags: ['vip', 'Retorno'] })]

    expect(usedTags(lista)).toEqual(['orcamento', 'Retorno', 'VIP'].sort((a, b) => a.localeCompare(b)))
  })

  it('lista vazia da zero etiquetas', () => {
    expect(usedTags([])).toEqual([])
  })
})

describe('busca por etiqueta', () => {
  it('busca acha por etiqueta, sem diferenciar maiuscula', () => {
    const lista = conversa({ tags: ['VIP'] })

    expect(matchesSearch(lista, 'vip')).toBe(true)
    expect(matchesSearch(lista, 'VIP')).toBe(true)
  })

  it('busca por etiqueta nao casa pedaco de outra palavra', () => {
    expect(matchesSearch(conversa({ tags: ['orcamento'] }), 'vip')).toBe(false)
  })
})

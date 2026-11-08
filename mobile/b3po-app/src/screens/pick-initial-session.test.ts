import { describe, expect, it } from 'vitest'

import { pickInitialSession } from './chat-session'
import type { SessionRow } from './chat-session'

const row = (id: string, messageCount: number): SessionRow => ({
  id,
  lastActivityAt: 1,
  messageCount,
  preview: '',
  title: id,
  unread: false
})

describe('conversa inicial do bot', () => {
  it('pula a sessao mais nova quando ela esta vazia', () => {
    // O aparelho abria "sem mensagens" com estas duas sessoes; a segunda tem historico.
    expect(pickInitialSession([row('nova-vazia', 0), row('antiga-com-historico', 4)])?.id).toBe('antiga-com-historico')
  })

  it('usa a mais recente quando ela tem mensagens', () => {
    expect(pickInitialSession([row('recente', 2), row('velha', 9)])?.id).toBe('recente')
  })

  it('sem nenhuma mensagem, devolve a primeira (a tela explica o vazio)', () => {
    expect(pickInitialSession([row('unica', 0)])?.id).toBe('unica')
  })

  it('lista vazia nao escolhe nada', () => {
    expect(pickInitialSession([])).toBeNull()
  })
})

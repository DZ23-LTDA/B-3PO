import { describe, expect, it } from 'vitest'

import { sessionRowLabel } from './chat-session'
import type { SessionRow } from './chat-session'

const row = (over: Partial<SessionRow> = {}): SessionRow => ({
  id: 's1',
  lastActivityAt: 1,
  messageCount: 2,
  preview: '',
  title: 'Envio de ontem',
  unread: false,
  ...over
})

describe('rotulo acessivel da conversa', () => {
  it('diz o titulo e a contagem de mensagens', () => {
    expect(sessionRowLabel(row())).toBe('Envio de ontem, 2 mensagens')
  })

  it('marca conversa nao lida', () => {
    expect(sessionRowLabel(row({ unread: true }))).toBe('Envio de ontem, não lida, 2 mensagens')
  })

  it('singular quando ha uma mensagem e sem cauda quando nao ha contagem', () => {
    expect(sessionRowLabel(row({ messageCount: 1 }))).toBe('Envio de ontem, 1 mensagem')
    expect(sessionRowLabel(row({ messageCount: 0 }))).toBe('Envio de ontem')
  })
})

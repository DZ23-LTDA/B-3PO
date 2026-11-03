import { describe, expect, it } from 'vitest'

import { chatBubbles, chatEmptyCopy, sessionRows } from './chat-session'

describe('bolhas de conversa', () => {
  it('mapeia usuário e bot com alinhamento e rótulo', () => {
    const bubbles = chatBubbles([
      { id: 1, role: 'user', content: 'olá', timestamp: 10 },
      { id: 2, role: 'assistant', content: 'oi! como posso ajudar?', timestamp: 11 }
    ])

    expect(bubbles).toHaveLength(2)
    expect(bubbles[0]).toMatchObject({ role: 'user', label: 'Você', align: 'right' })
    expect(bubbles[1]).toMatchObject({ role: 'assistant', label: 'Bot', align: 'left' })
  })

  it('mensagem de ferramenta não vira fala do bot', () => {
    const [bubble] = chatBubbles([{ id: 1, role: 'tool', content: 'stdout: 42', timestamp: 10 }])

    expect(bubble?.role).toBe('system')
    expect(bubble?.align).toBe('left')
  })

  it('role desconhecido aparece como sistema, não é descartado nem inventado', () => {
    const [bubble] = chatBubbles([{ id: 1, role: 'wizard', content: 'texto', timestamp: 10 }])

    expect(bubble?.role).toBe('system')
    expect(bubble?.label).toBe('Sistema')
  })

  it('conteúdo vazio não gera bolha', () => {
    expect(chatBubbles([{ id: 1, role: 'assistant', content: '   ', timestamp: 1 }])).toHaveLength(0)
    expect(chatBubbles([{ id: 2, role: 'assistant', content: null, timestamp: 1 }])).toHaveLength(0)
  })

  it('conteúdo multimodal junta as partes de texto e ignora o resto', () => {
    const [bubble] = chatBubbles([
      { id: 1, role: 'assistant', content: [{ text: 'primeira' }, { image: 'x.png' }, 'segunda'], timestamp: 1 }
    ])

    expect(bubble?.body).toBe('primeira segunda')
  })

  it('ordena por timestamp e desempata por id numérico', () => {
    const bubbles = chatBubbles([
      { id: 10, role: 'assistant', content: 'terceira', timestamp: 30 },
      { id: 9, role: 'user', content: 'primeira', timestamp: 10 },
      { id: 2, role: 'user', content: 'segunda', timestamp: 20 }
    ])

    expect(bubbles.map(bubble => bubble.body)).toEqual(['primeira', 'segunda', 'terceira'])
  })

  it('mensagem sem timestamp vai para o começo, sem quebrar a ordem', () => {
    const bubbles = chatBubbles([
      { id: 1, role: 'user', content: 'depois', timestamp: 10 },
      { id: 2, role: 'assistant', content: 'sem data' }
    ])

    expect(bubbles.map(bubble => bubble.body)).toEqual(['sem data', 'depois'])
  })
})

describe('linhas de sessão', () => {
  it('ordena pela atividade mais recente e normaliza campos', () => {
    const rows = sessionRows([
      { id: 's1', title: 'Antiga', message_count: 2, last_activity_at: 100 },
      { id: 's2', title: '', preview: 'oi', message_count: 5, unread: true, last_activity_at: 300 },
      { id: '', title: 'sem id' }
    ])

    expect(rows.map(row => row.id)).toEqual(['s2', 's1'])
    expect(rows[0]).toMatchObject({ title: 'Sem título', preview: 'oi', messageCount: 5, unread: true })
  })

  it('sessão sem atividade vai para o fim', () => {
    const rows = sessionRows([{ id: 's1' }, { id: 's2', last_activity_at: 5 }])

    expect(rows.map(row => row.id)).toEqual(['s2', 's1'])
  })
})

describe('estado vazio da conversa', () => {
  it('cada motivo tem texto próprio', () => {
    for (const reason of ['no-sessions', 'no-messages', 'not-connected'] as const) {
      const copy = chatEmptyCopy(reason)

      expect(copy.title.length).toBeGreaterThan(5)
      expect(copy.body.length).toBeGreaterThan(20)
    }
  })
})

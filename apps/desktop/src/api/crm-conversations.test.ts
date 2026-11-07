import { describe, expect, it } from 'vitest'

import { conversationCounts as contarNoStore } from '../../electron/crm-conversations-store'
import { conversationCounts as contarNaTela, conversationTimeLabel } from './crm-conversations'

// A contagem existe nos dois lados de propósito (a tela não deve ir ao IPC só para somar). Duplicação
// consciente só é segura se as duas cópias concordarem — é o que este arquivo garante.
const conversa = (status: 'aberta' | 'aguardando' | 'resolvida', unread = 0) => ({
  contact_phone: '',
  created_at: 1,
  id: `c_${status}_${unread}`,
  last_message_at: null,
  last_message_preview: '',
  messages: [], notes: '', tags: [],
  status,
  // O store ganhou `tenant_id` na rodada 83 (multiempresa). `conversationCounts` do processo principal
  // recebe `CrmConversation`, então o fixture precisa do campo — sem ele o typecheck do renderer
  // falha enquanto a contagem continua certa, que é o pior tipo de erro.
  tenant_id: 'local',
  title: 'x',
  unread,
  updated_at: 1,
})

describe('conversationCounts: tela e processo principal concordam', () => {
  it('caso misto', () => {
    const lista = [conversa('aberta', 2), conversa('aguardando', 1), conversa('resolvida', 4), conversa('aberta')]

    expect(contarNaTela(lista)).toEqual(contarNoStore(lista))
    expect(contarNaTela(lista)).toEqual({ abertas: 2, aguardando: 1, naoLidas: 7, resolvidas: 1 })
  })

  it('lista vazia', () => {
    expect(contarNaTela([])).toEqual(contarNoStore([]))
  })
})

describe('conversationTimeLabel', () => {
  const agora = new Date(2026, 10, 4, 15, 30).getTime()

  it('hoje mostra a hora', () => {
    const hoje = new Date(2026, 10, 4, 9, 5).getTime()
    expect(conversationTimeLabel(hoje, agora)).toBe('09:05')
  })

  it('outro dia mostra dia e mês', () => {
    const antes = new Date(2026, 9, 28, 9, 5).getTime()
    expect(conversationTimeLabel(antes, agora)).toBe('28/10')
  })

  it('sem mensagem não mostra nada — não inventa data', () => {
    expect(conversationTimeLabel(null, agora)).toBe('')
  })
})

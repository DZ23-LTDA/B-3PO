import { describe, expect, it } from 'vitest'

import {
  addMessage,
  assign,
  createConversation,
  filterInbox,
  inboxRows,
  isUnread,
  markRead,
  reopenConversation,
  resolveConversation,
  setPriority,
  sortInbox,
  toggleLabel,
  waitingLabel,
  waitingMs
} from './inbox'
import type { Conversation } from './inbox'

const T0 = 1_700_000_000_000
const MIN = 60_000

function conversation(id = 'c1', name = 'Ana'): Conversation {
  // leitura anterior às mensagens: mensagem no mesmo instante da leitura não é "não lida"
  return createConversation({
    id,
    contactId: `k-${id}`,
    contactName: name,
    phone: '+5511999998888',
    now: T0 - 10 * MIN
  })
}

describe('inbox — mensagens e leitura', () => {
  it('mensagem recebida deixa a conversa aguardando e apaga resolução antiga', () => {
    const resolved = resolveConversation(conversation(), 'cliente comprou') as Conversation
    const reopened = addMessage(resolved, { id: 'm1', direction: 'in', text: 'oi de novo', at: T0 + MIN })

    expect(reopened.status).toBe('waiting')
    expect(reopened.resolution).toBeNull()
  })

  it('resposta da operação não muda o status para aguardando', () => {
    const waiting = addMessage(conversation(), { id: 'm1', direction: 'in', text: 'oi', at: T0 + MIN })
    const answered = addMessage(waiting, { id: 'm2', direction: 'out', text: 'olá', at: T0 + 2 * MIN })

    expect(answered.status).toBe('waiting')
    expect(waitingMs(answered, T0 + 3 * MIN)).toBe(0)
  })

  it('não lida vem de mensagem do cliente depois da última leitura', () => {
    const base = conversation()
    const withInbound = addMessage(base, { id: 'm1', direction: 'in', text: 'oi', at: T0 + MIN })

    expect(isUnread(withInbound)).toBe(true)
    expect(isUnread(markRead(withInbound, T0 + 2 * MIN))).toBe(false)
  })

  it('conversa sem mensagem do cliente nunca é "não lida"', () => {
    const onlyOut = addMessage(conversation(), { id: 'm1', direction: 'out', text: 'oi', at: T0 + MIN })

    expect(isUnread(onlyOut)).toBe(false)
  })

  it('espera é contada só enquanto o cliente não foi respondido', () => {
    const inbound = addMessage(conversation(), { id: 'm1', direction: 'in', text: 'oi', at: T0 })

    expect(waitingMs(inbound, T0 + 10 * MIN)).toBe(10 * MIN)
    expect(waitingMs(inbound, T0 + 10 * MIN) > 0).toBe(true)

    const answered = addMessage(inbound, { id: 'm2', direction: 'out', text: 'olá', at: T0 + 5 * MIN })
    expect(waitingMs(answered, T0 + 10 * MIN)).toBe(0)
  })

  it('conversa resolvida não conta espera, mesmo antiga', () => {
    const inbound = addMessage(conversation(), { id: 'm1', direction: 'in', text: 'oi', at: T0 })
    const resolved = resolveConversation(inbound, 'resolvido por telefone') as Conversation

    expect(waitingMs(resolved, T0 + 100 * MIN)).toBe(0)
  })
})

describe('inbox — organização', () => {
  it('etiqueta entra e sai sem duplicar, em ordem', () => {
    const labeled = toggleLabel(toggleLabel(conversation(), 'vip'), 'orçamento')

    expect(labeled.labels).toEqual(['orçamento', 'vip'])
    expect(toggleLabel(labeled, 'vip').labels).toEqual(['orçamento'])
  })

  it('atribuir com texto vazio limpa o responsável', () => {
    expect(assign(conversation(), '  ').assignee).toBeNull()
    expect(assign(conversation(), 'Leandro').assignee).toBe('Leandro')
  })

  it('resolver exige motivo com pelo menos 3 caracteres', () => {
    expect(resolveConversation(conversation(), ' ok ')).toEqual({ error: 'reason_required' })
    expect(reopenConversation(resolveConversation(conversation(), 'venda fechada') as Conversation).status).toBe(
      'open'
    )
  })
})

describe('inbox — filtros', () => {
  it('busca por nome, telefone e última mensagem', () => {
    const ana = addMessage(conversation('c1', 'Ana Lima'), { id: 'm', direction: 'in', text: 'quero orçamento', at: T0 })
    const bruno = conversation('c2', 'Bruno')

    expect(filterInbox([ana, bruno], { search: 'ana' })).toHaveLength(1)
    expect(filterInbox([ana, bruno], { search: '9999' })).toHaveLength(2)
    expect(filterInbox([ana, bruno], { search: 'orçamento' })).toHaveLength(1)
  })

  it('filtra por status, não lidas, prioridade, etiqueta e responsável', () => {
    const ana = addMessage(conversation('c1', 'Ana'), { id: 'm', direction: 'in', text: 'oi', at: T0 })
    const bruno = assign(setPriority(conversation('c2', 'Bruno'), 'high'), 'Leandro')

    expect(filterInbox([ana, bruno], { status: 'waiting' })).toHaveLength(1)
    expect(filterInbox([ana, bruno], { onlyUnread: true })).toHaveLength(1)
    expect(filterInbox([ana, bruno], { priority: 'high' })).toHaveLength(1)
    expect(filterInbox([ana, bruno], { assignee: 'unassigned' })).toHaveLength(1)
    expect(filterInbox([ana, bruno], { assignee: 'Leandro' })).toHaveLength(1)

    const tagged = toggleLabel(bruno, 'vip')
    expect(filterInbox([ana, tagged], { labels: ['vip'] })).toHaveLength(1)
  })
})

describe('inbox — ordem e linhas', () => {
  it('quem espera há mais tempo aparece primeiro', () => {
    const longWait = addMessage(conversation('c1', 'Antigo'), { id: 'm1', direction: 'in', text: 'oi', at: T0 })
    const recent = addMessage(conversation('c2', 'Recente'), { id: 'm2', direction: 'in', text: 'oi', at: T0 + 10 * MIN })

    expect(sortInbox([recent, longWait], T0 + 20 * MIN).map(c => c.contactName)).toEqual(['Antigo', 'Recente'])
  })

  it('sem espera, não lidas vêm antes', () => {
    const read = markRead(
      addMessage(conversation('c1', 'Lida'), { id: 'm1', direction: 'in', text: 'oi', at: T0 }),
      T0 + 5 * MIN
    )
    const unread = addMessage(conversation('c2', 'Nova'), { id: 'm2', direction: 'in', text: 'oi', at: T0 })

    expect(sortInbox([read, unread], T0 + MIN).map(c => c.contactName)).toEqual(['Nova', 'Lida'])
  })

  it('rótulo de espera é legível em min, h e d', () => {
    expect(waitingLabel(0)).toBe('sem espera')
    expect(waitingLabel(30_000)).toBe('esperando 1 min')
    expect(waitingLabel(45 * MIN)).toBe('esperando 45 min')
    expect(waitingLabel(3 * 60 * MIN)).toBe('esperando 3 h')
    expect(waitingLabel(50 * 60 * MIN)).toBe('esperando 2 d')
  })

  it('linha da inbox traz estado e rótulo de acessibilidade completo', () => {
    const ana = addMessage(conversation('c1', 'Ana Lima'), { id: 'm', direction: 'in', text: 'oi', at: T0 })
    const [row] = inboxRows([ana], {}, T0 + 5 * MIN)

    expect(row?.unread).toBe(true)
    expect(row?.waitingLabel).toBe('esperando 5 min')
    expect(row?.assigneeLabel).toBe('sem responsável')
    expect(row?.accessibilityLabel).toBe('Ana Lima, esperando 5 min, sem responsável, não lida')
  })
})

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  conversationCounts,
  CrmConversationStore,
  normalizeConversation,
  parseConversations,
  sortConversations,
} from './crm-conversations-store'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-conv-'))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const mensagem = (body: string, direction: 'entrada' | 'saida', sent_at: number, external_id = '') => ({
  body,
  direction,
  external_id,
  sent_at,
})

describe('normalizeConversation', () => {
  it('exige um título — sem nome nem telefone a conversa não entra', () => {
    expect(normalizeConversation({}, 1)).toEqual({ error: 'A conversa precisa de um título (nome ou telefone).' })
  })

  it('ordena as mensagens por horário, não pela ordem de chegada', () => {
    const parsed = normalizeConversation(
      {
        messages: [mensagem('segunda', 'entrada', 2000), mensagem('primeira', 'entrada', 1000)],
        title: 'Maria',
      },
      5000
    )
    expect('conversation' in parsed && parsed.conversation.messages.map(m => m.body)).toEqual([
      'primeira',
      'segunda',
    ])
  })

  it('descarta reentrega: mesmo external_id não duplica mensagem', () => {
    const parsed = normalizeConversation(
      {
        messages: [
          mensagem('oi', 'entrada', 1000, 'wamid.ABC'),
          mensagem('oi', 'entrada', 1000, 'wamid.ABC'),
          mensagem('oi de novo', 'entrada', 2000, 'wamid.ABC'),
        ],
        title: 'Maria',
      },
      5000
    )
    expect('conversation' in parsed && parsed.conversation.messages).toHaveLength(1)
  })

  it('preenche a prévia com a última mensagem e corta o excesso', () => {
    const longa = 'a'.repeat(200)
    const parsed = normalizeConversation(
      { messages: [mensagem(longa, 'saida', 1000)], title: 'Maria' },
      5000
    )
    if (!('conversation' in parsed)) {
      throw new Error('esperava conversa válida')
    }
    expect(parsed.conversation.last_message_preview.endsWith('...')).toBe(true)
    expect(parsed.conversation.last_message_preview.length).toBeLessThanOrEqual(120)
    expect(parsed.conversation.last_message_at).toBe(1000)
  })

  it('mensagem sem corpo ou com direção inválida é ignorada, não corrompe a conversa', () => {
    const parsed = normalizeConversation(
      {
        messages: [
          { body: '', direction: 'entrada', sent_at: 1000 },
          { body: 'oi', direction: 'lateral', sent_at: 1000 },
          mensagem('válida', 'entrada', 1500),
        ],
        title: 'Maria',
      },
      5000
    )
    expect('conversation' in parsed && parsed.conversation.messages.map(m => m.body)).toEqual(['válida'])
  })

  it('status desconhecido cai para aberta em vez de virar lixo', () => {
    const parsed = normalizeConversation({ status: 'banana', title: 'Maria' }, 1)
    expect('conversation' in parsed && parsed.conversation.status).toBe('aberta')
  })

  it('não aceita unread negativo', () => {
    const parsed = normalizeConversation({ title: 'Maria', unread: -3 }, 1)
    expect('conversation' in parsed && parsed.conversation.unread).toBe(0)
  })
})

describe('parseConversations', () => {
  it('arquivo corrompido devolve lista vazia, não exceção', () => {
    expect(parseConversations('{{{').conversations).toEqual([])
  })

  it('descarta entrada inválida e mantém as boas', () => {
    const raw = JSON.stringify({
      conversations: [{ title: 'Boa' }, { sem: 'titulo' }],
      schema_version: 1,
    })
    expect(parseConversations(raw).conversations.map(c => c.title)).toEqual(['Boa'])
  })
})

describe('sortConversations e conversationCounts', () => {
  it('mais recente primeiro', () => {
    const parsed = parseConversations(
      JSON.stringify({
        conversations: [
          { id: 'antiga', messages: [mensagem('a', 'entrada', 1000)], title: 'A' },
          { id: 'nova', messages: [mensagem('b', 'entrada', 9000)], title: 'B' },
        ],
      })
    )
    expect(sortConversations(parsed.conversations).map(c => c.id)).toEqual(['nova', 'antiga'])
  })

  it('conta por estado e soma não lidas', () => {
    const parsed = parseConversations(
      JSON.stringify({
        conversations: [
          { status: 'aberta', title: 'A', unread: 2 },
          { status: 'aguardando', title: 'B', unread: 1 },
          { status: 'resolvida', title: 'C' },
        ],
      })
    )
    expect(conversationCounts(parsed.conversations)).toEqual({
      abertas: 1,
      aguardando: 1,
      naoLidas: 3,
      resolvidas: 1,
    })
  })
})

describe('CrmConversationStore', () => {
  it('grava, lê de volta e sobrevive a reinício (mesmo diretório, nova instância)', async () => {
    const store = new CrmConversationStore(dir)
    const saved = await store.upsert({
      messages: [mensagem('olá', 'entrada', 1000, 'wamid.1')],
      title: 'Maria Souza',
    })
    expect('conversation' in saved).toBe(true)

    const outra = new CrmConversationStore(dir)
    const lista = await outra.list()
    expect(lista).toHaveLength(1)
    expect(lista[0].title).toBe('Maria Souza')
    expect(lista[0].messages[0].body).toBe('olá')
  })

  it('upsert por id atualiza sem duplicar e preserva created_at', async () => {
    const store = new CrmConversationStore(dir)
    const primeiro = await store.upsert({ created_at: 111, id: 'c1', title: 'Maria' })
    if (!('conversation' in primeiro)) {
      throw new Error('esperava conversa')
    }
    await store.upsert({ id: 'c1', messages: [mensagem('nova', 'entrada', 5000)], title: 'Maria Souza' })

    const lista = await store.list()
    expect(lista).toHaveLength(1)
    expect(lista[0].title).toBe('Maria Souza')
    expect(lista[0].created_at).toBe(111)
  })

  it('remove apaga só a pedida e reclamar de id inexistente', async () => {
    const store = new CrmConversationStore(dir)
    await store.upsert({ id: 'a', title: 'A' })
    await store.upsert({ id: 'b', title: 'B' })
    expect(await store.remove('a')).toEqual({ ok: true })
    expect((await store.list()).map(c => c.id)).toEqual(['b'])
    expect(await store.remove('nao-existe')).toEqual({ error: 'Conversa não encontrada.' })
  })

  it('devolve { error } em vez de lançar quando a entrada é inválida', async () => {
    const store = new CrmConversationStore(dir)
    expect(await store.upsert({})).toEqual({ error: 'A conversa precisa de um título (nome ou telefone).' })
  })

  it('lista vazia quando o arquivo não existe — instalação nova não é erro', async () => {
    const store = new CrmConversationStore(join(dir, 'nunca-criado'))
    expect(await store.list()).toEqual([])
  })
})

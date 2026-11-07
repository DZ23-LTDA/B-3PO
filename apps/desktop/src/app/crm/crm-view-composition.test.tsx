// A tela do CRM compõe o que ela promete.
//
// ESTE TESTE EXISTE POR CAUSA DE TRES AFIRMAÇÕES FALSAS
//
// r70: "o WhatsApp nao esta montado" - estava.
// r71: "conversas nao existem" - existiam, faltava o preload.
// r75: "tarefas nao existem" - existiam dentro de CrmContactsSection.
//
// Nas tres eu procurei por um lugar especifico em vez de seguir a cadeia de renderizacao. Um teste que
// MONTA a tela e procura o conteudo pega exatamente isso: nao importa quem renderiza quem, o que
// importa e se o usuario ve.
//
// Nao e teste de leitura de fonte: ele executa o componente.

import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CrmView } from './index'

// O fixture segue CrmTaskRow do client. Um mock com campo trocado acusa defeito que nao existe - foi
// o erro da rodada 63, e este teste quase o repetiu usando done em vez de status.

const TAREFA = 'Ligar para o cliente do teste'
const CONVERSA = 'Chegou meu pedido?'

function ponte(over: Record<string, unknown> = {}) {
  return {
    crmContacts: { list: vi.fn(async () => ({ contacts: [] })), upsert: vi.fn(async () => ({})) },
    crmConversations: {
      list: vi.fn(async () => ({
        conversations: [
          {
            contact_phone: '5511955554444',
            id: 'c1',
            last_message_at: Date.now(),
            last_message_preview: CONVERSA,
            messages: [],
            notes: '',
            status: 'aberta',
            tags: [],
            title: CONVERSA,
            unread: 0
          }
        ]
      })),
      remove: vi.fn(async () => ({ ok: true })),
      upsert: vi.fn(async () => ({}))
    },
    crmPipeline: { list: vi.fn(async () => ({ deals: [] })), upsert: vi.fn(async () => ({})) },
    crmTasks: {
      list: vi.fn(async () => ({
        tasks: [
          {
            contact_phone: '5511955554444',
            created_at: 1_700_000_000_000,
            due_at: null,
            id: 't1',
            notes: '',
            priority: 'media',
            status: 'aberta',
            title: TAREFA,
            updated_at: 1_700_000_000_000
          }
        ]
      })),
      remove: vi.fn(async () => ({ ok: true })),
      upsert: vi.fn(async () => ({}))
    },
    ...over
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('tela do CRM', () => {
  it('mostra as tarefas — elas vivem dentro da seção de contatos, não na página', async () => {
    vi.stubGlobal('hermesDesktop', ponte())

    render(<CrmView />)

    // Se alguém mover/remover CrmTasksSection, este teste falha - e foi assim que a afirmação
    // "tarefas nao existem" pode ser desmentida em segundos em vez de em tres rodadas.
    await waitFor(() => expect(screen.getByText(TAREFA)).toBeTruthy())
  })

  it('mostra as conversas', async () => {
    vi.stubGlobal('hermesDesktop', ponte())

    render(<CrmView />)

    await waitFor(() => expect(screen.getAllByText(new RegExp(CONVERSA)).length).toBeGreaterThan(0))
  })

  it('sem a ponte, a tela ainda monta e nao quebra', () => {
    vi.stubGlobal('hermesDesktop', undefined)

    expect(() => render(<CrmView />)).not.toThrow()
  })
})

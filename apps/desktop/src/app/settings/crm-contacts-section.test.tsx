import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  crmAvailable: vi.fn(),
  crmErrorText: vi.fn((code: string) => `erro:${code}`),
  listCrmContacts: vi.fn(),
  removeCrmContact: vi.fn(),
  saveCrmContact: vi.fn()
}))

vi.mock('@/api/crm-contacts', () => api)

// O painel de contatos monta o funil; aqui ele e isolado com um funil vazio e disponivel.
vi.mock('@/api/crm-pipeline', () => ({
  PIPELINE_STAGES: ['novo', 'ganho'],
  listOpportunities: vi.fn(async () => []),
  money: vi.fn(() => 'R$ 0,00'),
  opportunityTotals: vi.fn(() => ({ openCents: 0, wonCents: 0 })),
  pipelineAvailable: vi.fn(() => true),
  pipelineErrorText: vi.fn((code: string) => `erro:${code}`),
  removeOpportunity: vi.fn(async () => []),
  saveOpportunity: vi.fn(async () => ({ opportunities: [] })),
  stageLabel: vi.fn((stage: string) => stage)
}))

import type { CrmContactRow } from '@/api/crm-contacts'

import { I18nProvider } from '@/i18n'

import { CrmContactsSection } from './crm-contacts-section'

const contact = (over: Partial<CrmContactRow> = {}): CrmContactRow => ({
  company: 'DZ23',
  created_at: Date.UTC(2026, 10, 1),
  email: 'a@b.co',
  name: 'Maria',
  phone: '+5511999991111',
  tags: [],
  updated_at: Date.UTC(2026, 10, 2),
  ...over
})

function renderSection() {
  return render(
    <I18nProvider>
      <CrmContactsSection />
    </I18nProvider>
  )
}

describe('contatos do CRM (Configurações)', () => {
  beforeEach(() => {
    api.crmAvailable.mockReset().mockReturnValue(true)
    api.listCrmContacts.mockReset()
    api.saveCrmContact.mockReset()
    api.removeCrmContact.mockReset()
  })

  it('lista o contato com telefone, empresa e e-mail', async () => {
    api.listCrmContacts.mockResolvedValue([contact()])

    renderSection()

    // O select do funil tambem lista o nome: a linha do contato e identificada pelo dado composto.
    expect(await screen.findByText(/\+5511999991111 · DZ23 · a@b\.co/)).toBeTruthy()
  })

  it('sem contatos explica o vazio em vez de mostrar lista em branco', async () => {
    api.listCrmContacts.mockResolvedValue([])

    renderSection()

    await waitFor(() => {
      expect(screen.getByText(/No contact yet|Nenhum contato ainda/)).toBeTruthy()
    })
  })

  it('cadastrar envia o que foi digitado e mostra a lista nova', async () => {
    api.listCrmContacts.mockResolvedValue([])
    // a fixture precisa carregar o telefone digitado: e ele que a linha mostra depois de salvar.
    api.saveCrmContact.mockResolvedValue({ contacts: [contact({ name: 'João', phone: '+5511888882222' })] })

    renderSection()

    await waitFor(() => expect(screen.getByText(/No contact yet|Nenhum contato/)).toBeTruthy())

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    fireEvent.change(inputs[0]!, { target: { value: 'João' } })
    fireEvent.change(inputs[1]!, { target: { value: '+5511888882222' } })
    fireEvent.click(screen.getByRole('button', { name: /Add contact|Adicionar contato/ }))

    await waitFor(() => {
      expect(api.saveCrmContact).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'João', phone: '+5511888882222' })
      )
    })
    expect(await screen.findByText(/\+5511888882222/)).toBeTruthy()
  })

  it('erro de validação do backend aparece como texto, sem perder a lista', async () => {
    api.listCrmContacts.mockResolvedValue([])
    api.saveCrmContact.mockResolvedValue({ error: 'phone_too_short' })

    renderSection()

    await waitFor(() => expect(screen.getByText(/No contact yet|Nenhum contato/)).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /Add contact|Adicionar contato/ }))

    await waitFor(() => {
      expect(api.crmErrorText).toHaveBeenCalledWith('phone_too_short')
    })
    expect(await screen.findByText('erro:phone_too_short')).toBeTruthy()
  })

  it('remover chama o backend e atualiza a lista', async () => {
    api.listCrmContacts.mockResolvedValue([contact()])
    api.removeCrmContact.mockResolvedValue([])

    renderSection()

    fireEvent.click(await screen.findByRole('button', { name: /Remove|Remover/ }))

    await waitFor(() => {
      expect(api.removeCrmContact).toHaveBeenCalledWith('+5511999991111')
    })
  })

  it('sem disco local (web) explica o motivo em vez de fingir lista vazia', async () => {
    api.crmAvailable.mockReturnValue(false)

    renderSection()

    await waitFor(() => {
      expect(screen.getByText(/no local disk|não tem disco local/)).toBeTruthy()
    })
    expect(api.listCrmContacts).not.toHaveBeenCalled()
  })
})

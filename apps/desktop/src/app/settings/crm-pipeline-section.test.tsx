import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  PIPELINE_STAGES: ['novo', 'contato', 'qualificacao', 'proposta', 'negociacao', 'ganho', 'perdido'],
  listOpportunities: vi.fn(),
  money: vi.fn((cents: number) => `R$ ${(cents / 100).toFixed(2)}`),
  opportunityTotals: vi.fn((rows: { stage: string; value_cents: number }[]) => {
    let openCents = 0
    let wonCents = 0

    for (const row of rows) {
      if (row.stage === 'ganho') {
        wonCents += row.value_cents
      } else if (row.stage !== 'perdido') {
        openCents += row.value_cents
      }
    }

    return { openCents, wonCents }
  }),
  pipelineAvailable: vi.fn(),
  pipelineErrorText: vi.fn((code: string) => `erro:${code}`),
  removeOpportunity: vi.fn(),
  saveOpportunity: vi.fn(),
  stageLabel: vi.fn((stage: string) => `estágio:${stage}`)
}))

vi.mock('@/api/crm-pipeline', () => api)

import type { CrmOpportunityRow } from '@/api/crm-pipeline'

import { I18nProvider } from '@/i18n'

import { CrmPipelineSection } from './crm-pipeline-section'

const row = (over: Partial<CrmOpportunityRow> = {}): CrmOpportunityRow => ({
  contact_phone: '+5511999991111',
  created_at: 0,
  currency: 'BRL',
  id: 'opp-1',
  stage: 'novo',
  title: 'Consultoria',
  updated_at: 1,
  value_cents: 150000,
  ...over
})

const contacts = [{ name: 'Maria', phone: '+5511999991111' }]

function renderSection() {
  return render(
    <I18nProvider>
      <CrmPipelineSection contacts={contacts} />
    </I18nProvider>
  )
}

describe('funil de oportunidades (Configurações)', () => {
  beforeEach(() => {
    api.pipelineAvailable.mockReset().mockReturnValue(true)
    api.listOpportunities.mockReset()
    api.saveOpportunity.mockReset()
    api.removeOpportunity.mockReset()
  })

  it('lista a oportunidade e mostra os totais calculados dos registros', async () => {
    api.listOpportunities.mockResolvedValue([
      row({ title: 'Consultoria' }),
      row({ id: 'opp-2', stage: 'ganho', title: 'Implantação', value_cents: 50000 })
    ])

    renderSection()

    expect(await screen.findByText('Consultoria')).toBeTruthy()
    // 1500,00 em aberto + 500,00 ganho: a linha de totais é única no formato completo, então a
    // asserção não colide com o valor da própria oportunidade.
    expect(await screen.findByText(/R\$ 1500\.00 · .*: R\$ 500\.00/)).toBeTruthy()
  })

  it('sem oportunidades explica o vazio', async () => {
    api.listOpportunities.mockResolvedValue([])

    renderSection()

    await waitFor(() => {
      expect(screen.getByText(/No opportunity yet|Nenhuma oportunidade/)).toBeTruthy()
    })
  })

  it('criar manda os campos digitados e adota a lista devolvida', async () => {
    api.listOpportunities.mockResolvedValue([])
    api.saveOpportunity.mockResolvedValue({ opportunities: [row({ title: 'Implantação' })] })

    renderSection()

    await waitFor(() => expect(screen.getByText(/No opportunity yet|Nenhuma oportunidade/)).toBeTruthy())

    const [titulo, valor] = screen.getAllByRole('textbox') as HTMLInputElement[]
    fireEvent.change(titulo!, { target: { value: 'Implantação' } })
    fireEvent.change(valor!, { target: { value: '150000' } })
    fireEvent.change(screen.getByLabelText(/Contact|Contato/), { target: { value: '+5511999991111' } })

    fireEvent.click(screen.getByRole('button', { name: /Add opportunity|Adicionar oportunidade/ }))

    await waitFor(() => {
      expect(api.saveOpportunity).toHaveBeenCalled()
    })
    expect(await screen.findByText('Implantação')).toBeTruthy()
  })

  it('mover o estágio salva o mesmo id com o estágio novo', async () => {
    api.listOpportunities.mockResolvedValue([row()])
    api.saveOpportunity.mockResolvedValue({ opportunities: [row({ stage: 'ganho' })] })

    renderSection()

    const select = await screen.findByLabelText(/Stage|Estágio/)
    fireEvent.change(select, { target: { value: 'ganho' } })

    await waitFor(() => {
      expect(api.saveOpportunity).toHaveBeenCalledWith(expect.objectContaining({ id: 'opp-1', stage: 'ganho' }))
    })
  })

  it('remover chama o backend pelo id', async () => {
    api.listOpportunities.mockResolvedValue([row()])
    api.removeOpportunity.mockResolvedValue([])

    renderSection()

    fireEvent.click(await screen.findByRole('button', { name: /Remove|Remover/ }))

    await waitFor(() => {
      expect(api.removeOpportunity).toHaveBeenCalledWith('opp-1')
    })
  })

  it('erro de validação do backend aparece como texto', async () => {
    api.listOpportunities.mockResolvedValue([])
    api.saveOpportunity.mockResolvedValue({ error: 'title_required' })

    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /Add opportunity|Adicionar oportunidade/ }))

    expect(await screen.findByText('erro:title_required')).toBeTruthy()
  })

  it('sem disco local explica o motivo e não consulta o backend', async () => {
    api.pipelineAvailable.mockReturnValue(false)

    renderSection()

    await waitFor(() => {
      expect(screen.getByText(/no local disk|não tem disco local/)).toBeTruthy()
    })
    expect(api.listOpportunities).not.toHaveBeenCalled()
  })
})

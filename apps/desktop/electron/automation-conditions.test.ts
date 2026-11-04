// Fontes de condicao da varredura (rodada 67).
//
// Cada condicao e perguntada ao DONO do dominio. Estes testes provam a traducao: o que o dono diz que
// esta atrasado/vencendo vira condicao na forma certa, e o que ele diz que esta em dia NAO vira.

import { describe, expect, it } from 'vitest'

import { dueSoonConditions, overdueConditions, VENCIMENTO_JANELA_DIAS } from './automation-conditions'
import type { FinanceEntry } from './finance-store'
import type { Ticket } from './service-desk-store'

const T0 = 1_700_000_000_000
const DIA = 86_400_000

const ticket = (over: Partial<Ticket> = {}): Ticket => ({
  assignee: '',
  channel: 'whatsapp',
  closed_at: null,
  contact_phone: '',
  created_at: T0 - 10 * DIA,
  description: '',
  id: 't1',
  number: 1,
  opened_at: T0 - 10 * DIA,
  priority: 'urgente',
  satisfaction: null,
  sla_due_at: T0 - DIA,
  status: 'aberto',
  subject: 'Atrasado',
  tenant_id: 'local',
  updated_at: T0 - 10 * DIA,
  ...over
})

const entrada = (over: Partial<FinanceEntry> = {}): FinanceEntry => ({
  amount_cents: 10_000,
  created_at: T0,
  currency: 'BRL',
  description: 'Conta',
  due_at: T0 + DIA,
  id: 'f1',
  kind: 'pagar',
  party: 'Fornecedor',
  ref: '',
  status: 'aberto',
  tenant_id: 'local',
  updated_at: T0,
  ...over
})

describe('ticket.atrasado', () => {
  it('ticket aberto com prazo vencido vira condicao', () => {
    const r = overdueConditions([ticket()], 'local')

    expect(r).toEqual([{ entity_id: 't1', tenant_id: 'local', trigger: 'ticket.atrasado' }])
  })

  it('ticket resolvido NAO vira condicao, mesmo com prazo vencido', () => {
    // Quem decide o que e "atrasado" e o dominio: `isOverdue` checa o status.
    expect(overdueConditions([ticket({ status: 'resolvido' })], 'local', T0)).toEqual([])
  })

  it('ticket de outro tenant nao entra', () => {
    expect(overdueConditions([ticket({ tenant_id: 'outro' })], 'local', T0)).toEqual([])
  })

  it('ticket dentro do prazo nao entra', () => {
    expect(overdueConditions([ticket({ sla_due_at: T0 + DIA })], 'local', T0)).toEqual([])
  })
})

describe('conta.vencendo', () => {
  it('conta a pagar dentro da janela vira condicao', () => {
    const r = dueSoonConditions([entrada()], 'local', T0)

    expect(r).toEqual([{ entity_id: 'f1', tenant_id: 'local', trigger: 'conta.vencendo' }])
  })

  it('a janela e de VENCIMENTO_JANELA_DIAS para frente', () => {
    const noLimite = entrada({ due_at: T0 + VENCIMENTO_JANELA_DIAS * DIA })
    const fora = entrada({ due_at: T0 + (VENCIMENTO_JANELA_DIAS + 1) * DIA })

    expect(dueSoonConditions([noLimite], 'local', T0)).toHaveLength(1)
    expect(dueSoonConditions([fora], 'local', T0)).toHaveLength(0)
  })

  it('conta JA VENCIDA tambem entra: atrasada precisa de acao tanto quanto a proxima', () => {
    const vencida = entrada({ due_at: T0 - 5 * DIA })

    expect(dueSoonConditions([vencida], 'local', T0)).toHaveLength(1)
  })

  it('conta paga nao vence mais', () => {
    expect(dueSoonConditions([entrada({ status: 'pago' })], 'local', T0)).toEqual([])
  })

  it('conta a RECEBER nao e "conta vencendo" deste gatilho', () => {
    expect(dueSoonConditions([entrada({ kind: 'receber' })], 'local', T0)).toEqual([])
  })

  it('outro tenant nao entra', () => {
    expect(dueSoonConditions([entrada({ tenant_id: 'outro' })], 'local', T0)).toEqual([])
  })

  it('vencimento zero (sem prazo) nao entra', () => {
    expect(dueSoonConditions([entrada({ due_at: 0 })], 'local', T0)).toEqual([])
  })
})

// Reagendamento (rodada 123).
//
// O que estes testes travam: o agendamento não conflita consigo mesmo, o horário anterior fica registrado, e
// o conflito com outro compromisso é recusado.

import { describe, expect, it } from 'vitest'

import { reagendar } from './scheduling-reschedule'
import type { Appointment } from './scheduling-store'

const HORA = 3_600_000
const AGORA = 1_700_000_000_000

function agendamento(over: Partial<Appointment> = {}): Appointment {
  return {
    contact_phone: '5511999998888',
    created_at: AGORA,
    ends_at: AGORA + HORA,
    id: 'a1',
    notes: '',
    ref: '',
    resource_id: 'prof-1',
    service: 'corte',
    starts_at: AGORA,
    status: 'confirmado',
    tenant_id: 'local',
    updated_at: AGORA,
    ...over
  } as Appointment
}

describe('reagendar', () => {
  it('move o horario mantendo a duracao', () => {
    const r = reagendar(agendamento(), { novo_inicio: AGORA + 2 * HORA }, [], AGORA)

    if ('motivo' in r) throw new Error(r.motivo)

    expect(r.agendamento.starts_at).toBe(AGORA + 2 * HORA)
    expect(r.agendamento.ends_at).toBe(AGORA + 3 * HORA)
  })

  it('NAO conflita consigo mesmo', () => {
    // O caso que quebraria tudo: sem ignorar o proprio id, mover um compromisso sempre colidiria.
    const a = agendamento()
    const r = reagendar(a, { novo_inicio: AGORA + HORA }, [a], AGORA)

    expect(r.ok).toBe(true)
  })

  it('recusa quando o novo horario esta ocupado', () => {
    const outro = agendamento({ ends_at: AGORA + 3 * HORA, id: 'a2', starts_at: AGORA + 2 * HORA })
    const r = reagendar(agendamento(), { novo_inicio: AGORA + 2 * HORA }, [outro], AGORA)

    expect(r).toEqual({ motivo: 'conflito', ocupado_por: 'a2', ok: false })
  })

  it('aceita horario que encosta no fim do outro (fim exclusivo)', () => {
    const outro = agendamento({ ends_at: AGORA + 2 * HORA, id: 'a2', starts_at: AGORA + HORA })
    const r = reagendar(agendamento(), { novo_inicio: AGORA + 2 * HORA }, [outro], AGORA)

    expect(r.ok).toBe(true)
  })

  it('ignora conflito de OUTRO recurso', () => {
    const outro = agendamento({ id: 'a2', resource_id: 'prof-2' })
    const r = reagendar(agendamento(), { novo_inicio: AGORA }, [outro], AGORA)

    expect(r.ok).toBe(true)
  })

  it('registra o horario anterior em notes', () => {
    // Sem isso, o reagendamento apaga o anterior e some a resposta para "o cliente diz que era as 10h".
    const r = reagendar(agendamento({ notes: 'cliente prefere manha' }), { novo_inicio: AGORA + 5 * HORA }, [], AGORA)

    if ('motivo' in r) throw new Error(r.motivo)

    expect(r.agendamento.notes).toContain('cliente prefere manha')
    expect(r.agendamento.notes).toContain('remarcado de')
  })

  it('devolve o anterior para quem quiser desfazer', () => {
    const r = reagendar(agendamento(), { novo_inicio: AGORA + 5 * HORA }, [], AGORA)

    if ('motivo' in r) throw new Error(r.motivo)

    expect(r.anterior).toEqual({ ends_at: AGORA + HORA, starts_at: AGORA })
  })

  it('aceita nova duracao', () => {
    const r = reagendar(agendamento(), { nova_duracao_ms: 30 * 60_000, novo_inicio: AGORA + HORA }, [], AGORA)

    if ('motivo' in r) throw new Error(r.motivo)

    expect(r.agendamento.ends_at).toBe(AGORA + HORA + 30 * 60_000)
  })

  it('recusa duracao invalida', () => {
    expect(reagendar(agendamento(), { nova_duracao_ms: 0, novo_inicio: AGORA }, [], AGORA)).toEqual({ motivo: 'duracao_invalida', ok: false })
    expect(reagendar(agendamento(), { nova_duracao_ms: -1, novo_inicio: AGORA }, [], AGORA)).toEqual({ motivo: 'duracao_invalida', ok: false })
    expect(reagendar(agendamento(), { novo_inicio: Number.NaN }, [], AGORA)).toEqual({ motivo: 'duracao_invalida', ok: false })
  })

  it('recusa remarcar cancelado, concluido ou faltou', () => {
    for (const status of ['cancelado', 'concluido', 'faltou'] as const) {
      expect(reagendar(agendamento({ status }), { novo_inicio: AGORA + HORA }, [], AGORA)).toEqual({ motivo: 'nao_remarcavel', ok: false })
    }
  })

  it('aceita remarcar marcado e confirmado', () => {
    for (const status of ['marcado', 'confirmado'] as const) {
      expect(reagendar(agendamento({ status }), { novo_inicio: AGORA + HORA }, [], AGORA).ok).toBe(true)
    }
  })

  it('nao muda o id nem a ref: a identidade sobrevive ao reagendamento', () => {
    const r = reagendar(agendamento({ ref: 'pedido:1' }), { novo_inicio: AGORA + 5 * HORA }, [], AGORA)

    if ('motivo' in r) throw new Error(r.motivo)

    expect(r.agendamento.id).toBe('a1')
    expect(r.agendamento.ref).toBe('pedido:1')
  })
})

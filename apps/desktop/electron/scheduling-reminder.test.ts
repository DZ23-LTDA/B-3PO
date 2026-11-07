// Lembretes de agendamento (rodada 122).
//
// O que estes testes travam: o mesmo lembrete não sai duas vezes, cancelado não recebe, e a tolerância existe
// para o processo que ficou parado.

import { describe, expect, it } from 'vitest'

import { lembretesDevidos, textoDoLembrete, type LembreteDevido } from './scheduling-reminder'
import type { Appointment } from './scheduling-store'

const HORA = 3_600_000
const AGORA = 1_700_000_000_000

function agendamento(over: Partial<Appointment> = {}): Appointment {
  return {
    contact_phone: '5511999998888',
    created_at: AGORA,
    ends_at: AGORA + 25 * HORA,
    id: 'a1',
    notes: '',
    ref: '',
    resource_id: 'prof-1',
    service: 'corte',
    // Atendimento em 24h: o lembrete de 24h vence exatamente agora.
    starts_at: AGORA + 24 * HORA,
    status: 'confirmado',
    tenant_id: 'local',
    updated_at: AGORA,
    ...over
  } as Appointment
}

describe('lembretesDevidos', () => {
  it('lembrete de 24h vence quando faltam 24h', () => {
    const devidos = lembretesDevidos({ agora: AGORA, agendamentos: [agendamento()], antecedencia_horas: 24 })

    expect(devidos).toHaveLength(1)
    expect(devidos[0]!.appointment_id).toBe('a1')
    expect(devidos[0]!.ref).toBe('agendamento:a1:24h')
  })

  it('NAO sai antes da hora', () => {
    const devidos = lembretesDevidos({
      agora: AGORA,
      agendamentos: [agendamento({ starts_at: AGORA + 48 * HORA })],
      antecedencia_horas: 24
    })

    expect(devidos).toEqual([])
  })

  it('a mesma chave NAO sai duas vezes', () => {
    // O caso que quebra em producao: o calculo roda a cada minuto e o cliente recebe a mesma
    // mensagem varias vezes.
    const ja = new Set(['agendamento:a1:24h'])

    expect(lembretesDevidos({ agora: AGORA, agendamentos: [agendamento()], antecedencia_horas: 24, ja_enviados: ja })).toEqual([])
  })

  it('aceita ja_enviados como array e como Set', () => {
    expect(lembretesDevidos({ agora: AGORA, agendamentos: [agendamento()], antecedencia_horas: 24, ja_enviados: ['agendamento:a1:24h'] })).toEqual([])
    expect(lembretesDevidos({ agora: AGORA, agendamentos: [agendamento()], antecedencia_horas: 24, ja_enviados: new Set(['agendamento:a1:24h']) })).toEqual([])
  })

  it('cancelado nao recebe lembrete', () => {
    const devidos = lembretesDevidos({ agora: AGORA, agendamentos: [agendamento({ status: 'cancelado' })], antecedencia_horas: 24 })

    expect(devidos).toEqual([])
  })

  it('concluido e faltou nao recebem lembrete', () => {
    for (const status of ['concluido', 'faltou'] as const) {
      expect(lembretesDevidos({ agora: AGORA, agendamentos: [agendamento({ status })], antecedencia_horas: 24 })).toEqual([])
    }
  })

  it('marcado e confirmado recebem', () => {
    for (const status of ['marcado', 'confirmado'] as const) {
      expect(lembretesDevidos({ agora: AGORA, agendamentos: [agendamento({ status })], antecedencia_horas: 24 })).toHaveLength(1)
    }
  })

  it('sem telefone nao ha para quem avisar', () => {
    const devidos = lembretesDevidos({ agora: AGORA, agendamentos: [agendamento({ contact_phone: '' })], antecedencia_horas: 24 })

    expect(devidos).toEqual([])
  })

  it('tolerancia cobre o processo que ficou parado', () => {
    // Lembrete venceu ha 1h; com tolerancia padrao de 2h ainda sai.
    const devidos = lembretesDevidos({
      agora: AGORA + HORA,
      agendamentos: [agendamento({ starts_at: AGORA + 25 * HORA })],
      antecedencia_horas: 24
    })

    expect(devidos).toHaveLength(1)
  })

  it('passou da tolerancia: nao sai', () => {
    // enviar_em = AGORA + 1h; agora = AGORA + 5h; atraso de 4h com tolerancia 2h.
    const devidos = lembretesDevidos({
      agora: AGORA + 5 * HORA,
      agendamentos: [agendamento({ starts_at: AGORA + 25 * HORA })],
      antecedencia_horas: 24,
      tolerancia_horas: 2
    })

    expect(devidos).toEqual([])
  })

  it('atendimento ja comecou: lembrete nao faz sentido', () => {
    const devidos = lembretesDevidos({
      agora: AGORA,
      agendamentos: [agendamento({ starts_at: AGORA - HORA })],
      antecedencia_horas: 24
    })

    expect(devidos).toEqual([])
  })

  it('ordena pelo mais atrasado primeiro', () => {
    const devidos = lembretesDevidos({
      agora: AGORA,
      agendamentos: [
        agendamento({ id: 'recente', starts_at: AGORA + 24 * HORA }),
        agendamento({ id: 'atrasado', starts_at: AGORA + 23 * HORA })
      ],
      antecedencia_horas: 24,
      tolerancia_horas: 5
    })

    expect(devidos.map(d => d.appointment_id)).toEqual(['atrasado', 'recente'])
  })

  it('antecedencia invalida devolve lista vazia', () => {
    expect(lembretesDevidos({ agora: AGORA, agendamentos: [agendamento()], antecedencia_horas: -1 })).toEqual([])
    expect(lembretesDevidos({ agora: AGORA, agendamentos: [agendamento()], antecedencia_horas: Number.NaN })).toEqual([])
  })

  it('a ref depende da janela: 24h e 48h do mesmo agendamento sao lembretes diferentes', () => {
    const a24 = lembretesDevidos({ agora: AGORA, agendamentos: [agendamento({ starts_at: AGORA + 24 * HORA })], antecedencia_horas: 24 })
    const a48 = lembretesDevidos({ agora: AGORA, agendamentos: [agendamento({ starts_at: AGORA + 48 * HORA })], antecedencia_horas: 48 })

    expect(a24[0]!.ref).not.toBe(a48[0]!.ref)
  })
})

describe('textoDoLembrete', () => {
  it('nomeia o servico e o horario, e abre porta para reagendar', () => {
    const lembrete: LembreteDevido = {
      appointment_id: 'a1',
      contact_phone: '5511999998888',
      enviar_em: AGORA,
      quando: AGORA + 24 * HORA,
      ref: 'agendamento:a1:24h',
      resource_id: 'prof-1',
      service: 'corte'
    }

    const texto = textoDoLembrete(lembrete, () => '05/11 as 14:00')

    expect(texto).toContain('corte')
    expect(texto).toContain('05/11 as 14:00')
    expect(texto).toContain('remarcar')
  })
})

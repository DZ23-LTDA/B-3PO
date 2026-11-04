// Disponibilidade de agenda (rodada 121).
//
// O que estes testes travam: um horário que encosta em outro não é oferecido, cancelado libera, bloqueio
// ocupa como agendamento, e o fim é exclusivo — 10:00 não conflita com 10:00.

import { describe, expect, it } from 'vitest'

import { horariosLivres, proximoHorario, type Bloqueio, type Janela } from './scheduling-availability'
import type { Appointment } from './scheduling-store'

const HORA = 3_600_000
const MIN = 60_000
// Expediente 09:00 -> 12:00 de um dia qualquer.
const ABRE = 1_700_000_000_000
const JANELA: Janela = { abre: ABRE, fecha: ABRE + 3 * HORA }

function agendamento(over: Partial<Appointment> = {}): Appointment {
  return {
    contact_phone: '5511999998888',
    created_at: ABRE,
    ends_at: ABRE + HORA,
    id: 'a1',
    notes: '',
    ref: '',
    resource_id: 'prof-1',
    service: 'corte',
    starts_at: ABRE,
    status: 'confirmado',
    tenant_id: 'local',
    updated_at: ABRE,
    ...over
  } as Appointment
}

function bloqueio(over: Partial<Bloqueio> = {}): Bloqueio {
  return { ends_at: ABRE + HORA, motivo: 'almoco', resource_id: 'prof-1', starts_at: ABRE, ...over }
}

// Granularidade 60 nos testes: a agenda oferece de hora em hora, e as expectativas ficam legiveis.
const base = {
  duracao_minutos: 60,
  granularidade_minutos: 60,
  janela: JANELA,
  resource_id: 'prof-1'
}

describe('horariosLivres', () => {
  it('agenda vazia: tres horarios de uma hora', () => {
    const livres = horariosLivres({ ...base, ocupados: [] })

    expect(livres).toHaveLength(3)
    expect(livres[0]!.starts_at).toBe(ABRE)
    expect(livres[2]!.starts_at).toBe(ABRE + 2 * HORA)
  })

  it('o fim e EXCLUSIVO: 10:00 nao conflita com 10:00', () => {
    // Um atendimento que termina as 10:00 e outro que comeca as 10:00 sao compativeis.
    const livres = horariosLivres({
      ...base,
      ocupados: [agendamento({ ends_at: ABRE + HORA, starts_at: ABRE })]
    })

    // 09:00 ocupado; 10:00 e 11:00 livres.
    expect(livres).toHaveLength(2)
    expect(livres[0]!.starts_at).toBe(ABRE + HORA)
  })

  it('horario no meio do agendamento nao e oferecido', () => {
    const livres = horariosLivres({
      ...base,
      duracao_minutos: 30,
      granularidade_minutos: 30,
      // Ocupado 09:30-10:30. 09:30 nao pode; 09:00 (termina 09:30) pode, 10:30 pode.
      ocupados: [agendamento({ ends_at: ABRE + 90 * MIN, starts_at: ABRE + 30 * MIN })]
    })

    const inicios = livres.map(l => (l.starts_at - ABRE) / MIN)

    // Ocupado [30, 90): 30 e 60 colidem. 0 termina em 30 (livre) e 90 comeca quando o outro acaba.
    expect(inicios).not.toContain(30)
    expect(inicios).not.toContain(60)
    expect(inicios).toContain(0)
    expect(inicios).toContain(90)
  })

  it('cancelado LIBERA o horario', () => {
    const livres = horariosLivres({
      ...base,
      ocupados: [agendamento({ ends_at: ABRE + HORA, starts_at: ABRE, status: 'cancelado' })]
    })

    expect(livres).toHaveLength(3)
  })

  it('concluido e faltou NAO liberam: o horario passou', () => {
    for (const status of ['concluido', 'faltou'] as const) {
      const livres = horariosLivres({ ...base, ocupados: [agendamento({ ends_at: ABRE + HORA, starts_at: ABRE, status })] })

      expect(livres).toHaveLength(2)
    }
  })

  it('bloqueio ocupa horario como agendamento', () => {
    const livres = horariosLivres({ ...base, bloqueios: [bloqueio()], ocupados: [] })

    expect(livres).toHaveLength(2)
    expect(livres[0]!.starts_at).toBe(ABRE + HORA)
  })

  it('ignora agendamento de OUTRO recurso', () => {
    const livres = horariosLivres({
      ...base,
      ocupados: [agendamento({ resource_id: 'prof-2' })]
    })

    expect(livres).toHaveLength(3)
  })

  it('ignora bloqueio de OUTRO recurso', () => {
    const livres = horariosLivres({ ...base, bloqueios: [bloqueio({ resource_id: 'sala-1' })], ocupados: [] })

    expect(livres).toHaveLength(3)
  })

  it('nao oferece horario que termina depois do expediente', () => {
    const livres = horariosLivres({ ...base, duracao_minutos: 60, ocupados: [], janela: { abre: ABRE, fecha: ABRE + 90 * MIN } })

    // Expediente de 90min: so 09:00 cabe inteiro (granularidade 60).
    expect(livres).toHaveLength(1)
  })

  it('nao_antes_de corta o passado', () => {
    const livres = horariosLivres({ ...base, nao_antes_de: ABRE + HORA + 15 * MIN, ocupados: [] })

    // Piso 10:15, granularidade 60 -> 10:15 e 11:15; 11:15 terminaria 12:15.
    expect(livres.map(l => (l.starts_at - ABRE) / MIN)).toEqual([75])
  })

  it('granularidade padrao e 30 minutos', () => {
    // A agenda real oferece de meia em meia; o padrao importa para nao esconder horario util.
    const livres = horariosLivres({ duracao_minutos: 60, janela: JANELA, ocupados: [], resource_id: 'prof-1' })
    const inicios = livres.map(l => (l.starts_at - ABRE) / MIN)

    expect(inicios).toEqual([0, 30, 60, 90, 120])
  })

  it('duracao zero ou negativa devolve lista vazia', () => {
    expect(horariosLivres({ ...base, duracao_minutos: 0, ocupados: [] })).toEqual([])
    expect(horariosLivres({ ...base, duracao_minutos: -30, ocupados: [] })).toEqual([])
    expect(horariosLivres({ ...base, duracao_minutos: Number.NaN, ocupados: [] })).toEqual([])
  })

  it('dia lotado devolve lista vazia', () => {
    const livres = horariosLivres({
      ...base,
      ocupados: [agendamento({ ends_at: ABRE + 3 * HORA, starts_at: ABRE })]
    })

    expect(livres).toEqual([])
  })

  it('granularidade menor oferece mais horarios', () => {
    const livres = horariosLivres({ ...base, duracao_minutos: 30, granularidade_minutos: 15, ocupados: [] })

    // 09:00 ate 11:30 incluido (termina 12:00), de 15 em 15 = 11 slots.
    expect(livres).toHaveLength(11)
  })
})

describe('proximoHorario', () => {
  it('devolve o primeiro livre', () => {
    const s = proximoHorario({ ...base, ocupados: [agendamento({ ends_at: ABRE + HORA, starts_at: ABRE })] })

    expect(s?.starts_at).toBe(ABRE + HORA)
  })

  it('devolve NULL quando nao ha horario', () => {
    // Null forca o chamador a tratar "nao tem horario" — o caso que a recepcao precisa ver.
    expect(proximoHorario({ ...base, duracao_minutos: 600, ocupados: [] })).toBeNull()
  })
})

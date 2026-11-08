import { describe, expect, it } from 'vitest'

import { linkService, priceForAppointment, timestampOf } from './scheduling-service-link'
import type { Service } from './services-store'

const servico = (over: Partial<Service> = {}): Service => ({
  active: true,
  created_at: 1,
  duration_min: 30,
  id: 'srv_1',
  name: 'Corte',
  notes: '',
  price_cents: 5000,
  tenant_id: 'local',
  updated_at: 1,
  ...over
})

const INICIO = 1_700_000_000_000

describe('timestampOf', () => {
  it('aceita epoch em ms e string ISO', () => {
    expect(timestampOf(INICIO)).toBe(INICIO)
    expect(timestampOf('2023-11-14T22:13:20.000Z')).toBe(INICIO)
  })

  it('recusa o que nao e data', () => {
    expect(timestampOf('amanha')).toBeNull()
    expect(timestampOf(null)).toBeNull()
    expect(timestampOf(Number.NaN)).toBeNull()
    expect(timestampOf('')).toBeNull()
  })
})

describe('ligar agendamento ao servico', () => {
  it('resolve o texto para o servico canonico', () => {
    const r = linkService({ service: '  CORTE ', starts_at: INICIO }, [servico()])

    expect('linked' in r && r.linked.service).toBe('Corte')
    expect('linked' in r && r.linked.service_id).toBe('srv_1')
  })

  it('DERIVA ends_at da duracao do catalogo', () => {
    const r = linkService({ service: 'Corte', starts_at: INICIO }, [servico({ duration_min: 45 })])

    expect('linked' in r && r.linked.ends_at).toBe(INICIO + 45 * 60_000)
  })

  it('IGNORA ends_at informado — o catalogo manda', () => {
    const r = linkService({ ends_at: INICIO + 9_999_999, service: 'Corte', starts_at: INICIO }, [servico({ duration_min: 30 })])

    expect('linked' in r && r.linked.ends_at).toBe(INICIO + 30 * 60_000)
  })

  it('leva o preco do catalogo para o agendamento', () => {
    const r = linkService({ service: 'Corte', starts_at: INICIO }, [servico({ price_cents: 7500 })])

    expect('linked' in r && r.linked.price_cents).toBe(7500)
  })

  it('recusa servico fora do catalogo em vez de criar um novo', () => {
    // Cadastro de servico e ato deliberado; um agendamento nao pode criar catalogo por acidente.
    expect(linkService({ service: 'Escova', starts_at: INICIO }, [servico()])).toEqual({
      error: 'servico_nao_encontrado'
    })
  })

  it('recusa servico inativo — nao se agenda o que foi desligado', () => {
    expect(linkService({ service: 'Corte', starts_at: INICIO }, [servico({ active: false })])).toEqual({
      error: 'servico_nao_encontrado'
    })
  })

  it('exige servico e inicio', () => {
    expect(linkService({ starts_at: INICIO }, [servico()])).toEqual({ error: 'service_required' })
    expect(linkService({ service: '   ', starts_at: INICIO }, [servico()])).toEqual({ error: 'service_required' })
    expect(linkService({ service: 'Corte' }, [servico()])).toEqual({ error: 'starts_at_invalid' })
  })
})

describe('valor do agendamento', () => {
  it('usa o preco gravado quando existe', () => {
    expect(priceForAppointment({ price_cents: 4200, service: 'Corte' }, [servico()])).toBe(4200)
  })

  it('cai no catalogo quando o agendamento e antigo e nao tem preco', () => {
    expect(priceForAppointment({ service: 'corte' }, [servico({ price_cents: 6000 })])).toBe(6000)
  })

  it('devolve null quando o servico sumiu — nao inventa valor', () => {
    expect(priceForAppointment({ service: 'Servico Removido' }, [servico()])).toBeNull()
  })
})

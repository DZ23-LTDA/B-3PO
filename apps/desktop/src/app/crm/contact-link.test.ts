import { describe, expect, it } from 'vitest'

import { openValueCents, opportunitiesFor, samePhone } from './contact-link'

const op = (phone: string, stage: string, value_cents: number) => ({
  contact_phone: phone,
  stage,
  value_cents,
})

describe('samePhone', () => {
  it('ignora mascara e espaco', () => {
    expect(samePhone('+55 11 99999-1111', '5511999991111')).toBe(true)
  })

  it('numero vazio nao casa com nada, nem consigo mesmo', () => {
    expect(samePhone('', '')).toBe(false)
    expect(samePhone('---', '')).toBe(false)
  })

  it('numeros diferentes nao casam', () => {
    expect(samePhone('+5511999991111', '+5521988887777')).toBe(false)
  })
})

describe('opportunitiesFor', () => {
  it('traz so as oportunidades do contato', () => {
    const lista = [op('5511999991111', 'novo', 1000), op('5521988887777', 'novo', 5000)]

    expect(opportunitiesFor({ contact_phone: '+55 11 99999-1111' }, lista)).toHaveLength(1)
  })

  it('contato sem oportunidade devolve lista vazia', () => {
    expect(opportunitiesFor({ contact_phone: '+5511977776666' }, [])).toEqual([])
  })
})

describe('openValueCents', () => {
  it('soma so o que esta aberto: ganho e perdido saem da conta', () => {
    const lista = [
      op('1', 'proposta', 10000),
      op('1', 'negociacao', 5000),
      op('1', 'ganho', 99999),
      op('1', 'perdido', 88888),
    ]

    expect(openValueCents(lista)).toBe(15000)
  })

  it('lista vazia soma zero, nao quebra', () => {
    expect(openValueCents([])).toBe(0)
  })
})

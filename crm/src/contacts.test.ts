/**
 * Contatos (normalização E.164) e funil (dado informativo, sem movimento financeiro).
 */
import { describe, expect, it } from 'vitest'

import { createContact, DEFAULT_STAGES, funnelMetrics, moveDeal, normalizePhone, updateContact, type Deal } from './contacts'

describe('normalizePhone', () => {
  it('normaliza o formato brasileiro comum', () => {
    expect(normalizePhone('+55 (11) 99999-8888')).toBe('+5511999998888')
    expect(normalizePhone('5511999998888')).toBe('+5511999998888')
    expect(normalizePhone('11999998888')).toBe('+5511999998888')
  })

  it('descarta zero de discagem e completa o nono dígito', () => {
    expect(normalizePhone('011 99999-8888')).toBe('+5511999998888')
    expect(normalizePhone('1133334444')).toBe('+5511933334444')
  })

  it('rejeita entrada curta demais', () => {
    expect(normalizePhone('1234')).toBeNull()
    expect(normalizePhone('')).toBeNull()
  })

  it('mantém número internacional que já veio com DDI', () => {
    expect(normalizePhone('14155552671', '1')).toBe('+114155552671')
  })
})

describe('createContact', () => {
  it('cria contato com id estável derivado do telefone', () => {
    const contact = createContact({ name: 'Ana', phone: '+55 (11) 99999-8888', tags: ['lead'] })

    expect(contact).toMatchObject({ id: 'contact_5511999998888', phone: '+5511999998888', tags: ['lead'] })
  })

  it('não cria contato sem telefone válido', () => {
    expect(createContact({ phone: 'abc' })).toBe('invalid_phone')
  })

  it('update não muda identidade', () => {
    const contact = createContact({ phone: '5511999998888' })
    if (typeof contact === 'string') {
      throw new Error('contato inválido')
    }

    const updated = updateContact(contact, { name: 'Ana' }, 123)
    expect(updated).toMatchObject({ id: contact.id, name: 'Ana', phone: contact.phone, updatedAt: 123 })
  })
})

describe('funil', () => {
  const deal = (id: string, stageId: string, valueCents?: number): Deal => ({
    contactId: 'c1',
    createdAt: 0,
    id,
    stageId,
    title: id,
    updatedAt: 0,
    valueCents
  })

  it('move para etapa existente e rejeita etapa desconhecida', () => {
    const moved = moveDeal(deal('d1', 'new'), 'qualified', DEFAULT_STAGES, 99)
    expect(moved).toMatchObject({ stageId: 'qualified', updatedAt: 99 })

    expect(() => moveDeal(deal('d1', 'new'), 'inexistente', DEFAULT_STAGES)).toThrow(/etapa desconhecida/)
  })

  it('métricas contam e somam valor por etapa, na ordem', () => {
    const metrics = funnelMetrics([deal('a', 'new', 100), deal('b', 'new', 50), deal('c', 'won', 999)], DEFAULT_STAGES)

    expect(metrics[0]).toEqual({ count: 2, stageId: 'new', valueCents: 150 })
    expect(metrics.find(m => m.stageId === 'won')).toEqual({ count: 1, stageId: 'won', valueCents: 999 })
  })
})

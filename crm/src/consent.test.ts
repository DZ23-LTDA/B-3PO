/**
 * Consentimento: opt-in é pré-requisito, opt-out é imediato, janela de 24h é regra.
 */
import { describe, expect, it } from 'vitest'

import {
  applyConsent,
  decideSend,
  emptyConsent,
  noteInbound,
  noteOutboundKeyword,
  SERVICE_WINDOW_MS,
  type ConsentEvent
} from './consent'

const NOW = 1_700_000_000_000
const optIn = (at = NOW - 1000): ConsentEvent => ({ at, by: 'agent', kind: 'opt_in', source: 'form' })

describe('applyConsent', () => {
  it('opt-in por formulário liga o consentimento', () => {
    const consent = applyConsent(emptyConsent(), optIn())
    expect(consent.state).toBe('opted_in')
  })

  it('importação sem evidência NÃO é consentimento', () => {
    const consent = applyConsent(emptyConsent(), { at: NOW, by: 'import', kind: 'opt_in', source: 'import' })
    expect(consent.state).toBe('unknown')
  })

  it('opt-out sempre vence e fica no histórico', () => {
    let consent = applyConsent(emptyConsent(), optIn())
    consent = applyConsent(consent, { at: NOW, by: 'customer', kind: 'opt_out', source: 'customer_message' })

    expect(consent.state).toBe('opted_out')
    expect(consent.events).toHaveLength(2)
  })

  it('opt-out depois de opt-in não volta com novo opt-in sem novo evento', () => {
    let consent = applyConsent(emptyConsent(), optIn())
    consent = applyConsent(consent, { at: NOW, by: 'customer', kind: 'opt_out', source: 'customer_message' })
    consent = applyConsent(consent, optIn(NOW + 10))

    expect(consent.state).toBe('opted_in') // novo opt-in explícito religa…
    expect(consent.events.map(event => event.kind)).toEqual(['opt_in', 'opt_out', 'opt_in'])
  })
})

describe('decideSend', () => {
  it('sem consentimento não envia', () => {
    expect(decideSend(emptyConsent(), NOW)).toMatchObject({ allowed: false, reason: 'no_consent' })
  })

  it('opt-out nunca envia, nem com template', () => {
    const consent = applyConsent(emptyConsent(), { at: NOW, by: 'customer', kind: 'opt_out', source: 'customer_message' })

    expect(decideSend(consent, NOW, { templateApproved: true })).toMatchObject({ allowed: false, reason: 'opted_out' })
  })

  it('dentro da janela de 24h envia texto livre', () => {
    const consent = noteInbound(applyConsent(emptyConsent(), optIn()), NOW - 1000)

    expect(decideSend(consent, NOW)).toMatchObject({ allowed: true, reason: 'ok_service_window', requiresTemplate: false })
  })

  it('fora da janela exige template aprovado', () => {
    const consent = noteInbound(applyConsent(emptyConsent(), optIn()), NOW - SERVICE_WINDOW_MS - 1)

    expect(decideSend(consent, NOW)).toMatchObject({
      allowed: false,
      reason: 'outside_window_needs_template',
      requiresTemplate: true
    })
    expect(decideSend(consent, NOW, { templateApproved: true })).toMatchObject({
      allowed: true,
      reason: 'ok_template'
    })
  })

  it('janela expira exatamente após 24h', () => {
    const consent = noteInbound(applyConsent(emptyConsent(), optIn()), NOW - SERVICE_WINDOW_MS)

    expect(decideSend(consent, NOW).allowed).toBe(true)
    expect(decideSend(consent, NOW + 1).allowed).toBe(false)
  })
})

describe('palavras de saída', () => {
  it.each(['sair', 'PARAR', ' cancelar ', 'stop', 'unsubscribe', 'descadastrar'])(
    'a palavra %s ativa opt-out',
    word => {
      const consent = noteOutboundKeyword(applyConsent(emptyConsent(), optIn()), word, NOW, 'customer')
      expect(consent.state).toBe('opted_out')
    }
  )

  it('mensagem normal não mexe no consentimento', () => {
    const base = applyConsent(emptyConsent(), optIn())
    const consent = noteOutboundKeyword(base, 'quero saber o preço', NOW, 'customer')

    expect(consent.state).toBe('opted_in')
    expect(consent.events).toHaveLength(1)
  })
})

import { describe, expect, it } from 'vitest'

import { buildTextPayload, MAX_BODY, normalizeRecipient } from './crm-whatsapp-outbound'

describe('normalizeRecipient', () => {
  it('tira mascara e deixa so digitos com DDI', () => {
    expect(normalizeRecipient('+55 11 99999-1111')).toEqual({ to: '5511999991111' })
    expect(normalizeRecipient('(21) 98888-7777')).toEqual({ to: '21988887777' })
  })

  it('recusa telefone curto ou longo demais em vez de tentar enviar', () => {
    expect(normalizeRecipient('1234')).toHaveProperty('error')
    expect(normalizeRecipient('1'.repeat(16))).toHaveProperty('error')
    expect(normalizeRecipient('')).toHaveProperty('error')
  })
})

describe('buildTextPayload', () => {
  it('monta o corpo que a Cloud API espera', () => {
    const resultado = buildTextPayload('+5511999991111', 'Oi! Segue a proposta.')

    if ('error' in resultado) {
      throw new Error(resultado.error)
    }
    expect(resultado.payload).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      text: { body: 'Oi! Segue a proposta.', preview_url: false },
      to: '5511999991111',
      type: 'text',
    })
  })

  it('apara espaco nas pontas sem cortar o texto do meio', () => {
    const resultado = buildTextPayload('5511999991111', '   duas linhas\ncontinuam  ')

    if ('error' in resultado) {
      throw new Error(resultado.error)
    }
    expect(resultado.payload.text.body).toBe('duas linhas\ncontinuam')
  })

  it('recusa mensagem vazia ou so espaco', () => {
    expect(buildTextPayload('5511999991111', '   ')).toHaveProperty('error')
    expect(buildTextPayload('5511999991111', '')).toHaveProperty('error')
  })

  it('recusa acima do limite da Meta e informa o tamanho real', () => {
    const resultado = buildTextPayload('5511999991111', 'x'.repeat(MAX_BODY + 1))

    if (!('error' in resultado)) {
      throw new Error('deveria recusar')
    }
    expect(resultado.error).toContain(String(MAX_BODY + 1))
  })

  it('aceita exatamente no limite', () => {
    const resultado = buildTextPayload('5511999991111', 'x'.repeat(MAX_BODY))

    expect('payload' in resultado).toBe(true)
  })
})

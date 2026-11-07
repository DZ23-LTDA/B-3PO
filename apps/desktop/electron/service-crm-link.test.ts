// A ligacao atendimento -> CRM (r146 do GOAL V2).

import { describe, expect, it } from 'vitest'

import { intencaoParaContato, patchDoContatoPorAtendimento, telefoneDoContato } from './service-crm-link'

const TICKET = { contact_phone: '+5511999990009', opened_at: 1_700_000_000_000, tenant_id: 'local', ticket_id: 't1' }

describe('o telefone normaliza IGUAL a venda', () => {
  it('so digitos, e curto demais nao e telefone', () => {
    expect(telefoneDoContato('+55 (11) 99999-0009')).toBe('5511999990009')
    expect(telefoneDoContato('1234')).toBeNull()
    expect(telefoneDoContato(null)).toBeNull()
  })

  it('a MESMA grafia da venda — senao o cliente vira dois contatos', () => {
    // r133 (venda) e r146 (atendimento) normalizam com a mesma regra. Se divergissem, quem reclama primeiro
    // criaria um contato e quem compra depois criaria outro.
    expect(telefoneDoContato('+5511999990009')).toBe('5511999990009')
  })
})

describe('o ticket abre um contato no CRM', () => {
  it('devolve a intencao com telefone e data', () => {
    expect(intencaoParaContato(TICKET)).toMatchObject({
      telefone: '5511999990009',
      tipo: 'registrar',
      ultimoTicketEm: 1_700_000_000_000
    })
  })

  it('o nome sugerido DIZ de onde veio — `Cliente do atendimento`', () => {
    const r = intencaoParaContato(TICKET)

    if (r.tipo !== 'registrar') throw new Error('esperava registrar')

    // O ticket nao tem nome. Um nome inventado pareceria confirmado.
    expect(r.nomeSugerido).toBe('Cliente do atendimento')
  })

  it('o patch NAO tem nome nem compra — cada ligacao escreve o seu campo', () => {
    const r = intencaoParaContato(TICKET)
    if (r.tipo !== 'registrar') throw new Error('esperava registrar')

    const patch = patchDoContatoPorAtendimento(r)

    expect(Object.keys(patch)).toEqual(['last_ticket_at', 'last_ticket_id'])
    expect('name' in patch).toBe(false)
    expect('last_purchase_at' in patch).toBe(false)
  })
})

describe('sem telefone, nao cria contato', () => {
  it('ticket sem telefone nao identifica ninguem', () => {
    const r = intencaoParaContato({ ...TICKET, contact_phone: null })

    expect(r).toEqual({ motivo: 'sem_telefone', tipo: 'nada' })
  })
})

// A ligacao venda -> CRM (r133 do GOAL V2).

import { describe, expect, it } from 'vitest'

import { intencaoParaCrm, intencaoParaCrmCancelada, patchDoContato, telefoneDoCrm } from './sales-crm-link'

const VENDA = { contact_phone: '+55 11 99999-0009', sale_id: 'v1', tenant_id: 'local', total_cents: 15000 }

describe('o telefone vira a chave do CRM', () => {
  it('tira tudo que nao e digito', () => {
    expect(telefoneDoCrm('+55 (11) 99999-0009')).toBe('5511999990009')
    expect(telefoneDoCrm('11 9 9999 0009')).toBe('11999990009')
  })

  it('curto demais nao e telefone — e ramal, erro de digitacao ou vazio', () => {
    for (const ruim of ['', '1234', '0', null, undefined, 42, {}]) expect(telefoneDoCrm(ruim)).toBeNull()
  })

  it('NAO inventa o DDI — duas grafias com e sem +55 continuam diferentes', () => {
    // Adivinhar DDI erra para quem atende em outro pais, e o CRM usa a chave (phone, tenant_id): duas grafias
    // do mesmo numero viram DOIS clientes, e isso tem que ser visivel.
    expect(telefoneDoCrm('11999990009')).not.toBe(telefoneDoCrm('+5511999990009'))
  })
})

describe('a venda faturada REGISTRA', () => {
  it('devolve a intencao com telefone, total e data', () => {
    const r = intencaoParaCrm(VENDA, 1_700_000_000_000)

    expect(r).toMatchObject({
      telefone: '5511999990009',
      tipo: 'registrar',
      totalCents: 15000,
      ultimaCompraEm: 1_700_000_000_000
    })
  })

  it('o patch NAO tem nome — a compra nao sobrescreve o cadastro', () => {
    const r = intencaoParaCrm(VENDA, 1)
    if (r.tipo !== 'registrar') throw new Error('esperava registrar')

    const patch = patchDoContato(r)

    expect(Object.keys(patch)).toEqual(['last_purchase_at', 'last_purchase_cents', 'last_sale_id'])
    expect('name' in patch).toBe(false)
  })
})

describe('sem telefone, o CRM nao ganha um contato que ninguem acha', () => {
  it('venda sem contact_phone nao cria nada', () => {
    const r = intencaoParaCrm({ ...VENDA, contact_phone: null })

    expect(r).toEqual({ motivo: 'sem_telefone', tipo: 'nada' })
  })

  it('e o motivo e NOMEADO — nao e um `null` mudo', () => {
    // Um `null` diria "nao sei"; `sem_telefone` diz por que.
    const r = intencaoParaCrm({ ...VENDA, contact_phone: '' })

    expect(r.tipo).toBe('nada')
    if (r.tipo === 'nada') expect(r.motivo).toBe('sem_telefone')
  })
})

describe('a venda cancelada NAO registra', () => {
  it('cancelar devolve nada com motivo proprio', () => {
    // Uma venda cancelada e um fato contabil, nao um relacionamento.
    expect(intencaoParaCrmCancelada()).toEqual({ motivo: 'cancelada', tipo: 'nada' })
  })
})

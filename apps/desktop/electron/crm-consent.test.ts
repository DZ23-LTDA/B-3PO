// Consentimento no CRM: contratos (rodada 185).
//
// O GOAL §12 pede "consentimento" no CRM e §25 pede LGPD. A r183 mediu que so havia privacidade generica em
// privacy.ts, nada no contato. Estes testes fixam o registro e, principalmente, o que a AUSENCIA significa.

import { describe, expect, it } from 'vitest'

import { normalizarConsentimento, normalizeContact, podeReceberComunicacao, type CrmContact } from './crm-contacts-store'

const base = { name: 'Fulano', phone: '+5511999998888' }

const contato = (consent: CrmContact['consent']): CrmContact =>
  ({
    company: '',
    consent,
    created_at: 1,
    email: '',
    name: 'Fulano',
    phone: '+5511999998888',
    tags: [],
    tenant_id: 'local',
    updated_at: 1
  }) as CrmContact

describe('o registro de consentimento', () => {
  it('guarda base legal, data e se autorizou', () => {
    const c = normalizarConsentimento({ at: 1_800_000_000_000, base: 'consentimento', granted: true })

    expect(c).toEqual({ at: 1_800_000_000_000, base: 'consentimento', granted: true })
  })

  it('recusa explicita e registrada como recusa, nao como ausencia', () => {
    // `granted: false` e um fato: o titular disse nao. `null` e outra coisa: ninguem perguntou.
    const c = normalizarConsentimento({ at: 1_800_000_000_000, base: 'consentimento', granted: false })

    expect(c?.granted).toBe(false)
  })

  it('base legal invalida NAO vira consentimento', () => {
    // Um consentimento adivinhado aparece no relatorio de conformidade como se o titular tivesse autorizado.
    expect(normalizarConsentimento({ at: 1_800_000_000_000, base: 'porque_sim', granted: true })).toBeNull()
  })

  it('data invalida NAO vira consentimento', () => {
    expect(normalizarConsentimento({ at: 0, base: 'consentimento', granted: true })).toBeNull()
    expect(normalizarConsentimento({ at: 'ontem', base: 'consentimento', granted: true })).toBeNull()
  })

  it('granted que nao e booleano NAO vira consentimento', () => {
    // `'true'` como string e o tipo de dado que passa por um formulario e engana o relatorio.
    expect(normalizarConsentimento({ at: 1, base: 'consentimento', granted: 'true' })).toBeNull()
  })

  it('lixo vira null em vez de derrubar a leitura', () => {
    expect(normalizarConsentimento(null)).toBeNull()
    expect(normalizarConsentimento(undefined)).toBeNull()
    expect(normalizarConsentimento('consentido')).toBeNull()
    expect(normalizarConsentimento({})).toBeNull()
  })
})

describe('contato novo sem consentimento', () => {
  it('fica com null, nao com false', () => {
    // A diferenca importa: false diria "recusou"; null diz "nao registrado".
    const r = normalizeContact(base, 1000, 'local')

    if ('contact' in r) expect(r.contact.consent).toBeNull()
  })
})

describe('quem pode receber comunicacao', () => {
  it('so quem autorizou', () => {
    expect(podeReceberComunicacao(contato({ at: 1, base: 'consentimento', granted: true }))).toBe(true)
  })

  it('quem recusou nao pode', () => {
    expect(podeReceberComunicacao(contato({ at: 1, base: 'consentimento', granted: false }))).toBe(false)
  })

  it('quem nunca foi perguntado NAO pode', () => {
    // Ausencia de registro nunca vira permissao. Este e o invariante que a LGPD exige.
    expect(podeReceberComunicacao(contato(null))).toBe(false)
  })
})

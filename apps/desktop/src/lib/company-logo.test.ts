import { describe, expect, it } from 'vitest'

import { companyDomainFromEmail, companyLogoUrl, isFreeMailDomain, registrableDomain } from './company-logo'

const token = 'pk_test_123'

describe('domínio da empresa a partir do e-mail', () => {
  it('extrai o domínio e ignora caixa', () => {
    expect(companyDomainFromEmail('Maria@Acme.com.BR')).toBe('acme.com.br')
  })

  it('devolve vazio quando não é e-mail', () => {
    expect(companyDomainFromEmail('maria')).toBe('')
    expect(companyDomainFromEmail('@acme.com')).toBe('')
    expect(companyDomainFromEmail('maria@')).toBe('')
    expect(companyDomainFromEmail('maria@localhost')).toBe('')
  })

  it('reduz subdomínio ao domínio registrável, respeitando TLD composto', () => {
    expect(registrableDomain('app.acme.com')).toBe('acme.com')
    expect(registrableDomain('mail.acme.com.br')).toBe('acme.com.br')
    expect(registrableDomain('acme.com')).toBe('acme.com')
  })

  it('reconhece e-mail pessoal', () => {
    expect(isFreeMailDomain('gmail.com')).toBe(true)
    expect(isFreeMailDomain('uol.com.br')).toBe(true)
    expect(isFreeMailDomain('acme.com.br')).toBe(false)
  })
})

describe('URL do logo da empresa', () => {
  it('monta a URL do logo.dev com token, tamanho e retina', () => {
    const url = companyLogoUrl('maria@acme.com.br', { token })

    expect(url).toBe(`https://img.logo.dev/acme.com.br?token=${encodeURIComponent(token)}&size=64&format=png&retina=true`)
  })

  it('não busca nada sem token — recurso desligado por padrão', () => {
    expect(companyLogoUrl('maria@acme.com', { token: '' })).toBeNull()
    expect(companyLogoUrl('maria@acme.com', { token: '   ' })).toBeNull()
  })

  it('não usa logo de provedor pessoal como se fosse a empresa', () => {
    expect(companyLogoUrl('maria@gmail.com', { token })).toBeNull()
    expect(companyLogoUrl('maria@uol.com.br', { token })).toBeNull()
  })

  it('aceita domínio forçado quando o e-mail não identifica a empresa', () => {
    expect(companyLogoUrl('maria@gmail.com', { domain: 'acme.com.br', token })).toContain('acme.com.br')
  })
})

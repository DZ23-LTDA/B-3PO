import { describe, expect, it, vi } from 'vitest'

import { COMPANY_LOGO_CHANNEL, readCompanyLogoConfig, registerCrmCompanyLogoIpc } from './crm-company-logo'

describe('config do logo da empresa', () => {
  it('fica desligado sem token', () => {
    expect(readCompanyLogoConfig({})).toEqual({ enabled: false, token: '' })
    expect(readCompanyLogoConfig({ B3PO_LOGO_DEV_TOKEN: '   ' })).toEqual({ enabled: false, token: '' })
  })

  it('liga com o token do ambiente, sem espaços', () => {
    expect(readCompanyLogoConfig({ B3PO_LOGO_DEV_TOKEN: ' pk_abc ' })).toEqual({ enabled: true, token: 'pk_abc' })
  })

  it('registra o canal no processo principal', () => {
    const handle = vi.fn()

    registerCrmCompanyLogoIpc({ handle })

    expect(handle).toHaveBeenCalledWith(COMPANY_LOGO_CHANNEL, expect.any(Function))
  })
})

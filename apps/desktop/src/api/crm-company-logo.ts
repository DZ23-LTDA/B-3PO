/**
 * Ponte do logo da empresa (logo.dev) no renderer.
 *
 * O token vem do processo principal por IPC — sem bridge (web/build sem disco local) o recurso simplesmente não
 * existe, e a tela não mostra nada. Nenhum domínio de cliente sai da máquina sem token configurado.
 */

import { companyLogoUrl } from '@/lib/company-logo'

export interface CompanyLogoConfig {
  enabled: boolean
  token: string
}

const DISABLED: CompanyLogoConfig = { enabled: false, token: '' }

type Bridge = {
  config: () => Promise<CompanyLogoConfig>
}

function bridge(): Bridge | null {
  if (typeof window === 'undefined') {
    return null
  }

  const api = (window as unknown as { hermesDesktop?: { crmCompanyLogo?: Bridge } }).hermesDesktop

  return api?.crmCompanyLogo ?? null
}

let cached: CompanyLogoConfig | null = null

/** Config do logo (uma leitura por sessão; o token não muda em runtime). */
export async function companyLogoConfig(): Promise<CompanyLogoConfig> {
  if (cached) {
    return cached
  }

  const api = bridge()

  if (!api) {
    cached = DISABLED

    return cached
  }

  try {
    const config = await api.config()

    cached = { enabled: Boolean(config?.enabled), token: config?.token ?? '' }
  } catch {
    cached = DISABLED
  }

  return cached
}

/** URL do logo para um contato — `null` quando o recurso está desligado ou o e-mail não identifica empresa. */
export function companyLogoFor(email: string, config: CompanyLogoConfig): null | string {
  return config.enabled ? companyLogoUrl(email, { token: config.token }) : null
}

/** Só para teste: esquece o cache entre casos. */
export function resetCompanyLogoCacheForTest(): void {
  cached = null
}

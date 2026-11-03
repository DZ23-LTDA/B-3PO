/**
 * Logo da empresa do contato, via logo.dev.
 *
 * De onde vem o domínio: do e-mail do próprio contato. É o único dado que já existe e que identifica a empresa
 * sem pedir mais nada ao usuário. E-mail pessoal (gmail, outlook, uol…) NÃO vira logo de empresa — mostrar o
 * logo do Gmail como "empresa do cliente" seria mentira visual.
 *
 * Privacidade: cada pedido conta a um terceiro (logo.dev) quais empresas você acompanha. Por isso o recurso só
 * liga com `B3PO_LOGO_DEV_TOKEN` configurado, e a tela declara isso — não é telemetria escondida.
 */

/** Provedores de e-mail pessoal: o domínio não é a empresa do contato. */
const FREE_MAIL_DOMAINS = new Set([
  'aol.com',
  'bol.com.br',
  'gmail.com',
  'globo.com',
  'gmx.com',
  'hotmail.com',
  'icloud.com',
  'ig.com.br',
  'live.com',
  'me.com',
  'msn.com',
  'outlook.com',
  'proton.me',
  'protonmail.com',
  'terra.com.br',
  'tutanota.com',
  'uol.com.br',
  'yahoo.com',
  'yandex.com',
  'zipmail.com.br'
])

/** TLDs compostos que não podem ser partidos no meio (`acme.com.br`, não `com.br`). */
const TWO_PART_TLDS = new Set(['com.br', 'com.ar', 'co.uk', 'com.mx', 'com.pt', 'co.jp', 'com.au'])

export interface CompanyLogoSource {
  /** Token publicável do logo.dev (`pk_…`). Sem ele, nada é buscado. */
  token: string
  /** Opcional: força o domínio quando o e-mail não ajuda. */
  domain?: string
}

/** Domínio registrável de um e-mail: `maria@acme.com.br` → `acme.com.br`. Vazio quando não é e-mail. */
export function companyDomainFromEmail(email: string): string {
  const texto = (email ?? '').trim().toLowerCase()
  const at = texto.lastIndexOf('@')

  if (at <= 0 || at === texto.length - 1) {
    return ''
  }

  const domain = texto.slice(at + 1).replace(/[^a-z0-9.-]/g, '')

  return domain.includes('.') ? domain : ''
}

/** `true` quando o domínio não identifica a empresa (e-mail pessoal). */
export function isFreeMailDomain(domain: string): boolean {
  const limpo = (domain ?? '').trim().toLowerCase()

  if (!limpo) {
    return true
  }

  return FREE_MAIL_DOMAINS.has(limpo) || limpo.startsWith('gmail.') || limpo.startsWith('hotmail.')
}

/** Domínio registrável (`app.acme.com` → `acme.com`), respeitando TLDs compostos. */
export function registrableDomain(domain: string): string {
  const partes = (domain ?? '').trim().toLowerCase().split('.').filter(Boolean)

  if (partes.length <= 2) {
    return partes.join('.')
  }

  const ultimo = partes.at(-1) ?? ''
  const penultimo = partes.at(-2) ?? ''

  if (TWO_PART_TLDS.has(`${penultimo}.${ultimo}`)) {
    return partes.slice(-3).join('.')
  }

  return partes.slice(-2).join('.')
}

/**
 * URL do logo para um contato. `null` = não buscar nada (sem token, e-mail pessoal ou e-mail inválido).
 * Timeout e cache ficam do lado do renderer: aqui é só a decisão.
 */
export function companyLogoUrl(email: string, source: CompanyLogoSource): null | string {
  const token = (source.token ?? '').trim()

  if (!token) {
    return null
  }

  const forcado = registrableDomain(source.domain ?? '')
  const doEmail = companyDomainFromEmail(email)
  const domain = forcado || (isFreeMailDomain(doEmail) ? '' : registrableDomain(doEmail))

  if (!domain) {
    return null
  }

  return `https://img.logo.dev/${domain}?token=${encodeURIComponent(token)}&size=64&format=png&retina=true`
}

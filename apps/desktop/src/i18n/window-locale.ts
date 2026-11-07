import { isSupportedLocaleValue, normalizeLocale } from './languages'
import { setRuntimeI18nLocale } from './runtime'

/**
 * A locale ativa, publicado para as OUTRAS janelas do mesmo bundle.
 *
 * A janela do Quick Entry (`?win=quick`) monta um renderer mínimo: não tem `I18nProvider` nem cliente de
 * config, então `display.language` — a fonte canônica — não chega até ela. Como as janelas compartilham o
 * mesmo `localStorage` (mesma origem e partição), o provider grava aqui o idioma resolvido e a janela lê no
 * boot. Sem provider, sem duplicar a leitura de config.
 */
export const DESKTOP_LOCALE_KEY = 'b3po.desktop.activeLocale'

/** Grava a locale ativa. Silencioso quando não há `localStorage` (SSR, testes sem DOM). */
export function persistDesktopLocale(locale: string): void {
  try {
    window.localStorage.setItem(DESKTOP_LOCALE_KEY, locale)
  } catch {
    // storage indisponível/cheio: a janela principal já está traduzida, isso é só o atalho entre janelas.
  }
}

/** Lê a locale publicada pela janela principal. `null` = nada gravado ou valor irreconhecível. */
export function readDesktopLocale(): null | string {
  try {
    const bruto = window.localStorage.getItem(DESKTOP_LOCALE_KEY)

    return bruto && isSupportedLocaleValue(bruto) ? normalizeLocale(bruto) : null
  } catch {
    return null
  }
}

/** Aplica a locale publicada ao tradutor de módulo (o que `translateNow` usa). Devolve a aplicada. */
export function adoptDesktopLocale(): null | string {
  const locale = readDesktopLocale()

  if (locale) {
    setRuntimeI18nLocale(locale)
  }

  return locale
}

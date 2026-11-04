import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getRuntimeI18nLocale, setRuntimeI18nLocale } from './runtime'
import { adoptDesktopLocale, DESKTOP_LOCALE_KEY, persistDesktopLocale, readDesktopLocale } from './window-locale'

/**
 * A janela do Quick Entry é um renderer separado, sem `I18nProvider` nem cliente de config: ela depende
 * exclusivamente desta ponte para não nascer em inglês. Se algo aqui quebrar, a janela volta a mostrar
 * "Send to" / "Current chat" para todo mundo — por isso os testes olham o valor gravado E o efeito no
 * tradutor de módulo, não só a ida e volta.
 */
function fakeStorage(): Storage {
  const dados = new Map<string, string>()

  return {
    clear: () => dados.clear(),
    getItem: (chave: string) => dados.get(chave) ?? null,
    key: (i: number) => [...dados.keys()][i] ?? null,
    get length() {
      return dados.size
    },
    removeItem: (chave: string) => void dados.delete(chave),
    setItem: (chave: string, valor: string) => void dados.set(chave, valor)
  } as Storage
}

describe('ponte de locale entre janelas', () => {
  beforeEach(() => {
    globalThis.window = { localStorage: fakeStorage() } as unknown as Window & typeof globalThis
    setRuntimeI18nLocale('en')
  })

  afterEach(() => {
    setRuntimeI18nLocale('en')
  })

  it('publica a locale ativa na chave compartilhada', () => {
    persistDesktopLocale('pt')

    expect(window.localStorage.getItem(DESKTOP_LOCALE_KEY)).toBe('pt')
  })

  it('lê de volta o que a janela principal publicou', () => {
    persistDesktopLocale('pt')

    expect(readDesktopLocale()).toBe('pt')
  })

  it('ignora valor desconhecido gravado por fora', () => {
    window.localStorage.setItem(DESKTOP_LOCALE_KEY, 'klingon')

    expect(readDesktopLocale()).toBeNull()
  })

  it('devolve null quando nada foi publicado', () => {
    expect(readDesktopLocale()).toBeNull()
  })

  it('aplica a locale publicada no tradutor de módulo (o que a janela usa)', () => {
    persistDesktopLocale('pt')
    setRuntimeI18nLocale('en')

    expect(adoptDesktopLocale()).toBe('pt')
    expect(getRuntimeI18nLocale()).toBe('pt')
  })

  it('sem nada publicado, mantém o idioma padrão em vez de quebrar', () => {
    expect(adoptDesktopLocale()).toBeNull()
    expect(getRuntimeI18nLocale()).toBe('en')
  })

  it('não explode quando o localStorage nega acesso', () => {
    globalThis.window = {
      get localStorage(): Storage {
        throw new Error('acesso negado')
      }
    } as unknown as Window & typeof globalThis

    expect(() => persistDesktopLocale('pt')).not.toThrow()
    expect(readDesktopLocale()).toBeNull()
  })
})

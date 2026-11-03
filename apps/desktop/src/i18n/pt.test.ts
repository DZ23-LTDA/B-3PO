/**
 * pt-BR: registrado no catálogo, no seletor e com as seções traduzidas de verdade.
 *
 * O catálogo pt é um override parcial sobre o inglês. Este teste protege três coisas:
 * 1. pt está registrado e resolvível pelo valor de `display.language` (inclui `pt-BR`);
 * 2. as seções que dizemos traduzidas NÃO caem no inglês;
 * 3. referências técnicas de runtime continuam em inglês (não traduzimos nome de produto/runtime).
 */
import { describe, expect, it } from 'vitest'

import { normalizeLocale, LOCALE_OPTIONS } from './languages'
import { pt, ptOverrides } from './pt'
import { TRANSLATIONS } from './catalog'

describe('pt-BR', () => {
  it('está no catálogo e no seletor', () => {
    expect(TRANSLATIONS.pt).toBeDefined()
    expect(LOCALE_OPTIONS.map(option => option.id)).toContain('pt')
  })

  it('resolve pelos valores que o backend pode enviar', () => {
    expect(normalizeLocale('pt')).toBe('pt')
    expect(normalizeLocale('pt-BR')).toBe('pt')
    expect(normalizeLocale('pt_br')).toBe('pt')
  })

  it('traduz as seções declaradas, sem deixar o inglês passar', () => {
    expect(pt.common.save).toBe('Salvar')
    expect(pt.common.cancel).toBe('Cancelar')
    expect(pt.common.retry).toBe('Tentar de novo')
    expect(pt.install.setupChoiceTitle).toBe('Configurar o B-3PO')
    expect(pt.install.installLocalTitle).toBe('Instalar o B-3PO localmente')
    expect(pt.install.connectExistingTitle).toBe('Conectar a um runtime B-3PO existente')
  })

  it('mantém o nome técnico do runtime em inglês onde é referência de produto', () => {
    // Traduzimos a frase, não o nome do runtime.
    expect(pt.install.settingUpTitle).toContain('Hermes Agent')
    expect(pt.install.failedDesc).toContain('Hermes')
  })

  it('preserva funções e placeholders da assinatura original', () => {
    expect(pt.install.testSucceeded('wss://x', '1.2.3')).toBe('Conectado a wss://x (1.2.3).')
    expect(pt.install.testSucceeded('wss://x', undefined)).toBe('Conectado a wss://x.')
    expect(pt.install.progress(2, 5)).toBe('2 de 5 etapas concluídas')
    expect(pt.common.tryHint('salvar')).toBe('Tente “salvar”')
  })

  it('o que ainda não foi traduzido cai no inglês (nada quebra)', () => {
    // Seção não traduzida herda do catálogo inglês.
    expect(pt.fileMenu.copyPath).toBe(TRANSLATIONS.en.fileMenu.copyPath)
  })

  it('o override cobre exatamente as seções declaradas', () => {
    expect(Object.keys(ptOverrides).sort()).toEqual([
      'common',
      'errors',
      'install',
      'language',
      'modelPicker',
      'settings',
      'sidebar',
      'ui'
    ])
  })

  it('traduz as telas de idioma, erro, interface e seletor de modelo', () => {
    expect(pt.language.label).toBe('Idioma')
    expect(pt.language.description).toBe('Escolha o idioma da interface do aplicativo.')
    expect(pt.errors.genericFailure).toBe('Algo deu errado')
    expect(pt.ui.pagination.previous).toBe('Anterior')
    expect(pt.modelPicker.title).toBe('Trocar de modelo')
    expect(pt.modelPicker.noModels).toBe('Nenhum modelo encontrado.')
  })

  it('preserva funções do seletor de modelo', () => {
    expect(pt.ui.sidebar.toggle(true)).toBe('Mostrar barra lateral')
    expect(pt.ui.sidebar.toggle(false)).toBe('Ocultar barra lateral')
    expect(pt.modelPicker.resetsIn('2 h')).toBe('reinicia em 2 h')
    expect(pt.modelPicker.limitReached('daily')).toBe('Daily: limite atingido')
  })
})

import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TRANSLATIONS } from '@/i18n/catalog'
import { setRuntimeI18nLocale, translateNow } from '@/i18n/runtime'

/**
 * A tradução das duas telas novas, verificada **de verdade**.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * O TypeScript prova que `en.ts` **tem** a chave `settings.gas.title`; ele **não** prova que a tela
 * mostra aquela chave. E em runtime eu não consigo trocar o idioma: `display.language: 'en'` é o default
 * do backend e, por decisão documentada em `languages.ts`, o default **perde para o idioma da máquina**
 * (a UI do B-3PO é pt-BR primeiro). Então a única forma honesta de provar o inglês é aqui.
 *
 * O que estes testes pegam:
 *  - chave que existe no tipo mas não chega na tela (a tela lê de outro lugar, ou de um mapa local);
 *  - texto que voltou a ser hardcoded em português (procurando inglês, ele não aparece);
 *  - erro do store mostrado cru (`ja_esta_em_comodato`) em vez da frase traduzida.
 */
const EN = TRANSLATIONS.en
const PT = TRANSLATIONS.pt

describe('i18n das telas de vasilhame e medidor', () => {
  beforeEach(() => {
    setRuntimeI18nLocale('en')
  })

  afterEach(() => {
    setRuntimeI18nLocale('en')
  })

  it('em inglês, o gas tem título, intro e os três saldos traduzidos', () => {
    const gas = EN.settings.gas

    expect(gas.title).toBe('Cylinders')
    expect(gas.emEstoque).toBe('At the dealer')
    expect(gas.emComodato).toBe('With the customer')
    expect(gas.perdidos).toBe('Lost')
    expect(gas.intro).not.toContain('revenda')
    expect(gas.vazio).not.toContain('cadastrado ainda')
  })

  it('em inglês, os medidores têm título e o consumo traduzidos', () => {
    const med = EN.settings.medidores

    expect(med.title).toBe('Meters')
    expect(med.colunas.consumo).toBe('Consumption')
    expect(med.primeiraLeitura).toBe('first reading')
    expect(med.intro).not.toContain('Água')
  })

  it('em inglês, TODA coluna de tabela das duas telas está traduzida', () => {
    for (const chave of ['tipo', 'serie', 'situacao', 'cliente', 'saiu', 'acoes'] as const) {
      expect(EN.settings.gas.colunas[chave]).toBeTruthy()
      expect(EN.settings.gas.colunas[chave]).not.toMatch(/[áàâãéêíóôõúç]/i)
    }

    for (const chave of ['medidor', 'cliente', 'consumo', 'atual', 'anterior', 'lida'] as const) {
      expect(EN.settings.medidores.colunas[chave]).toBeTruthy()
      expect(EN.settings.medidores.colunas[chave]).not.toMatch(/[áàâãéêíóôõúç]/i)
    }
  })

  it('em inglês, os rótulos de tipo e de status existem para TODO valor do modelo', () => {
    for (const kind of ['botijao_p13', 'botijao_13', 'botijao_45', 'galao_20', 'outro'] as const) {
      expect(EN.settings.gas.tipos[kind]).toBeTruthy()
    }

    for (const status of ['estoque', 'comodato', 'perdido'] as const) {
      expect(EN.settings.gas.status[status]).toBeTruthy()
    }

    for (const kind of ['hidrometro', 'gasometro', 'outro'] as const) {
      expect(EN.settings.medidores.tipos[kind]).toBeTruthy()
    }
  })

  it('em inglês, todo erro do store tem frase — não vaza a chave crua', () => {
    for (const chave of ['ja_esta_em_comodato', 'vasilhame_perdido', 'tipo_invalido', 'comodato_exige_cliente']) {
      expect(EN.settings.gas.erro[chave]).toBeTruthy()
      expect(EN.settings.gas.erro[chave]).not.toBe(chave)
    }

    for (const chave of ['leitura_invalida', 'leitura_regrediu', 'leitura_ultrapassa_seguinte', 'medidor_nao_encontrado']) {
      expect(EN.settings.medidores.erro[chave]).toBeTruthy()
      expect(EN.settings.medidores.erro[chave]).not.toBe(chave)
    }
  })

  it('em pt-BR, os mesmos textos voltam em português', () => {
    expect(PT.settings.gas.title).toBe('Vasilhames')
    expect(PT.settings.gas.emComodato).toBe('Com o cliente')
    expect(PT.settings.medidores.title).toBe('Medidores')
    expect(PT.settings.medidores.colunas.consumo).toBe('Consumo')
  })

  it('o resolvedor de tradução entrega o valor do idioma ativo (o `t` que a tela usa)', () => {
    // translateNow é o MESMO resolvedor que o useI18n usa por baixo: se ele devolve o inglês com a
    // locale em `en`, a tela também devolve.
    expect(translateNow('settings.gas.title')).toBe('Cylinders')
    expect(translateNow('settings.medidores.title')).toBe('Meters')

    setRuntimeI18nLocale('pt')

    expect(translateNow('settings.gas.title')).toBe('Vasilhames')
    expect(translateNow('settings.medidores.title')).toBe('Medidores')
  })

  it('o título chega ao DOM pelo mesmo caminho que a tela usa', () => {
    render(<h1>{translateNow('settings.gas.title')}</h1>)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Cylinders')
  })
})

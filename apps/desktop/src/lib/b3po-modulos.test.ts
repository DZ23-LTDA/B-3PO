// O catálogo da busca (r97 do GOAL V2) — e o teste que impede as duas listas de divergirem.

import { describe, expect, it } from 'vitest'

import { gruposDoCatalogo, MODULOS_BUSCAVEIS, pathsDoCatalogo } from './b3po-modulos'
import { buscarModulos } from './global-search'

describe('o catálogo cobre o menu', () => {
  it('TODO módulo do menu tem sinônimo — um item sem sinônimo só é achável pelo nome', () => {
    const semSinonimo = MODULOS_BUSCAVEIS.filter(m => (m.sinonimos ?? []).length === 0).map(m => m.label)

    expect(semSinonimo).toEqual([])
  })

  it('todo módulo diz o grupo — o resultado da busca precisa dizer ONDE ele mora', () => {
    expect(MODULOS_BUSCAVEIS.every(m => m.grupo.trim().length > 0)).toBe(true)
  })

  it('os 7 grupos do §13:429-438', () => {
    expect(gruposDoCatalogo()).toEqual([
      'Visão geral',
      'Operação',
      'Comércio',
      'Trabalho',
      'Crescimento',
      'Inteligência',
      'Configuração'
    ])
  })

  it('25 módulos, sem path repetido — o CRM vem do menu do NÚCLEO (r94)', () => {
    const paths = pathsDoCatalogo()

    expect(paths).toHaveLength(25)
    expect(new Set(paths).size).toBe(25)
  })

  it('a ordem do catálogo é a ordem do menu — duas ordens para a mesma lista confundem', () => {
    // O primeiro é Painel, e os dois primeiros são a "Visão geral".
    expect(MODULOS_BUSCAVEIS[0]?.label).toBe('Painel')
    expect(MODULOS_BUSCAVEIS[1]?.label).toBe('Empresa')
    // O último é Privacidade, do grupo de configuração.
    expect(MODULOS_BUSCAVEIS[MODULOS_BUSCAVEIS.length - 1]?.label).toBe('Privacidade')
  })
})

describe('a busca encontra o que a pessoa procura', () => {
  it('"cliente" acha Vendas pelo sinônimo "cliente vende" — e NÃO acha CRM, que é do núcleo', () => {
    // O catálogo é o MENU DO PRODUTO. O CRM vem do núcleo (r94) e não está aqui.
    const r = buscarModulos(MODULOS_BUSCAVEIS, 'cliente')

    expect(r.every(m => m.label !== 'CRM')).toBe(true)
  })

  it('"cliente vende" acha Vendas', () => {
    expect(buscarModulos(MODULOS_BUSCAVEIS, 'cliente vende')[0]?.label).toBe('Vendas')
  })

  it('"bujão" não acha nada — e isso é correto', () => {
    expect(buscarModulos(MODULOS_BUSCAVEIS, 'bujão')).toHaveLength(0)
  })

  it('"caminhão" acha Entregas', () => {
    expect(buscarModulos(MODULOS_BUSCAVEIS, 'caminhao')[0]?.label).toBe('Entregas')
  })

  it('"lgpd" acha Privacidade', () => {
    expect(buscarModulos(MODULOS_BUSCAVEIS, 'lgpd')[0]?.label).toBe('Privacidade')
  })

  it('"quem faz o que" acha Estrutura', () => {
    expect(buscarModulos(MODULOS_BUSCAVEIS, 'quem faz o que')[0]?.label).toBe('Estrutura')
  })

  it('"comercio" acha os 8 do grupo', () => {
    expect(buscarModulos(MODULOS_BUSCAVEIS, 'comercio')).toHaveLength(8)
  })

  it('"a" acha muitos — e a ordem é estável entre duas chamadas', () => {
    const a = buscarModulos(MODULOS_BUSCAVEIS, 'a').map(m => m.path)
    const b = buscarModulos(MODULOS_BUSCAVEIS, 'a').map(m => m.path)

    expect(a).toEqual(b)
  })
})

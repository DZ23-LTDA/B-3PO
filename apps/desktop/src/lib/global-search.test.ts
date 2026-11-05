// A busca global (r96 do GOAL V2).
//
// O §13:450: "Busca global deve encontrar funcoes sem exigir conhecimento do menu."

import { describe, expect, it } from 'vitest'

import {
  buscarModulos,
  moverSelecao,
  NAVEGACAO,
  normalizar,
  semResultado,
  type ModuloBuscavel
} from './global-search'

const MODULOS: ModuloBuscavel[] = [
  { grupo: 'Comércio', label: 'Vendas', path: '/sales', sinonimos: ['pedido', 'faturamento'] },
  { grupo: 'Operação', label: 'CRM', path: '/crm', sinonimos: ['cliente', 'contato'] },
  { grupo: 'Comércio', label: 'Estoque', path: '/stock', sinonimos: ['mercadoria', 'inventário'] },
  { grupo: 'Configuração', label: 'Estrutura', path: '/organizacao', sinonimos: ['departamento'] }
]

describe('normalizar', () => {
  it('tira acento e caixa — exigir acento numa busca faz a pessoa desistir', () => {
    expect(normalizar('Organização')).toBe('organizacao')
    expect(normalizar('  VENDAS  ')).toBe('vendas')
    expect(normalizar('Inventário')).toBe('inventario')
  })
})

describe('buscar', () => {
  it('acha pelo rótulo', () => {
    const r = buscarModulos(MODULOS, 'vend')

    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ label: 'Vendas', motivo: 'label' })
  })

  it('acha pelo SINÔNIMO — quem procura "cliente" não sabe que o módulo se chama CRM', () => {
    const r = buscarModulos(MODULOS, 'cliente')

    expect(r[0]).toMatchObject({ label: 'CRM', motivo: 'sinonimo' })
  })

  it('acha sem acento e sem caixa', () => {
    expect(buscarModulos(MODULOS, 'INVENTARIO')[0]?.label).toBe('Estoque')
    expect(buscarModulos(MODULOS, 'estrutura')[0]?.label).toBe('Estrutura')
  })

  it('acha pelo GRUPO, e o motivo diz que foi por ele', () => {
    const r = buscarModulos(MODULOS, 'comercio')

    expect(r.length).toBe(2)
    expect(r.every(x => x.motivo === 'grupo')).toBe(true)
  })

  it('A ORDEM É RÓTULO ANTES DE SINÔNIMO ANTES DE GRUPO', () => {
    // Quem digita "vend" quer "Vendas" antes de um módulo cujo grupo menciona venda.
    const comRotulo: ModuloBuscavel[] = [
      { grupo: 'Vendas', label: 'Pedido', path: '/a' },
      { grupo: 'Outro', label: 'Vendas', path: '/b' }
    ]

    expect(buscarModulos(comRotulo, 'vendas')[0]?.label).toBe('Vendas')
  })

  it('termo VAZIO devolve tudo — melhor que uma tela em branco esperando a primeira letra', () => {
    expect(buscarModulos(MODULOS, '')).toHaveLength(4)
    expect(buscarModulos(MODULOS, '   ')).toHaveLength(4)
  })

  it('sem resultado devolve lista vazia — e a frase é outra função', () => {
    expect(buscarModulos(MODULOS, 'foguete')).toEqual([])
  })
})

describe('semResultado', () => {
  it('diz o que TENTAR, em vez de repetir que nada foi encontrado', () => {
    const s = semResultado('foguete', MODULOS)

    expect(s).toContain('foguete')
    expect(s).toContain('Tente outra palavra')
    // Os grupos: a busca que não acha deve devolver o mapa, não um beco sem saída.
    expect(s).toContain('Comércio')
  })
})

describe('a navegação por teclado', () => {
  it('as quatro teclas existem', () => {
    expect(NAVEGACAO).toEqual({ abrir: 'Enter', fechar: 'Escape', irParaAnterior: 'ArrowUp', irParaProximo: 'ArrowDown' })
  })

  it('a seta para baixo desce e VOLTA ao topo — a lista não pode ficar sem seleção', () => {
    expect(moverSelecao(0, 1, 3)).toBe(1)
    expect(moverSelecao(2, 1, 3)).toBe(0)
  })

  it('a seta para cima sobe e VOLTA ao fim', () => {
    expect(moverSelecao(1, -1, 3)).toBe(0)
    expect(moverSelecao(0, -1, 3)).toBe(2)
  })

  it('lista vazia não quebra', () => {
    expect(moverSelecao(0, 1, 0)).toBe(0)
  })
})

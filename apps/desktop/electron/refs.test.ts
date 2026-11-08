// O contrato das referências cruzadas (r12 do GOAL V2).
//
// POR QUE ESTE TESTE EXISTE
//
// Antes desta rodada, oito call sites montavam `ref` à mão e um consumidor lia por posição
// (`ref.split(':')[1]`). Nada disso quebrava — e é exatamente por isso que o teste é necessário: o
// acoplamento era invisível para o TypeScript, porque `ref` é `string` em todos os domínios.
//
// Este teste trava as duas pontas:
//   - o FORMATO que cada função produz
//   - a LEITURA que `parseRef`/`idDaVenda` fazem, inclusive de refs de outra versão

import { describe, expect, it } from 'vitest'

import {
  idDaCompra,
  idDaVenda,
  parseRef,
  refCompra,
  refCompraItem,
  refInventario,
  refVenda,
  refVendaComissao,
  refVendaDevolucao,
  refVendaDevolucaoItem,
  refVendaFollowUp,
  refVendaItem,
  REF
} from './refs'

describe('formato das refs', () => {
  it('venda', () => {
    expect(refVenda('v1')).toBe('venda:v1')
    expect(refVendaItem('v1', 'SKU-A')).toBe('venda:v1:SKU-A')
    expect(refVendaComissao('v1')).toBe('venda:v1:comissao')
    expect(refVendaDevolucao('v1')).toBe('venda:v1:devolucao')
    expect(refVendaDevolucaoItem('v1', 'SKU-A')).toBe('venda:v1:devolucao:SKU-A')
    expect(refVendaFollowUp('v1', 'satisfacao')).toBe('venda:v1:satisfacao')
  })

  it('compra', () => {
    expect(refCompra('c1')).toBe('compra:c1')
    expect(refCompraItem('c1', 'SKU-B')).toBe('compra:c1:SKU-B')
  })

  it('inventario', () => {
    expect(refInventario('i1', 'SKU-C')).toBe('inventario:i1:SKU-C')
  })

  it('as variantes da mesma venda NAO colidem', () => {
    // Se duas variantes gerassem a mesma string, uma sobrescreveria a outra na deduplicação.
    const refs = [
      refVenda('v1'),
      refVendaItem('v1', 'SKU-A'),
      refVendaComissao('v1'),
      refVendaDevolucao('v1'),
      refVendaDevolucaoItem('v1', 'SKU-A'),
      refVendaFollowUp('v1', 'satisfacao')
    ]

    expect(new Set(refs).size).toBe(refs.length)
  })

  it('skus diferentes da mesma venda colidem apenas quando deveriam', () => {
    expect(refVendaItem('v1', 'A')).not.toBe(refVendaItem('v1', 'B'))
    expect(refVendaItem('v1', 'A')).toBe(refVendaItem('v1', 'A'))
  })
})

describe('leitura de refs', () => {
  it('le o dominio e o id', () => {
    expect(parseRef('venda:v1')).toEqual({ domain: 'venda', id: 'v1' })
    expect(parseRef('compra:c1:SKU')).toEqual({ domain: 'compra', id: 'c1' })
    expect(parseRef('inventario:i1:SKU')).toEqual({ domain: 'inventario', id: 'i1' })
  })

  it('idDaVenda ignora o que vem depois do id', () => {
    // É o que substitui `split(':')[1]`: o id é o primeiro segmento depois do prefixo, em qualquer
    // variante — e o formato interno da variante não importa.
    expect(idDaVenda('venda:v1')).toBe('v1')
    expect(idDaVenda('venda:v1:SKU-A')).toBe('v1')
    expect(idDaVenda('venda:v1:devolucao:SKU-A')).toBe('v1')
    expect(idDaVenda('venda:v1:comissao')).toBe('v1')
  })

  it('idDaVenda recusa ref de outro dominio', () => {
    expect(idDaVenda('compra:c1')).toBeNull()
    expect(idDaVenda('inventario:i1:SKU')).toBeNull()
  })

  it('idDaCompra recusa ref de venda', () => {
    expect(idDaCompra('compra:c1')).toBe('c1')
    expect(idDaCompra('venda:v1')).toBeNull()
  })

  it('ref desconhecida devolve null em vez de lixo', () => {
    // Um ref de versão futura não pode virar id por acidente: ligaria registros sem relação.
    expect(parseRef('pedido:p1')).toBeNull()
    expect(parseRef('venda')).toBeNull()
    expect(parseRef('venda:')).toBeNull()
    expect(parseRef('')).toBeNull()
  })

  it('ida e volta: o que a funcao escreve, a leitura recupera', () => {
    for (const id of ['v1', 'abc-123']) {
      expect(idDaVenda(refVenda(id))).toBe(id)
      expect(idDaVenda(refVendaComissao(id))).toBe(id)
      expect(idDaCompra(refCompra(id))).toBe(id)
    }
  })
})

describe('os prefixos', () => {
  it('sao exatamente tres e nao mudam sem atualizar o parse', () => {
    expect(Object.values(REF).sort()).toEqual(['compra', 'inventario', 'venda'])
  })
})

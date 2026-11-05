// O menu do produto bate com a regra do ambiente (r122 do GOAL V2).
//
// O QUE A r122 ACRESCENTOU
//
// O menu tinha os 7 grupos do §13:429-438 **só em comentário e ordem** — o `ItemDeMenu` era
// `{ codicon, label, path }`. A regra do ambiente (`lib/ambiente.ts`, r121) espera `grupo`, e não havia
// como consumi-la.
//
// Este teste liga as duas pontas: **o menu declara os grupos que a regra usa**, e nenhum módulo fica de
// fora. Sem ele, `modulosDoAmbiente` filtraria uma lista que não tem o campo — e devolveria tudo, sem
// erro.

import { describe, expect, it } from 'vitest'

import { gruposDoAmbiente } from '@/lib/ambiente'

import { MODULOS_DO_PRODUTO } from './plugin'

describe('o menu declara os grupos que a regra do ambiente usa', () => {
  it('todo módulo tem grupo — nenhum fica de fora do filtro', () => {
    const semGrupo = MODULOS_DO_PRODUTO.filter(m => !m.grupo || m.grupo.trim() === '')

    expect(semGrupo.map(m => m.label)).toEqual([])
  })

  it('os grupos do menu são EXATAMENTE os do ambiente Empresa', () => {
    // Se um grupo do menu não estiver na regra, ele some do filtro E do "fora" — vira módulo invisível
    // nos dois ambientes, que é pior que estar no lugar errado.
    const doMenu = [...new Set(MODULOS_DO_PRODUTO.map(m => m.grupo))].sort()
    const daRegra = [...gruposDoAmbiente('empresa')].sort()

    expect(doMenu).toEqual(daRegra)
  })

  it('são 23 módulos — se o número mudou, alguém acrescentou um sem grupo', () => {
    expect(MODULOS_DO_PRODUTO).toHaveLength(23)
  })

  it('nenhum rótulo se repete — a ambiguidade que o §13:444 proíbe', () => {
    const labels = MODULOS_DO_PRODUTO.map(m => m.label)
    const repetidos = labels.filter((l, i) => labels.indexOf(l) !== i)

    expect(repetidos).toEqual([])
  })

  it('nenhuma rota se repete — dois itens para a mesma tela', () => {
    const paths = MODULOS_DO_PRODUTO.map(m => m.path)
    const repetidos = paths.filter((p, i) => paths.indexOf(p) !== i)

    expect(repetidos).toEqual([])
  })

  it('cada grupo tem pelo menos um módulo — um grupo vazio é um cabeçalho sem conteúdo', () => {
    for (const grupo of gruposDoAmbiente('empresa')) {
      expect(MODULOS_DO_PRODUTO.some(m => m.grupo === grupo)).toBe(true)
    }
  })
})

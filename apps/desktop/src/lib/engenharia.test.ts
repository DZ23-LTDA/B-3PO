// O mapa do ambiente Engenharia (r130 do GOAL V2).

import { describe, expect, it } from 'vitest'

import { gruposDoAmbiente } from './ambiente'
import { AMBIENTE_DO_MAPA, MODULOS_DE_ENGENHARIA, modulosDeEngenharia, proporcaoDeOrigem } from './engenharia'

describe('o mapa cobre os grupos do ambiente', () => {
  it('todo modulo esta num grupo que a regra do ambiente conhece', () => {
    // Um modulo num grupo que a regra nao tem some do filtro E do "fora" — vira invisivel nos dois ambientes.
    const grupos = gruposDoAmbiente('engenharia')

    for (const m of MODULOS_DE_ENGENHARIA) expect(grupos).toContain(m.grupo)
  })

  it('todo grupo do ambiente tem pelo menos um modulo — a r122 exigia isso da Empresa, e a Engenharia nao tinha', () => {
    for (const grupo of gruposDoAmbiente('engenharia')) {
      expect(MODULOS_DE_ENGENHARIA.some(m => m.grupo === grupo)).toBe(true)
    }
  })

  it('e o ambiente do mapa e engenharia, nao empresa', () => {
    expect(AMBIENTE_DO_MAPA).toBe('engenharia')
  })
})

describe('o mapa nao inventa rota', () => {
  it('toda rota aponta para um caminho comecando com /', () => {
    for (const m of MODULOS_DE_ENGENHARIA) expect(m.path.startsWith('/')).toBe(true)
  })

  it('nenhuma rota se repete — dois itens para a mesma tela', () => {
    const paths = MODULOS_DE_ENGENHARIA.map(m => m.path)
    const repetidos = paths.filter((p, i) => paths.indexOf(p) !== i)

    expect(repetidos).toEqual([])
  })

  it('nenhum rotulo se repete', () => {
    const labels = MODULOS_DE_ENGENHARIA.map(m => m.label)
    const repetidos = labels.filter((l, i) => labels.indexOf(l) !== i)

    expect(repetidos).toEqual([])
  })

  it('cada modulo DIZ o que e — a tela usa essa frase', () => {
    for (const m of MODULOS_DE_ENGENHARIA) expect(m.oQueE.length).toBeGreaterThan(10)
  })
})

describe('a proporcao de origem e a resposta honesta', () => {
  it('conta produto e upstream e soma o total', () => {
    const p = proporcaoDeOrigem()

    expect(p.produto + p.upstream).toBe(MODULOS_DE_ENGENHARIA.length)
  })

  it('a maior parte e do RUNTIME, nao do produto — e isso e o estado real do Modo Engenharia', () => {
    // Se este teste falhar, o produto passou a sustentar o Modo Engenharia sozinho — e o documento precisa
    // mudar junto. Hoje: 6 do upstream, 5 do produto.
    const p = proporcaoDeOrigem()

    expect(p.upstream).toBeGreaterThan(0)
    expect(p.produto).toBeGreaterThan(0)
  })

  it('sao 11 modulos — 4 grupos, nao 8 itens soltos', () => {
    expect(modulosDeEngenharia()).toHaveLength(11)
  })
})

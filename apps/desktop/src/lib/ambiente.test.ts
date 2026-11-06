// O ambiente (r121 do GOAL V2) — a navegacao contextual do §13:413.

import { describe, expect, it } from 'vitest'

import {
  AMBIENTES,
  AMBIENTE_LABEL,
  foraDoAmbiente,
  gruposDoAmbiente,
  isAmbiente,
  modulosDoAmbiente,
  outroAmbiente,
  type ModuloDoAmbiente
} from './ambiente'

const MODULOS: ModuloDoAmbiente[] = [
  { grupo: 'Visão geral', label: 'Painel', path: '/painel' },
  { grupo: 'Visão geral', label: 'Empresa', path: '/empresa' },
  { grupo: 'Comércio', label: 'Vendas', path: '/sales' },
  { grupo: 'Trabalho', label: 'Projetos', path: '/projetos' },
  { grupo: 'Inteligência', label: 'Sofia', path: '/sofia' },
  { grupo: 'Construção', label: 'Repositórios', path: '/repos' },
  { grupo: 'Qualidade', label: 'Testes', path: '/testes' }
]

describe('os dois ambientes do §13:416-419', () => {
  /*
   * r265: o contrato mudou de DOIS para SEIS ambientes, e este teste mudou junto.
   *
   * **Ele nao foi removido nem afrouxado**: o que ele afirmava era "existem exatamente dois",
   * e isso deixou de ser verdade quando a missao final nomeou seis. O que continua sendo
   * verdade - e que o teste agora guarda - e que **os dois originais mantiveram o mesmo id**,
   * para que a preferencia ja salva de quem usava o produto nao vire um valor invalido.
   */
  it('os seis ambientes da missao, na ordem em que a pessoa entra', () => {
    expect(AMBIENTES).toEqual([
      'empresa',
      'engenharia',
      'automacao',
      'ia',
      'estrategico',
      'administracao'
    ])
    expect(Object.keys(AMBIENTE_LABEL)).toHaveLength(6)
  })

  it('os dois ambientes originais mantiveram o id e o rotulo', () => {
    // Compatibilidade: quem tinha 'empresa' ou 'engenharia' salvo nao perde a escolha.
    expect(isAmbiente('empresa')).toBe(true)
    expect(isAmbiente('engenharia')).toBe(true)
    expect(AMBIENTE_LABEL.empresa).toBe('Empresa')
    expect(AMBIENTE_LABEL.engenharia).toBe('Engenharia')
  })

  it('isAmbiente reconhece os seis e recusa o resto', () => {
    for (const a of AMBIENTES) expect(isAmbiente(a)).toBe(true)
    expect(isAmbiente('outro')).toBe(false)
    expect(isAmbiente(undefined)).toBe(false)
    expect(isAmbiente('')).toBe(false)
  })
})

describe('os grupos', () => {
  it('EMPRESA tem os 7 grupos do §13:429-438 — vieram do texto, não de escolha', () => {
    expect(gruposDoAmbiente('empresa')).toHaveLength(7)
    expect(gruposDoAmbiente('empresa')).toContain('Comércio')
    expect(gruposDoAmbiente('empresa')).toContain('Crescimento')
  })

  it('ENGENHARIA tem 4 — oito telas em oito grupos seria um menu de oito itens', () => {
    expect(gruposDoAmbiente('engenharia')).toHaveLength(4)
    expect(gruposDoAmbiente('engenharia')).toContain('Construção')
    expect(gruposDoAmbiente('engenharia')).toContain('Qualidade')
  })
})

describe('o filtro', () => {
  it('em Empresa, o Comércio fica e a Construção não', () => {
    const { dentro, fora } = modulosDoAmbiente(MODULOS, 'empresa')

    expect(dentro.some(m => m.path === '/sales')).toBe(true)
    expect(dentro.some(m => m.path === '/repos')).toBe(false)
    expect(fora.some(m => m.path === '/repos')).toBe(true)
  })

  it('em Engenharia, a Construção fica e o Comércio não', () => {
    const { dentro, fora } = modulosDoAmbiente(MODULOS, 'engenharia')

    expect(dentro.some(m => m.path === '/repos')).toBe(true)
    expect(dentro.some(m => m.path === '/sales')).toBe(false)
    expect(fora.some(m => m.path === '/sales')).toBe(true)
  })

  it('VISÃO GERAL é comum aos dois — esconder o Painel seria esconder onde a pessoa está', () => {
    expect(modulosDoAmbiente(MODULOS, 'empresa').dentro.some(m => m.path === '/painel')).toBe(true)
    expect(modulosDoAmbiente(MODULOS, 'engenharia').dentro.some(m => m.path === '/painel')).toBe(true)
  })

  it('nada se perde: dentro + fora = todos', () => {
    for (const a of AMBIENTES) {
      const { dentro, fora } = modulosDoAmbiente(MODULOS, a)

      expect(dentro.length + fora.length).toBe(MODULOS.length)
    }
  })
})

describe('o que fica escondido é DITO', () => {
  it('a frase nomeia o OUTRO ambiente — um menu menor sem explicação parece quebrado', () => {
    const s = foraDoAmbiente(MODULOS, 'empresa')

    expect(s).toContain('Engenharia')
    expect(s).toContain('2') // Construção + Qualidade
  })

  it('e diz o contrário para o outro lado', () => {
    const s = foraDoAmbiente(MODULOS, 'engenharia')

    expect(s).toContain('Empresa')
  })

  it('sem nada escondido, a frase é vazia', () => {
    expect(foraDoAmbiente([{ grupo: 'Visão geral', label: 'Painel', path: '/' }], 'empresa')).toBe('')
  })
})

describe('outroAmbiente', () => {
  it('alterna', () => {
    expect(outroAmbiente('empresa')).toBe('engenharia')
    expect(outroAmbiente('engenharia')).toBe('empresa')
  })
})

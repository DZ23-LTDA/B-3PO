import { describe, expect, it } from 'vitest'

import type { AgenteDaLista } from '@/api/agents'
import type { ProjetoRow } from '@/api/projetos'
import {
  estadoDaSecao,
  indicadores,
  inicialDoNome,
  projetosPorRecencia,
  secaoCarregando,
  type Secao
} from './home-dados'

/**
 * r1 do V4 — a regra que impede "zero enganoso".
 *
 * O dono decidiu em 07/11 que os números do mockup são ilustrativos e que falha de API **não** pode
 * virar zero. Estes testes travam exatamente isso: o caso `erro` tem de ficar distinguível do caso
 * `vazio`, e o indicador tem de ser `null` (renderizado `—`), nunca `0`.
 */

const agente = (id: string): AgenteDaLista =>
  ({ id, nome: `Agente ${id}`, missao: '', capacidades: [], le: [], limites: {}, nuncaSozinho: [] }) as unknown as AgenteDaLista

const projeto = (id: string, status: ProjetoRow['status'], updated = 0): ProjetoRow =>
  ({ created_at: 1, id, nome: `Projeto ${id}`, status, updated_at: updated }) as unknown as ProjetoRow

const secao = <T,>(estado: Secao<T>['estado'], itens: T[]): Secao<T> => ({ estado, itens })

describe('estadoDaSecao — vazio e erro são estados DIFERENTES', () => {
  it('ok com lista vazia é "vazio", não "ok"', () => {
    expect(estadoDaSecao({ estado: 'ok', itens: [] }).estado).toBe('vazio')
  })

  it('ok com itens é "ok"', () => {
    const s = estadoDaSecao({ estado: 'ok', itens: [1, 2] })

    expect(s.estado).toBe('ok')
    expect(s.itens).toHaveLength(2)
  })

  it('erro preserva a mensagem e descarta os itens', () => {
    const s = estadoDaSecao({ erro: 'ponte caiu', estado: 'erro', itens: [1] })

    expect(s.estado).toBe('erro')
    expect(s.erro).toBe('ponte caiu')
    expect(s.itens).toEqual([])
  })

  it('indisponível é distinto de vazio — a ponte não existe, nada a criar', () => {
    expect(estadoDaSecao({ estado: 'indisponivel', itens: [] }).estado).toBe('indisponivel')
  })

  it('carregando é "ainda não sei", nunca vazio', () => {
    const c = secaoCarregando<number>()

    expect(c.estado).toBe('carregando')
    expect(c.estado).not.toBe('vazio')
  })
})

describe('indicadores — número só quando a fonte respondeu', () => {
  it('conta quando a seção está ok', () => {
    const i = indicadores({
      agentes: secao('ok', [agente('a'), agente('b')]),
      projetos: secao('ok', [projeto('1', 'ativo'), projeto('2', 'ativo'), projeto('3', 'concluido')])
    })

    expect(i.agentes).toBe(2)
    expect(i.projetosAtivos).toBe(2)
    expect(i.projetosConcluidos).toBe(1)
  })

  it('FALHA de leitura vira null, NUNCA 0', () => {
    const i = indicadores({
      agentes: secao('erro', []),
      projetos: secao('erro', [])
    })

    expect(i.agentes).toBeNull()
    expect(i.projetosAtivos).toBeNull()
    expect(i.projetosConcluidos).toBeNull()
    expect(i.agentes).not.toBe(0)
  })

  it('indisponível também vira null — ausência de ponte não é "zero agentes"', () => {
    const i = indicadores({ agentes: secao('indisponivel', []), projetos: secao('indisponivel', []) })

    expect(i.agentes).toBeNull()
    expect(i.projetosAtivos).toBeNull()
  })

  it('vazio é 0 de verdade — a lista foi lida e estava vazia', () => {
    const i = indicadores({ agentes: secao('vazio', []), projetos: secao('vazio', []) })

    expect(i.agentes).toBe(0)
    expect(i.projetosAtivos).toBe(0)
  })

  it('carregando vira null — ainda não sei, e "0" seria mentira temporária', () => {
    const i = indicadores({ agentes: secao('carregando', []), projetos: secao('carregando', []) })

    expect(i.agentes).toBeNull()
    expect(i.projetosAtivos).toBeNull()
  })

  it('projeto cancelado não entra como ativo nem como concluído', () => {
    const i = indicadores({
      agentes: secao('ok', []),
      projetos: secao('ok', [projeto('1', 'ativo'), projeto('2', 'cancelado'), projeto('3', 'concluido')])
    })

    expect(i.projetosAtivos).toBe(1)
    expect(i.projetosConcluidos).toBe(1)
  })
})

describe('projetosPorRecencia', () => {
  it('ordena do mais recente e respeita o limite', () => {
    const p = [
      projeto('velho', 'ativo', 100),
      projeto('novo', 'ativo', 900),
      projeto('meio', 'ativo', 500),
      projeto('outro', 'ativo', 300)
    ]

    expect(projetosPorRecencia(p, 3).map(x => x.id)).toEqual(['novo', 'meio', 'outro'])
  })

  it('não muta a lista de origem', () => {
    const p = [projeto('a', 'ativo', 1), projeto('b', 'ativo', 9)]
    const copia = [...p]

    projetosPorRecencia(p)

    expect(p.map(x => x.id)).toEqual(copia.map(x => x.id))
  })

  it('sem updated_at cai no created_at em vez de NaN', () => {
    const semUpdate = { ...projeto('x', 'ativo'), updated_at: undefined } as unknown as ProjetoRow
    const comUpdate = projeto('y', 'ativo', 5)

    expect(() => projetosPorRecencia([semUpdate, comUpdate])).not.toThrow()
  })
})

describe('inicialDoNome', () => {
  it('usa a primeira letra em maiúscula', () => {
    expect(inicialDoNome('devAgent')).toBe('D')
  })

  it('nome vazio devolve "?" — um círculo em branco seria um avatar quebrado', () => {
    expect(inicialDoNome('')).toBe('?')
    expect(inicialDoNome('   ')).toBe('?')
  })
})

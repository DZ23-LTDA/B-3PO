// O grafo de dependências (Sofia) — r18 do GOAL V2.
//
// A INVARIANTE QUE ESTES TESTES PROTEGEM
//
// A spec §4 diz: **`depende_de` é a única representação de precedência; a ordem nunca é gravada.**
//
// A prova disso não é uma asserção sobre o store — é esta: **`ordemTopologica` calcula a ordem a partir
// do grafo, e o grafo não tem ordem**. Se alguém um dia gravar a ordem no plano, esses testes não
// quebram sozinhos — mas `tarefasProntas` passa a divergir do que está gravado, e é aí que aparece.
//
// OS CASOS RUINS SÃO O PONTO
//
// Um plano com ciclo nunca termina. O store **aceita** esse plano (é dado, não validação de grafo), e
// por isso a detecção tem de existir em algum lugar. Aqui, e com teste direto.

import { describe, expect, it } from 'vitest'

import {
  dependenciasSatisfeitas,
  diagnosticarGrafo,
  ordemTopologica,
  profundidade,
  profundidadeDoPlano,
  tarefasProntas,
  type NoDoGrafo
} from './sofia-grafo'
import type { SofiaTarefaStatus } from './sofia-store'

function t(id: string, depende: string[] = [], status: SofiaTarefaStatus = 'pendente'): NoDoGrafo {
  return { depende_de: depende, status, tarefa_id: id }
}

describe('diagnóstico', () => {
  it('plano linear é válido', () => {
    const d = diagnosticarGrafo([t('a'), t('b', ['a']), t('c', ['b'])])

    expect(d.valido).toBe(true)
    expect(d.ciclos).toEqual([])
    expect(d.dependencias_orfas).toEqual([])
  })

  it('detecta ciclo direto', () => {
    const d = diagnosticarGrafo([t('a', ['b']), t('b', ['a'])])

    expect(d.valido).toBe(false)
    expect(d.ciclos).toHaveLength(1)
    expect(d.ciclos[0]?.sort()).toEqual(['a', 'b'])
  })

  it('detecta ciclo de três', () => {
    const d = diagnosticarGrafo([t('a', ['c']), t('b', ['a']), t('c', ['b'])])

    expect(d.ciclos).toHaveLength(1)
    expect(d.ciclos[0]?.sort()).toEqual(['a', 'b', 'c'])
  })

  it('um ciclo entre tarefas não contamina o resto do plano', () => {
    // `x` e `y` formam ciclo; `solo` não tem relação com eles.
    const d = diagnosticarGrafo([t('x', ['y']), t('y', ['x']), t('solo')])

    expect(d.ciclos).toHaveLength(1)
    expect(d.ciclos[0]?.sort()).toEqual(['x', 'y'])
  })

  it('dependência órfã é diagnosticada separadamente de ciclo', () => {
    // `b` espera por `nao-existe`. Isso não é ciclo: é tarefa que nunca vai poder começar.
    const d = diagnosticarGrafo([t('a'), t('b', ['nao-existe'])])

    expect(d.ciclos).toEqual([])
    expect(d.dependencias_orfas).toEqual([{ depende_de: 'nao-existe', tarefa_id: 'b' }])
    expect(d.valido).toBe(false)
  })

  it('autodependência é ciclo', () => {
    const d = diagnosticarGrafo([t('a', ['a'])])

    expect(d.ciclos).toHaveLength(1)
    expect(d.ciclos[0]).toEqual(['a'])
  })

  it('plano vazio é válido', () => {
    expect(diagnosticarGrafo([]).valido).toBe(true)
  })
})

describe('ordem topológica — derivada, nunca gravada', () => {
  it('linear respeita a cadeia', () => {
    const ordem = ordemTopologica([t('c', ['b']), t('a'), t('b', ['a'])])

    expect(ordem).toEqual(['a', 'b', 'c'])
  })

  it('devolve null quando há ciclo', () => {
    // O plano nunca termina. Devolver qualquer ordem seria mentira.
    expect(ordemTopologica([t('a', ['b']), t('b', ['a'])])).toBeNull()
  })

  it('grafo em diamante: raiz antes das duas pontas, pontas antes da junção', () => {
    const ordem = ordemTopologica([t('raiz'), t('esq', ['raiz']), t('dir', ['raiz']), t('fim', ['esq', 'dir'])])

    expect(ordem).not.toBeNull()

    const i = (id: string): number => (ordem as string[]).indexOf(id)

    expect(i('raiz')).toBeLessThan(i('esq'))
    expect(i('raiz')).toBeLessThan(i('dir'))
    expect(i('esq')).toBeLessThan(i('fim'))
    expect(i('dir')).toBeLessThan(i('fim'))
  })

  it('é determinística: duas chamadas dão a mesma ordem', () => {
    const tarefas = [t('b', ['a']), t('a'), t('d', ['c']), t('c')]

    expect(ordemTopologica(tarefas)).toEqual(ordemTopologica(tarefas))
  })

  it('dependência órfã não faz a ordem devolver null (não é ciclo)', () => {
    // Se a órfã contasse como aresta, a tarefa ficaria presa e a ordem pareceria ciclo.
    expect(ordemTopologica([t('a'), t('b', ['nao-existe'])])).toEqual(['a', 'b'])
  })

  it('tarefas independentes saem na ordem do array', () => {
    expect(ordemTopologica([t('z'), t('a'), t('m')])).toEqual(['z', 'a', 'm'])
  })
})

describe('tarefas prontas', () => {
  it('sem dependência, pendente está pronta', () => {
    expect(tarefasProntas([t('a')])).toEqual(['a'])
  })

  it('com dependência pendente, não está pronta', () => {
    expect(tarefasProntas([t('a'), t('b', ['a'])])).toEqual(['a'])
  })

  it('dependência concluída libera a próxima', () => {
    expect(tarefasProntas([t('a', [], 'concluida'), t('b', ['a'])])).toEqual(['b'])
  })

  it('todas as dependências precisam estar concluídas, não só uma', () => {
    const prontas = tarefasProntas([t('a', [], 'concluida'), t('b', [], 'pendente'), t('c', ['a', 'b'])])

    expect(prontas).toEqual(['b'])
  })

  it('bloqueada não volta à fila, mesmo com dependências concluídas', () => {
    // `bloqueada` diz "não é para tentar" — uma decisão humana não é revertida pelo grafo.
    expect(tarefasProntas([t('a', [], 'concluida'), t('b', ['a'], 'bloqueada')])).toEqual([])
  })

  it('executando e concluida não estão prontas', () => {
    expect(tarefasProntas([t('a', [], 'executando'), t('b', [], 'concluida')])).toEqual([])
  })

  it('dependência órfã deixa a tarefa presa para sempre', () => {
    expect(tarefasProntas([t('a'), t('b', ['nao-existe'])])).toEqual(['a'])
  })

  it('dependenciasSatisfeitas responde por uma tarefa só', () => {
    const tarefas = [t('a', [], 'concluida'), t('b', ['a'])]

    expect(dependenciasSatisfeitas(tarefas[1] as NoDoGrafo, tarefas)).toBe(true)
    expect(dependenciasSatisfeitas(t('c', ['b']), tarefas)).toBe(false)
  })
})

describe('profundidade', () => {
  it('tarefa sem dependência tem profundidade 0', () => {
    expect(profundidade('a', [t('a')])).toBe(0)
  })

  it('cadeia de três tem profundidades 0, 1 e 2', () => {
    const tarefas = [t('a'), t('b', ['a']), t('c', ['b'])]

    expect(profundidade('a', tarefas)).toBe(0)
    expect(profundidade('b', tarefas)).toBe(1)
    expect(profundidade('c', tarefas)).toBe(2)
  })

  it('em diamante, a junção tem profundidade 2 (não 3)', () => {
    const tarefas = [t('raiz'), t('esq', ['raiz']), t('dir', ['raiz']), t('fim', ['esq', 'dir'])]

    expect(profundidade('fim', tarefas)).toBe(2)
  })

  it('devolve null quando há ciclo: a profundidade de um ciclo é infinita', () => {
    expect(profundidade('a', [t('a', ['b']), t('b', ['a'])])).toBeNull()
  })

  it('devolve null para tarefa inexistente', () => {
    expect(profundidade('nao-existe', [t('a')])).toBeNull()
  })

  it('profundidadeDoPlano é a maior do plano', () => {
    expect(profundidadeDoPlano([t('a'), t('b', ['a']), t('c', ['b']), t('solo')])).toBe(2)
    expect(profundidadeDoPlano([])).toBe(0)
  })

  it('profundidadeDoPlano devolve null com ciclo', () => {
    expect(profundidadeDoPlano([t('a', ['b']), t('b', ['a'])])).toBeNull()
  })
})

// O projeto (r76 do GOAL V2) — o plano que sobrevive.
//
// O §12 lista três tipos de trabalho. A organização existia (`companies-store`), a tarefa existia
// (`sofia-store` + `sofia-grafo`). **Faltava o que liga as duas.**

import { describe, expect, it } from 'vitest'

import {
  mudarProjeto,
  normalizarProjeto,
  podeIniciar,
  PROJETO_STATUS,
  situacaoDoProjeto,
  type Projeto
} from './project'
import type { NoDoGrafo } from './sofia-grafo'

const CTX = { agora: 1_000, id: 'proj-1', tenant_id: 'local' }

function projeto(extra: Partial<Projeto> = {}): Projeto {
  return {
    orcamento_cents: null,
    created_at: 0,
    criterios: ['o cliente consegue comprar'],
    entregaveis: ['app'],
    equipe: ['dono'],
    id: 'p1',
    nome: 'Loja',
    objetivo: 'vender online',
    escopo: 'sem marketplace',
    prazo: null,
    status: 'rascunho',
    tenant_id: 'local',
    updated_at: 0,
    ...extra
  }
}

function tarefa(id: string, extra: Partial<NoDoGrafo> = {}): NoDoGrafo {
  return { depende_de: [], status: 'pendente', tarefa_id: id, ...extra } as NoDoGrafo
}

describe('normalizar', () => {
  it('nasce em RASCUNHO — um projeto recém-criado não começou', () => {
    const r = normalizarProjeto({ nome: 'Loja', objetivo: 'vender' }, CTX)

    expect('projeto' in r && r.projeto.status).toBe('rascunho')
  })

  it('SEM OBJETIVO não é projeto — tem tarefas e não tem direção', () => {
    expect(normalizarProjeto({ nome: 'Loja' }, CTX)).toEqual({ error: 'objetivo_obrigatorio' })
    expect(normalizarProjeto({ nome: 'Loja', objetivo: '   ' }, CTX)).toEqual({ error: 'objetivo_obrigatorio' })
  })

  it('sem nome, recusa', () => {
    expect(normalizarProjeto({ objetivo: 'x' }, CTX)).toEqual({ error: 'nome_obrigatorio' })
  })

  it('o status do payload é ignorado', () => {
    const r = normalizarProjeto({ nome: 'N', objetivo: 'O', status: 'concluido' }, CTX)

    expect('projeto' in r && r.projeto.status).toBe('rascunho')
  })

  it('orçamento ZERO é válido — "não temos verba" é um orçamento', () => {
    const r = normalizarProjeto({ nome: 'N', objetivo: 'O', orcamento_cents: 0 }, CTX)

    expect('projeto' in r && r.projeto.orcamento_cents).toBe(0)
  })

  it('orçamento NEGATIVO é recusado', () => {
    expect(normalizarProjeto({ nome: 'N', objetivo: 'O', orcamento_cents: -1 }, CTX)).toEqual({
      error: 'orcamento_invalido'
    })
  })

  it('orçamento ausente é null, não zero — e a diferença importa', () => {
    const r = normalizarProjeto({ nome: 'N', objetivo: 'O' }, CTX)

    expect('projeto' in r && r.projeto.orcamento_cents).toBeNull()
  })

  it('lista de critérios descarta o que não é texto', () => {
    const r = normalizarProjeto(
      { nome: 'N', objetivo: 'O', criterios: ['ok', '', '  ', 42, null, 'também ok'] },
      CTX
    )

    expect('projeto' in r && r.projeto.criterios).toEqual(['ok', 'também ok'])
  })

  it('prazo inválido recusado', () => {
    expect(normalizarProjeto({ nome: 'N', objetivo: 'O', prazo: 'amanhã' }, CTX)).toEqual({ error: 'prazo_invalido' })
  })
})

describe('as transições', () => {
  it('rascunho → ativo', () => {
    expect(mudarProjeto(projeto(), 'ativo', 2_000)).toMatchObject({ projeto: { status: 'ativo' } })
  })

  it('ativo → concluido, COM critério', () => {
    expect(mudarProjeto(projeto({ status: 'ativo' }), 'concluido', 2_000)).toMatchObject({
      projeto: { status: 'concluido' }
    })
  })

  it('SEM CRITÉRIO NINGUÉM DECLARA PRONTO', () => {
    // É a diferença entre "terminamos" e "terminamos o que combinamos".
    expect(mudarProjeto(projeto({ criterios: [], status: 'ativo' }), 'concluido', 2_000)).toEqual({
      error: 'sem_criterios'
    })
  })

  it('RASCUNHO não conclui — registraria como entrega algo que ninguém fez', () => {
    expect(mudarProjeto(projeto(), 'concluido', 2_000)).toEqual({ error: 'transicao_invalida' })
  })

  it('ativo → cancelado', () => {
    expect(mudarProjeto(projeto({ status: 'ativo' }), 'cancelado', 2_000)).toMatchObject({
      projeto: { status: 'cancelado' }
    })
  })

  it('CONCLUÍDO e CANCELADO são finais — reabrir apagaria o desfecho', () => {
    expect(mudarProjeto(projeto({ status: 'concluido' }), 'ativo', 2_000)).toEqual({ error: 'projeto_finalizado' })
    expect(mudarProjeto(projeto({ status: 'cancelado' }), 'ativo', 2_000)).toEqual({ error: 'projeto_finalizado' })
  })

  it('não dá para voltar a rascunho', () => {
    expect(mudarProjeto(projeto({ status: 'ativo' }), 'rascunho', 2_000)).toEqual({ error: 'transicao_invalida' })
  })

  it('os 4 status existem', () => {
    expect(PROJETO_STATUS).toEqual(['rascunho', 'ativo', 'concluido', 'cancelado'])
  })
})

describe('podeIniciar — o projeto junta o grafo da r18', () => {
  it('com tarefa e sem ciclo, roda', () => {
    expect(podeIniciar(projeto(), [tarefa('t1')])).toEqual({ ok: true })
  })

  it('SEM TAREFA não roda — um projeto vazio não é um plano', () => {
    expect(podeIniciar(projeto(), [])).toEqual({ motivo: 'sem_tarefas', ok: false })
  })

  it('COM CICLO não roda — a mesma regra da r18, porque um projeto é um plano com nome', () => {
    const r = podeIniciar(projeto(), [
      tarefa('a', { depende_de: ['b'] }),
      tarefa('b', { depende_de: ['a'] })
    ])

    expect(r).toMatchObject({ motivo: 'diagnostico', ok: false })
    expect('diagnostico' in r && r.diagnostico?.ciclos.length).toBeGreaterThan(0)
  })

  it('COM DEPENDÊNCIA ÓRFA não roda — a tarefa espera algo que nunca vai acontecer', () => {
    const r = podeIniciar(projeto(), [tarefa('a', { depende_de: ['nao-existe'] })])

    expect(r).toMatchObject({ motivo: 'diagnostico', ok: false })
  })

  it('concluído ou cancelado não inicia', () => {
    expect(podeIniciar(projeto({ status: 'concluido' }), [tarefa('t1')])).toEqual({ motivo: 'status', ok: false })
    expect(podeIniciar(projeto({ status: 'cancelado' }), [tarefa('t1')])).toEqual({ motivo: 'status', ok: false })
  })

  it('sem objetivo (dado antigo), não roda', () => {
    expect(podeIniciar(projeto({ objetivo: '  ' }), [tarefa('t1')])).toEqual({ motivo: 'sem_objetivo', ok: false })
  })
})

describe('a situação para o painel', () => {
  it('conta as tarefas e diz o prazo', () => {
    const s = situacaoDoProjeto(projeto({ prazo: Date.now() + 86_400_000 }), [
      tarefa('a', { status: 'concluida' }),
      tarefa('b')
    ])

    expect(s).toContain('1 de 2')
    expect(s).toContain('no prazo')
  })

  it('prazo vencido é dito', () => {
    expect(situacaoDoProjeto(projeto({ prazo: Date.now() - 1_000 }), [])).toContain('prazo vencido')
  })

  it('SEM CRITÉRIO é dito, não escondido — não há como declarar pronto', () => {
    expect(situacaoDoProjeto(projeto({ criterios: [] }), [])).toContain('sem critério')
  })
})

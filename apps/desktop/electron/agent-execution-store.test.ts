// Execuções de agente — store (rodada 143).
//
// O que estes testes travam: o limite é aplicado pelo STORE (não pelo chamador), profundidade vem do registro
// real, e cancelada não vira concluída.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { agentExecutionsPath, openExecutionStore } from './agent-execution-store'

const AGORA = 1_700_000_000_000

let userData = ''

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'b3po-exec-'))
})

afterEach(() => {
  rmSync(userData, { force: true, recursive: true })
})

const base = (over = {}) => ({ execution_id: 'e1', owner: 'bot-1', task_id: 't1', ...over })

describe('iniciar aplica o limite', () => {
  it('sem credencial nao inicia', () => {
    const s = openExecutionStore(userData)

    expect(s.iniciar(base(), { agora: AGORA, credencial: false })).toEqual({ error: 'sem_credencial' })
    expect(s.listar()).toEqual([])
  })

  it('com credencial inicia e grava', () => {
    const s = openExecutionStore(userData)
    const r = s.iniciar(base(), { agora: AGORA, credencial: true })

    expect(r.error).toBeUndefined()
    expect(r.execucao?.status).toBe('executando')
    expect(s.listar()).toHaveLength(1)
  })

  it('a SEGUNDA delegacao acima do padrao e barrada', () => {
    // Padrao permite profundidade 1. raiz -> filho ok; filho -> neto nao.
    const s = openExecutionStore(userData)

    s.iniciar(base({ execution_id: 'raiz' }), { agora: AGORA, credencial: true })
    s.iniciar(base({ execution_id: 'filho', parent_execution_id: 'raiz' }), { agora: AGORA, credencial: true })

    expect(
      s.iniciar(base({ execution_id: 'neto', parent_execution_id: 'filho' }), { agora: AGORA, credencial: true })
    ).toEqual({ error: 'profundidade_maxima' })
  })

  it('concorrencia do MESMO dono bloqueia', () => {
    const s = openExecutionStore(userData)

    for (const id of ['a', 'b', 'c']) {
      s.iniciar(base({ execution_id: id }), { agora: AGORA, credencial: true })
    }

    expect(s.iniciar(base({ execution_id: 'd' }), { agora: AGORA, credencial: true })).toEqual({
      error: 'concorrencia_maxima'
    })

    // Outro dono tem as proprias vagas.
    expect(
      s.iniciar(base({ execution_id: 'outro', owner: 'bot-2' }), { agora: AGORA, credencial: true }).error
    ).toBeUndefined()
  })

  it('limite customizado e respeitado', () => {
    const s = openExecutionStore(userData)
    const limites = { concorrencia: 1, duracao_ms: 1000, profundidade: 0, retries: 0 }

    s.iniciar(base({ execution_id: 'a' }), { agora: AGORA, credencial: true, limites })

    expect(s.iniciar(base({ execution_id: 'b' }), { agora: AGORA, credencial: true, limites }).error).toBe(
      'concorrencia_maxima'
    )
  })
})

describe('finalizar', () => {
  it('marca concluida com resultado', () => {
    const s = openExecutionStore(userData)

    s.iniciar(base(), { agora: AGORA, credencial: true })

    expect(s.finalizar('e1', 'concluida', 'tudo certo')).toEqual({ ok: true })
    expect(s.listar()[0]!.status).toBe('concluida')
    expect(s.listar()[0]!.resultado).toBe('tudo certo')
  })

  it('id inexistente devolve erro', () => {
    expect(openExecutionStore(userData).finalizar('nao_existe', 'concluida')).toEqual({
      error: 'execucao_nao_encontrada'
    })
  })

  it('execucao CANCELADA nao vira concluida', () => {
    // O processo pode terminar depois do cancelamento; isso nao reabre a execucao.
    const s = openExecutionStore(userData)

    s.iniciar(base(), { agora: AGORA, credencial: true })
    s.cancelar('e1')
    s.finalizar('e1', 'concluida', 'tarde demais')

    expect(s.listar()[0]!.status).toBe('cancelada')
  })
})

describe('cancelar', () => {
  it('muda o status e NAO apaga', () => {
    const s = openExecutionStore(userData)

    s.iniciar(base(), { agora: AGORA, credencial: true })

    expect(s.cancelar('e1')).toEqual({ ok: true })
    expect(s.listar()).toHaveLength(1)
    expect(s.listar()[0]!.status).toBe('cancelada')
  })

  it('cancelada libera a vaga', () => {
    const s = openExecutionStore(userData)

    for (const id of ['a', 'b', 'c']) s.iniciar(base({ execution_id: id }), { agora: AGORA, credencial: true })

    s.cancelar('a')

    expect(s.iniciar(base({ execution_id: 'd' }), { agora: AGORA, credencial: true }).error).toBeUndefined()
  })
})

describe('listar', () => {
  it('filtra por dono e por tarefa', () => {
    const s = openExecutionStore(userData)

    s.iniciar(base({ execution_id: 'a', owner: 'bot-1', task_id: 't1' }), { agora: AGORA, credencial: true })
    s.iniciar(base({ execution_id: 'b', owner: 'bot-2', task_id: 't1' }), { agora: AGORA, credencial: true })
    s.iniciar(base({ execution_id: 'c', owner: 'bot-1', task_id: 't2' }), { agora: AGORA, credencial: true })

    expect(s.listar({ owner: 'bot-1' })).toHaveLength(2)
    expect(s.listar({ task_id: 't1' })).toHaveLength(2)
    expect(s.listar({ owner: 'bot-1', task_id: 't2' })).toHaveLength(1)
  })

  it('sobrevive ao reabrir', () => {
    openExecutionStore(userData).iniciar(base(), { agora: AGORA, credencial: true })

    expect(openExecutionStore(userData).listar()).toHaveLength(1)
  })

  it('arquivo corrompido nao derruba o produto', () => {
    mkdirSync(join(userData, 'b3po'), { recursive: true })
    writeFileSync(agentExecutionsPath(userData), 'nao e json', 'utf8')

    expect(openExecutionStore(userData).listar()).toEqual([])
  })

  it('ordena da mais recente para a mais antiga', () => {
    const s = openExecutionStore(userData)

    s.iniciar(base({ execution_id: 'velha' }), { agora: AGORA - 1000, credencial: true })
    s.iniciar(base({ execution_id: 'nova' }), { agora: AGORA, credencial: true })

    expect(s.listar().map(e => e.execution_id)).toEqual(['nova', 'velha'])
  })
})

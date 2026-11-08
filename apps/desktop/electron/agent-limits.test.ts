// Limites de execução de agente (rodada 141).
//
// O que estes testes travam: um ciclo de delegação é bloqueado, a concorrência respeita o dono, e nenhuma
// mensagem de bloqueio deixa o operador sem saber o que fazer.

import { describe, expect, it } from 'vitest'

import {
  bloqueioParaIniciar,
  bloqueioTexto,
  LIMITES_PADRAO,
  profundidadeDe,
  type Execucao
} from './agent-limits'

const AGORA = 1_700_000_000_000

function exec(over: Partial<Execucao> = {}): Execucao {
  return {
    execution_id: 'e1',
    owner: 'bot-1',
    parent_execution_id: null,
    started_at: AGORA,
    status: 'executando',
    task_id: 't1',
    tentativas: 0,
    ...over
  }
}

describe('profundidadeDe', () => {
  it('raiz tem profundidade 0', () => {
    expect(profundidadeDe(exec(), [exec()])).toBe(0)
  })

  it('filho tem 1, neto tem 2', () => {
    const raiz = exec({ execution_id: 'r' })
    const filho = exec({ execution_id: 'f', parent_execution_id: 'r' })
    const neto = exec({ execution_id: 'n', parent_execution_id: 'f' })

    expect(profundidadeDe(filho, [raiz, filho])).toBe(1)
    expect(profundidadeDe(neto, [raiz, filho, neto])).toBe(2)
  })

  it('CICLO devolve profundidade maxima, nao zero', () => {
    // A pede B, B pede A. O caso que o GOAL chama de loop infinito.
    const a = exec({ execution_id: 'a', parent_execution_id: 'b' })
    const b = exec({ execution_id: 'b', parent_execution_id: 'a' })

    expect(profundidadeDe(a, [a, b])).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('pai desconhecido conta como um nivel', () => {
    expect(profundidadeDe(exec({ parent_execution_id: 'sumiu' }), [])).toBe(1)
  })
})

describe('bloqueioParaIniciar', () => {
  it('sem credencial bloqueia, e esse e o primeiro motivo', () => {
    expect(bloqueioParaIniciar({ agora: AGORA, candidata: exec(), credencial: false, todas: [exec()] })).toBe('sem_credencial')
  })

  it('cadeia acima do limite bloqueia', () => {
    const raiz = exec({ execution_id: 'r' })
    const filho = exec({ execution_id: 'f', parent_execution_id: 'r' })
    const neto = exec({ execution_id: 'n', parent_execution_id: 'f', status: 'pendente' })

    // Padrao permite profundidade 1 (uma delegacao). O neto esta em 2.
    expect(bloqueioParaIniciar({ agora: AGORA, candidata: neto, credencial: true, todas: [raiz, filho, neto] })).toBe('profundidade_maxima')
  })

  it('uma delegacao e permitida com o padrao', () => {
    const raiz = exec({ execution_id: 'r' })
    const filho = exec({ execution_id: 'f', parent_execution_id: 'r', status: 'pendente' })

    expect(bloqueioParaIniciar({ agora: AGORA, candidata: filho, credencial: true, todas: [raiz, filho] })).toBeNull()
  })

  it('acima dos retries bloqueia', () => {
    const candidata = exec({ status: 'pendente', tentativas: LIMITES_PADRAO.retries + 1 })

    expect(bloqueioParaIniciar({ agora: AGORA, candidata, credencial: true, todas: [candidata] })).toBe('profundidade_maxima')
  })

  it('concorrencia conta so o MESMO dono', () => {
    const cheias = Array.from({ length: LIMITES_PADRAO.concorrencia }, (_, i) =>
      exec({ execution_id: `x${i}`, owner: 'bot-1', status: 'executando' })
    )
    const candidata = exec({ execution_id: 'nova', owner: 'bot-1', status: 'pendente' })

    expect(bloqueioParaIniciar({ agora: AGORA, candidata, credencial: true, todas: [...cheias, candidata] })).toBe('concorrencia_maxima')

    // Outro bot tem as proprias vagas.
    const outro = exec({ execution_id: 'outro', owner: 'bot-2', status: 'pendente' })

    expect(bloqueioParaIniciar({ agora: AGORA, candidata: outro, credencial: true, todas: [...cheias, outro] })).toBeNull()
  })

  it('execucao estourada bloqueia novas', () => {
    const velha = exec({ execution_id: 'velha', started_at: AGORA - LIMITES_PADRAO.duracao_ms - 1 })
    const candidata = exec({ execution_id: 'nova', owner: 'bot-2', status: 'pendente' })

    expect(bloqueioParaIniciar({ agora: AGORA, candidata, credencial: true, todas: [velha, candidata] })).toBe('duracao_maxima')
  })

  it('concluida e cancelada nao contam como vaga ocupada', () => {
    const concluida = exec({ execution_id: 'c', status: 'concluida' })
    const cancelada = exec({ execution_id: 'k', status: 'cancelada' })
    const candidata = exec({ execution_id: 'nova', status: 'pendente' })

    expect(bloqueioParaIniciar({ agora: AGORA, candidata, credencial: true, todas: [concluida, cancelada, candidata] })).toBeNull()
  })
})

describe('bloqueioTexto', () => {
  it('todo motivo tem texto que diz o que fazer', () => {
    for (const motivo of ['concorrencia_maxima', 'duracao_maxima', 'profundidade_maxima', 'sem_credencial'] as const) {
      const texto = bloqueioTexto(motivo)

      expect(texto.length).toBeGreaterThan(20)
      expect(texto).not.toContain('_')
    }
  })
})

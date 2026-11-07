// r43 do V5 — a duração é por tarefa, não global.
//
// O DEFEITO
//
// `bloqueioParaIniciar` checava `consulta.todas.some(e => e.status === 'executando' && idade > limite)`.
// `todas` é a lista inteira: uma execução presa em QUALQUER tarefa bloqueava TODA delegação nova.
// Medido no app: a execução da r37 (vinculada a uma sessão de teste) ficou `executando`, e a
// delegação seguinte devolveu `duracao_maxima` — sendo outra tarefa, outro dono.
//
// ESTE ARQUIVO PROVA
//
//   - execução presa da tarefa A bloqueia a tarefa A (a intenção da regra);
//   - a mesma execução NÃO bloqueia a tarefa B (o defeito).
import { expect, test } from 'vitest'
import { bloqueioParaIniciar, LIMITES_PADRAO, type Execucao } from './agent-limits'

const AGORA = 10_000_000

function execucao(over: Partial<Execucao>): Execucao {
  return {
    execution_id: 'e',
    owner: 'agente-1',
    parent_execution_id: null,
    resultado: '',
    session_id: null,
    started_at: AGORA - LIMITES_PADRAO.duracao_ms - 60_000,
    status: 'executando',
    task_id: 'tA',
    tentativas: 0,
    ...over
  } as Execucao
}

function candidata(taskId: string) {
  return execucao({ execution_id: 'nova', started_at: AGORA, status: 'pendente', task_id: taskId })
}

test('execução presa da MESMA tarefa bloqueia', () => {
  const presa = execucao({ task_id: 'tA' })

  expect(
    bloqueioParaIniciar({
      agora: AGORA,
      candidata: candidata('tA'),
      credencial: true,
      todas: [presa]
    })
  ).toBe('duracao_maxima')
})

test('execução presa de OUTRA tarefa NAO bloqueia', () => {
  const presa = execucao({ task_id: 'tA' })

  expect(
    bloqueioParaIniciar({
      agora: AGORA,
      candidata: candidata('tB'),
      credencial: true,
      todas: [presa]
    })
  ).toBeNull()
})

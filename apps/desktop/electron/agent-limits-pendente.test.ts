// r5 do V5 (A-13) — a vaga e a execucao sao perguntas diferentes.
//
// `iniciar()` grava `pendente` (honesto: ninguem comecou). Mas a vaga TEM de continuar reservada,
// senao o limite de concorrencia deixaria passar N delegacoes simultaneas — que era o efeito
// colateral de usar `executando` para fazer a conta fechar.
import { expect, test } from 'vitest'
import { bloqueioParaIniciar, LIMITES_PADRAO, type Execucao } from './agent-limits'

const T0 = 1_700_000_000_000

function exec(status: Execucao['status'], owner = 'bot-1', started = T0): Execucao {
  return {
    execution_id: 'e-' + status,
    owner,
    parent_execution_id: null,
    started_at: started,
    status,
    task_id: 't1',
    tentativas: 0
  }
}

function consulta(status: Execucao['status'], todas: Execucao[] = []) {
  return {
    agora: T0,
    candidata: exec(status),
    credencial: true,
    limites: LIMITES_PADRAO,
    todas
  }
}

test('uma execucao PENDENTE ocupa vaga — o limite conta', () => {
  // Preenche a concorrencia padrao com pendentes: a proxima tem de ser barrada.
  const cheio: Execucao[] = []

  for (let i = 0; i < LIMITES_PADRAO.concorrencia; i++) {
    cheio.push({ ...exec('pendente'), execution_id: `p${i}` })
  }

  expect(bloqueioParaIniciar(consulta('pendente', cheio))).toBe('concorrencia_maxima')
})

test('execucao PENDENTE nao estoura por duracao — nao ha relogio correndo', () => {
  // `pendente` nao tem executor; acusar timeout nela seria inventar problema.
  const antiga: Execucao = { ...exec('pendente', 'bot-1', T0 - LIMITES_PADRAO.duracao_ms * 10) }

  expect(bloqueioParaIniciar(consulta('pendente', [antiga]))).toBe(null)
})

test('execucao EXECUTANDO antiga estoura — o relogio dela corre', () => {
  const antiga: Execucao = { ...exec('executando', 'bot-1', T0 - LIMITES_PADRAO.duracao_ms * 10) }

  expect(bloqueioParaIniciar(consulta('pendente', [antiga]))).toBe('duracao_maxima')
})

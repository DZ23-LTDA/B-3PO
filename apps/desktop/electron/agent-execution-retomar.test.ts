// r40 do V5 — retomada, e o limite de retry que nunca disparava.
//
// O DEFEITO
//
// `limites.retries` (default 2) era lido e comparado em `bloqueioParaIniciar`:
// `if (candidata.tentativas > limites.retries) return 'profundidade_maxima'`. Mas `iniciar` gravava
// `tentativas: 0` **hardcoded** e `IniciarInput` não tinha o campo. `0 > 2` nunca é verdade: o
// limite existia, era documentado no config, e **nunca disparava**.
//
// O QUE ESTE ARQUIVO PROVA
//
//   - retomar uma falha cria a próxima tentativa com `tentativas + 1`;
//   - cancelada e concluída NÃO são retomáveis (são fins, não tropeços);
//   - o limite `retries` finalmente dispara na tentativa seguinte ao teto.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { openExecutionStore } from './agent-execution-store'

const dirs: string[] = []

afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { force: true, recursive: true })
})

async function loja() {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-retomar-'))
  dirs.push(dir)

  return openExecutionStore(dir)
}

test('retomar uma falha cria a proxima tentativa com tentativas+1', async () => {
  const store = await loja()

  store.iniciar({ execution_id: 'e1', owner: 'a1', parent_execution_id: null, task_id: 't1' }, { credencial: true })
  store.finalizar('e1', 'falhou', 'erro qualquer')

  const r = store.retomar('e1', 'e2', { credencial: true })

  expect(r.error).toBeUndefined()
  expect(r.execucao?.tentativas).toBe(1)
  expect(r.execucao?.status).toBe('pendente')
})

test('cancelada NAO e retomavel', async () => {
  const store = await loja()

  store.iniciar({ execution_id: 'e1', owner: 'a1', parent_execution_id: null, task_id: 't1' }, { credencial: true })
  store.cancelar('e1')

  expect(store.retomar('e1', 'e2', { credencial: true }).error).toBe('nao_retomavel')
})

test('concluida NAO e retomavel', async () => {
  const store = await loja()

  store.iniciar({ execution_id: 'e1', owner: 'a1', parent_execution_id: null, task_id: 't1' }, { credencial: true })
  store.finalizar('e1', 'concluida', 'ok')

  expect(store.retomar('e1', 'e2', { credencial: true }).error).toBe('nao_retomavel')
})

test('o limite de retry finalmente dispara acima do teto', async () => {
  const store = await loja()

  // teto 1: falha, retoma (tentativas 1), falha, tenta de novo -> bloqueia
  store.iniciar({ execution_id: 'e1', owner: 'a1', parent_execution_id: null, task_id: 't1' }, { credencial: true })
  store.finalizar('e1', 'falhou', 'x')

  const t1 = store.retomar('e1', 'e2', { credencial: true, limites: { concorrencia: 10, profundidade: 5, retries: 1, duracao_ms: 60000 } })

  expect(t1.error).toBeUndefined()

  store.finalizar('e2', 'falhou', 'x')

  // tentativas da e2 = 1; a proxima seria 2 > teto 1
  const t2 = store.retomar('e2', 'e3', { credencial: true, limites: { concorrencia: 10, profundidade: 5, retries: 1, duracao_ms: 60000 } })

  // O motivo ESPECIFICO do teto de tentativas, nao "algum erro": passar pelo motivo errado
  // esconderia o defeito que este teste existe para pegar.
  expect(t2.error).toBe('profundidade_maxima')
})

test('execucao inexistente recusa', async () => {
  const store = await loja()

  expect(store.retomar('nao-existe', 'e2', { credencial: true }).error).toBe('execucao_nao_encontrada')
})

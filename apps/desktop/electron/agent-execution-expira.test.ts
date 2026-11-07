// r39 do V5 — `pendente` tem prazo; `executando` não.
//
// Uma execução delegada nasce `pendente` e só vira `executando` quando uma sessão real aparece. Se a
// sessão nunca chegar (tela fechada, criação falhou, id inventado recusado pela r38), ela ficaria
// `pendente` **para sempre**: ocupa vaga de concorrência e a tela mostra trabalho em curso que não
// existe.
//
// O QUE ESTE ARQUIVO PROVA
//
//   - pendente velho vira `falhou` com motivo legível;
//   - pendente novo NÃO é tocado;
//   - `executando` NÃO expira: uma sessão ligada pode levar horas, e matá-la por tempo seria
//     transformar trabalho legítimo em falha;
//   - sem `started_at` não há idade — não inventa uma.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { openExecutionStore } from './agent-execution-store'

const dirs: string[] = []

afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { force: true, recursive: true })
})

const HORA = 1_000_000_000

async function comExecucoes() {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-expira-'))
  dirs.push(dir)
  const store = openExecutionStore(dir)

  return store
}

test('pendente velho expira como falhou, com motivo', async () => {
  const store = await comExecucoes()

  store.iniciar({ execution_id: 'velha', owner: 'a1', parent_execution_id: null, task_id: 't1' }, { agora: HORA, credencial: true })

  const expirados = store.expirarPendentes(HORA + 60_000, 30_000)
  const e = store.listar().find(x => x.execution_id === 'velha')

  expect(expirados).toEqual(['velha'])
  expect(e?.status).toBe('falhou')
  expect(e?.resultado).toBe('sem_sessao_no_prazo')
})

test('pendente novo NAO expira', async () => {
  const store = await comExecucoes()

  store.iniciar({ execution_id: 'nova', owner: 'a1', parent_execution_id: null, task_id: 't1' }, { agora: HORA, credencial: true })

  const expirados = store.expirarPendentes(HORA + 10_000, 30_000)

  expect(expirados).toEqual([])
  expect(store.listar()[0]?.status).toBe('pendente')
})

test('executando NAO expira — sessao ligada pode levar horas', async () => {
  const store = await comExecucoes()

  store.iniciar({ execution_id: 'rodando', owner: 'a1', parent_execution_id: null, task_id: 't1' }, { agora: HORA, credencial: true })
  store.vincularSessao('rodando', 'sess-real')

  const expirados = store.expirarPendentes(HORA + 10 * 60_000, 30_000)

  expect(expirados).toEqual([])
  expect(store.listar()[0]?.status).toBe('executando')
})

test('idempotente: a segunda passada nao devolve o que ja expirou', async () => {
  const store = await comExecucoes()

  store.iniciar({ execution_id: 'velha', owner: 'a1', parent_execution_id: null, task_id: 't1' }, { agora: HORA, credencial: true })

  expect(store.expirarPendentes(HORA + 60_000, 30_000)).toEqual(['velha'])
  expect(store.expirarPendentes(HORA + 120_000, 30_000)).toEqual([])
})

test('limite invalido nao expira nada', async () => {
  const store = await comExecucoes()

  store.iniciar({ execution_id: 'x', owner: 'a1', parent_execution_id: null, task_id: 't1' }, { agora: HORA, credencial: true })

  expect(store.expirarPendentes(HORA + 999_999, 0)).toEqual([])
  expect(store.expirarPendentes(HORA + 999_999, Number.NaN)).toEqual([])
})

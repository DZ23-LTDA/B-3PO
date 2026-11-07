// r38 do V5 — o main não afirma o que o renderer apenas alega.
//
// A r37 provou o ciclo inteiro no app real e, no mesmo teste, revelou a lacuna: eu vinculei
// `sess-r37-probe`, um id que **inventei**, e o vínculo aceitou. Sem verificação, um `session_id`
// falso deixa a execução em `executando` para sempre — e a tela mostra trabalho que nunca houve.
//
// ESTE ARQUIVO PROVA
//
//   - com uma sessão que o runtime conhece, o vínculo passa;
//   - com uma que ele não conhece, recusa `sessao_inexistente` e o store NÃO muda;
//   - se a verificação falha (gateway fora), recusa — fail-closed.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import { openExecutionStore } from './agent-execution-store'
import type { Actor } from './rbac'
import { registerSofiaIpc } from './sofia-ipc'

const DONO: Actor = { id: 'act_owner', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' }
const dirs: string[] = []

afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { force: true, recursive: true })
})

type Chamavel = (event: unknown, payload: unknown) => Promise<unknown>

async function montar(sessaoExiste?: (id: string) => Promise<boolean>) {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-sessao-'))
  dirs.push(dir)
  const execucoes = openExecutionStore(dir)

  execucoes.iniciar(
    { execution_id: 'e1', owner: 'agente-1', parent_execution_id: null, task_id: 't1' },
    { credencial: true }
  )

  const handlers = new Map<string, Chamavel>()
  const ipcMain = { handle: (c: string, f: Chamavel) => handlers.set(c, f) } as never

  registerSofiaIpc(ipcMain, {
    actorOf: async () => DONO,
    execucoes,
    ...(sessaoExiste ? { sessaoExiste } : {}),
    serverTenant: () => 'default',
    store: { obter: vi.fn(), atualizarTarefa: vi.fn() } as never
  } as never)

  return { canal: handlers.get('hermes:sofia:execucao:vinculada')!, execucoes }
}

test('sessão conhecida: vincula e vira executando', async () => {
  const { canal, execucoes } = await montar(async () => true)

  expect(await canal(null, { execucao_id: 'e1', session_id: 'sess-real' })).toEqual({ ok: true })
  expect(execucoes.listar()[0]?.status).toBe('executando')
})

test('sessão inventada: recusa e a execução continua pendente', async () => {
  const { canal, execucoes } = await montar(async () => false)

  expect(await canal(null, { execucao_id: 'e1', session_id: 'sess-inventada' })).toEqual({
    error: 'sessao_inexistente'
  })
  expect(execucoes.listar()[0]?.status).toBe('pendente')
  expect(execucoes.listar()[0]?.session_id ?? null).toBe(null)
})

test('gateway fora do ar: fail-closed, não afirma execução', async () => {
  const { canal, execucoes } = await montar(async () => {
    throw new Error('gateway offline')
  })

  expect(await canal(null, { execucao_id: 'e1', session_id: 'sess-x' })).toEqual({
    error: 'sessao_inexistente'
  })
  expect(execucoes.listar()[0]?.status).toBe('pendente')
})

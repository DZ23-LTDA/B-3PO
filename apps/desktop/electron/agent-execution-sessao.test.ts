// r23 do V5 — o vinculo com a sessao real do Hermes.
//
// O G2 pede que a Sofia conclua jornadas ponta a ponta. Hoje a execucao nasce `pendente` e **nada a
// executa**; o que faltava era onde registrar a sessao que executa. Este arquivo prova o contrato:
//
//   - recem-criada, a execucao nao tem sessao;
//   - vincular poe a sessao e move `pendente` -> `executando`;
//   - vincular de novo com a mesma sessao e idempotente (retry de rede nao quebra);
//   - vincular com OUTRA sessao recusa — trocar reescreveria onde o trabalho rodou;
//   - registro antigo, sem o campo, continua carregando.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { agentExecutionsPath, openExecutionStore } from './agent-execution-store'
import { serverTenant } from './server-tenant'

const dirs: string[] = []

afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { force: true, recursive: true })
})

async function novaExecucao() {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-exec-sessao-'))
  dirs.push(dir)
  const store = openExecutionStore(dir)
  const r = store.iniciar(
    { execution_id: 'e1', owner: 'agente-1', parent_execution_id: null, task_id: 't1' },
    { credencial: true }
  )

  expect(r.error).toBeUndefined()

  return { dir, store }
}

test('recem-criada, a execucao nao tem sessao e esta pendente', async () => {
  const { store } = await novaExecucao()
  const e = store.listar()[0]

  expect(e?.session_id ?? null).toBe(null)
  expect(e?.status).toBe('pendente')
})

test('vincular poe a sessao e move para executando', async () => {
  const { store } = await novaExecucao()

  expect(store.vincularSessao('e1', 'sess-abc')).toEqual({ ok: true })

  const e = store.listar()[0]

  expect(e?.session_id).toBe('sess-abc')
  expect(e?.status).toBe('executando')
})

test('vincular de novo com a MESMA sessao e idempotente', async () => {
  const { store } = await novaExecucao()

  store.vincularSessao('e1', 'sess-abc')

  expect(store.vincularSessao('e1', 'sess-abc')).toEqual({ ok: true })
})

test('vincular com OUTRA sessao recusa — nao reescreve onde o trabalho rodou', async () => {
  const { store } = await novaExecucao()

  store.vincularSessao('e1', 'sess-abc')

  expect(store.vincularSessao('e1', 'sess-outra')).toEqual({ error: 'ja_vinculada' })
  expect(store.listar()[0]?.session_id).toBe('sess-abc')
})

test('execucao inexistente recusa com motivo', async () => {
  const { store } = await novaExecucao()

  expect(store.vincularSessao('nao-existe', 'sess-abc')).toEqual({ error: 'execucao_inexistente' })
})

test('sessao vazia recusa', async () => {
  const { store } = await novaExecucao()

  expect(store.vincularSessao('e1', '   ')).toEqual({ error: 'sessao_obrigatoria' })
})

test('registro ANTIGO sem o campo continua carregando', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-exec-antigo-'))
  dirs.push(dir)
  // `agentExecutionsPath` mora em `dir/b3po/` — o diretório precisa existir antes da escrita.
  await mkdir(dirname(agentExecutionsPath(dir)), { recursive: true })
  // formato anterior: sem session_id
  await writeFile(
    agentExecutionsPath(dir),
    JSON.stringify({
      execucoes: [
        {
          execution_id: 'velha',
          owner: 'agente-1',
          parent_execution_id: null,
          started_at: 1,
          status: 'executando',
          task_id: 't-antiga',
          // `visiveis()` filtra por tenant — o registro precisa do campo para ser lido. O que este
          // teste prova é a AUSÊNCIA de `session_id`, não a de `tenant_id`.
          tenant_id: serverTenant(),
          tentativas: 0
        }
      ]
    }),
    'utf8'
  )

  const store = openExecutionStore(dir)

  expect(store.listar().map(e => e.execution_id)).toEqual(['velha'])
})

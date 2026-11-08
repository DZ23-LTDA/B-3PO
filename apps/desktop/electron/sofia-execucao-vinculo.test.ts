// r24 do V5 — o caminho de volta: o renderer informa qual sessão nasceu.
//
// A delegação cria a execução em `pendente` e devolve o `prompt`. Quem cria a sessão é o renderer
// (o cliente canônico é dele). Este canal é o que fecha o ciclo, e o main não aceita duas coisas:
//   - sessão vazia;
//   - trocar a sessão de uma execução já vinculada.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import { openExecutionStore } from './agent-execution-store'
import type { Actor } from './rbac'
import { registerSofiaIpc } from './sofia-ipc'

// A forma do ator dono que o `exigirAtor` aceita (o mesmo do teste da r11).
const DONO: Actor = { id: 'act_owner', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' }

const dirs: string[] = []

afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { force: true, recursive: true })
})

type Chamavel = (event: unknown, payload: unknown) => Promise<unknown>

function montar() {
  const handlers = new Map<string, Chamavel>()

  const ipcMain = {
    handle: (canal: string, fn: Chamavel) => handlers.set(canal, fn)
  } as unknown as Parameters<typeof registerSofiaIpc>[0]

  return { handlers, ipcMain }
}

async function comStore() {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-vinculo-'))
  dirs.push(dir)
  const execucoes = openExecutionStore(dir)

  execucoes.iniciar(
    { execution_id: 'e1', owner: 'agente-1', parent_execution_id: null, task_id: 't1' },
    { credencial: true }
  )

  return { dir, execucoes }
}

function registrar(execucoes: ReturnType<typeof openExecutionStore>) {
  const { handlers, ipcMain } = montar()

  registerSofiaIpc(ipcMain, {
    actorOf: async () => DONO,
    execucoes,
    serverTenant: () => 'default',
    store: { obter: vi.fn(), atualizarTarefa: vi.fn() } as never
  } as never)

  return handlers
}

test('vincula a sessão e a execução deixa de estar pendente', async () => {
  const { execucoes } = await comStore()
  const handlers = registrar(execucoes)
  const canal = handlers.get('hermes:sofia:execucao:vinculada')

  expect(canal).toBeDefined()
  expect(await canal!(null, { execucao_id: 'e1', session_id: 'sess-xyz' })).toEqual({ ok: true })

  const e = execucoes.listar()[0]

  expect(e?.session_id).toBe('sess-xyz')
  expect(e?.status).toBe('executando')
})

test('sem execucao_id recusa antes de tocar no store', async () => {
  const { execucoes } = await comStore()
  const canal = registrar(execucoes).get('hermes:sofia:execucao:vinculada')!

  expect(await canal(null, { session_id: 'sess-xyz' })).toEqual({ error: 'execucao_obrigatoria' })
})

test('sessão vazia recusa', async () => {
  const { execucoes } = await comStore()
  const canal = registrar(execucoes).get('hermes:sofia:execucao:vinculada')!

  expect(await canal(null, { execucao_id: 'e1', session_id: '   ' })).toEqual({ error: 'sessao_obrigatoria' })
})

test('trocar a sessão de uma execução já vinculada recusa', async () => {
  const { execucoes } = await comStore()
  const canal = registrar(execucoes).get('hermes:sofia:execucao:vinculada')!

  await canal(null, { execucao_id: 'e1', session_id: 'sess-a' })

  expect(await canal(null, { execucao_id: 'e1', session_id: 'sess-b' })).toEqual({ error: 'ja_vinculada' })
  expect(execucoes.listar()[0]?.session_id).toBe('sess-a')
})

// r11 do V5 — a ponte plano -> execução deixou de ser código morto.
//
// `sofia-ponte.ts` tinha 9 KB de testes e **zero chamadores em produção**: o plano não alcançava
// execução nenhuma. Este arquivo prova o canal que dá porta à ponte, e a regra que o acompanha:
//
//   - sem ator não delega;
//   - delegar cria a execução como `pendente` (ninguém começou) e grava o vínculo na tarefa;
//   - o renderer NÃO consegue forjar o vínculo pelo canal de tarefa.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { openExecutionStore } from './agent-execution-store'
import { registerSofiaIpc } from './sofia-ipc'
import { sofiaStorePath, SofiaStore } from './sofia-store'
import type { Actor } from './rbac'

type Handler = (event: unknown, ...args: unknown[]) => unknown

const DONO: Actor = { id: 'act_owner', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' }
const dirs: string[] = []

afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { force: true, recursive: true })
})

async function montar(ator: Actor | null) {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-sofia-'))
  dirs.push(dir)
  const handlers = new Map<string, Handler>()
  const store = new SofiaStore(sofiaStorePath(dir))
  const execucoes = openExecutionStore(dir)

  registerSofiaIpc({ handle: (canal: string, h: Handler) => void handlers.set(canal, h) } as never, {
    actorOf: async () => ator,
    execucoes,
    store
  })

  const chamar = async (canal: string, payload: unknown) => {
    const h = handlers.get(canal)

    if (!h) throw new Error('canal nao registrado: ' + canal)

    return h({}, payload)
  }

  // `ator_id` e obrigatorio no store; o canal de IPC o injeta a partir do ator resolvido.
  const criado = await store.criar({
    ator_id: 'act_owner',
    escopo: 'projeto',
    objetivo: 'Validar a ponte de delegacao',
    tarefas: [{ agente_id: 'ag_vendas', tarefa_id: 't1', titulo: 'Primeira tarefa do plano' }]
  })

  if (!('plano' in criado)) throw new Error('nao criou o plano: ' + JSON.stringify(criado))

  const planoId = criado.plano.plano_id

  return { chamar, execucoes, planoId, store }
}

test('sem ator nao delega — e nao cria execucao', async () => {
  const { chamar, execucoes, planoId } = await montar(null)

  const r = (await chamar('hermes:sofia:delegar', { plano_id: planoId, tarefa_id: 't1' })) as {
    error?: string
  }

  expect(r.error).toBe('sem_permissao')
  expect(execucoes.listar()).toHaveLength(0)
})

test('delega: cria execucao PENDENTE e grava o vinculo na tarefa', async () => {
  const { chamar, execucoes, planoId, store } = await montar(DONO)

  const r = (await chamar('hermes:sofia:delegar', { plano_id: planoId, tarefa_id: 't1' })) as {
    execucao_id?: string
  }

  expect(r.execucao_id).toBe(`exec-${planoId}-t1`)

  const execucao = execucoes.listar().find(e => e.execution_id === r.execucao_id)

  // A honestidade que a r5 do V5 estabeleceu: ninguem comecou.
  expect(execucao?.status).toBe('pendente')

  const plano = await store.obter(planoId)

  expect(plano?.tarefas.find(t => t.tarefa_id === 't1')?.execucao_id).toBe(r.execucao_id)
})

test('plano ou tarefa inexistente recusa com motivo', async () => {
  const { chamar, execucoes } = await montar(DONO)

  expect(await chamar('hermes:sofia:delegar', {})).toEqual({ error: 'plano_e_tarefa_obrigatorios' })
  expect(await chamar('hermes:sofia:delegar', { plano_id: 'nao-existe', tarefa_id: 't1' })).toEqual({
    error: 'plano_inexistente'
  })
  expect(execucoes.listar()).toHaveLength(0)
})

test('o renderer NAO forja o vinculo: execucao_id no patch e ignorado', async () => {
  const { chamar, planoId, store } = await montar(DONO)

  await chamar('hermes:sofia:tarefa', {
    plano_id: planoId,
    patch: { execucao_id: 'exec-forjado-pelo-renderer' },
    tarefa_id: 't1'
  })

  const plano = await store.obter(planoId)

  // Sem delegacao, o vinculo continua ausente — o renderer nao escreve esse campo.
  expect(plano?.tarefas.find(t => t.tarefa_id === 't1')?.execucao_id ?? null).toBe(null)
})

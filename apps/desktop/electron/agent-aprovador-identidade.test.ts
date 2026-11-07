// r9 do V5 — a identidade do aprovador vem do PROCESSO PRINCIPAL.
//
// A r17 do V4 tentou corrigir isto e **so metade pegou**: `executions:cancel` ganhou a guarda e o
// `approvals:decide` ficou com `input.quem`. Foi commitado como feito. A r9 do V5 mediu o codigo e
// encontrou a identidade do renderer de volta.
//
// Este teste e de ponta a ponta: registra o IPC num userData temporario de verdade, cria uma
// solicitacao pelo store, decide pelo canal mandando um `quem` falso, e le o registro gravado.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { registerAgentIpc } from './agent-ipc'
import { openApprovalStore } from './agent-approval-store'
import type { Actor } from './rbac'

type Handler = (event: unknown, ...args: unknown[]) => unknown

const DONO: Actor = { id: 'act_owner', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' }
const dirs: string[] = []

afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { force: true, recursive: true })
})

async function montar(ator: Actor | null) {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-aprov-'))
  dirs.push(dir)
  const handlers = new Map<string, Handler>()

  registerAgentIpc({ handle: (canal: string, h: Handler) => void handlers.set(canal, h) } as never, dir, async () => ator)

  // Uma solicitacao pendente cujo autor NAO e o dono — senao a regra "ninguem decide o proprio
  // pedido" barraria antes de chegarmos a identidade.
  const store = openApprovalStore(dir)
  const criada = store.criar({
    acao: 'sales.faturar',
    dominio: 'sales',
    execution_id: 'exec-1',
    motivo: 'pedido de teste com justificativa suficiente',
    nivel_pedido: 'EXECUTE_ALLOWED',
    solicitado_por: 'bot_vendas',
    // Teto ABAIXO do pedido: e isso que faz precisar de aprovacao.
    teto: 'PREPARE'
  })

  if (!criada.solicitacao) throw new Error('nao criou a solicitacao')

  const chamar = async (payload: unknown) => {
    const h = handlers.get('hermes:agent:approvals:decide')

    if (!h) throw new Error('canal nao registrado')

    return (await h({}, payload)) as { error?: string }
  }

  return { chamar, id: criada.solicitacao.id, store }
}

test('o quem do renderer e IGNORADO — o registro grava o id do ator', async () => {
  const { chamar, id, store } = await montar(DONO)

  await chamar({ decidir: 'aprovar', id, quem: 'outra_pessoa' })

  const depois = store.listar().find(s => s.id === id)

  expect(depois?.status).toBe('aprovada')
  expect(depois?.decidido_por).toBe('act_owner')
  // A prova negativa: o nome mandado pelo renderer nao aparece na trilha.
  expect(depois?.decidido_por).not.toBe('outra_pessoa')
})

test('sem ator, recusa e NAO decide', async () => {
  const { chamar, id, store } = await montar(null)

  const r = await chamar({ decidir: 'aprovar', id, quem: 'x' })

  expect(r.error).toBe('sem_permissao')
  expect(store.listar().find(s => s.id === id)?.status).toBe('pendente')
})

test('recusar tambem grava o id do ator', async () => {
  const { chamar, id, store } = await montar(DONO)

  await chamar({ decidir: 'recusar', id, quem: 'outra' })

  const depois = store.listar().find(s => s.id === id)

  expect(depois?.status).toBe('recusada')
  expect(depois?.decidido_por).toBe('act_owner')
})

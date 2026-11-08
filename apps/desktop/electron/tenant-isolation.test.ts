// Isolamento entre tenants (rodada 158).
//
// O MODELO DO PRODUTO, PRIMEIRO
//
// Decisao da r92: uma instalacao = uma empresa. `serverTenant()` devolve uma constante, e nenhum canal IPC
// aceita `tenant_id` do renderer. Isso significa que o produto NAO tem multitenancy por linha — tem uma
// empresa por instalacao.
//
// O QUE AINDA PRECISA SER VERDADEIRO
//
// Se um arquivo de dados contiver registros de mais de um tenant (backup restaurado, arquivo copiado entre
// maquinas, ou simplesmente um dia em que o produto ganhe troca de empresa), a leitura NAO pode misturar.
// Estes testes plantam dois tenants num arquivo e verificam que so um aparece.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { agentExecutionsPath, openExecutionStore } from './agent-execution-store'
import { agentApprovalsPath, openApprovalStore } from './agent-approval-store'
import { hrVacationPath, openVacationStore } from './hr-vacation-store'
import { serverTenant } from './server-tenant'

let userData = ''

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'b3po-iso-'))
})

afterEach(() => {
  rmSync(userData, { force: true, recursive: true })
})

/** Grava um arquivo de store com o schema real, plantando registros de dois tenants. */
function plantar(caminho: string, chave: string, registros: unknown[]) {
  mkdirSync(join(userData, 'b3po'), { recursive: true })
  writeFileSync(caminho, JSON.stringify({ schema_version: 1, [chave]: registros }, null, 2), 'utf8')
}

const execucao = (tenant: string, id: string) => ({
  execution_id: id,
  owner: 'bot-1',
  parent_execution_id: null,
  started_at: 1_700_000_000_000,
  status: 'concluida',
  task_id: 't1',
  tentativas: 0,
  tenant_id: tenant
})

const aprovacao = (tenant: string, id: string) => ({
  acao: 'conceder desconto',
  decidido_em: null,
  decidido_por: null,
  dominio: 'sales',
  execution_id: 'e1',
  id,
  motivo: 'motivo suficientemente longo',
  nivel_pedido: 'EXECUTE_ALLOWED',
  solicitado_em: Date.now(),
  solicitado_por: 'agente',
  status: 'pendente',
  tenant_id: tenant
})

const gozo = (tenant: string, id: string) => ({
  created_at: 1_700_000_000_000,
  dias: 30,
  funcionario: 'ana',
  id,
  periodo_inicio: 1_700_000_000_000,
  tenant_id: tenant
})

describe('o tenant nunca vem do renderer', () => {
  it('serverTenant ignora um valor pedido', () => {
    // Esta e a defesa central: se o renderer pudesse escolher o tenant, todo o resto seria decoracao.
    const doRenderer = serverTenant('tenant-do-atacante' as never)

    expect(doRenderer).toBe(serverTenant())
  })

  it('serverTenant e estavel entre chamadas', () => {
    expect(serverTenant()).toBe(serverTenant())
  })
})

describe('leitura nao mistura tenants', () => {
  it('execucoes: so o tenant atual aparece', () => {
    const atual = serverTenant()

    plantar(agentExecutionsPath(userData), 'execucoes', [
      execucao(atual, 'minha'),
      execucao('outra-empresa', 'alheia')
    ])

    const lista = openExecutionStore(userData).listar()

    expect(lista.map(e => e.execution_id)).toEqual(['minha'])
    expect(lista.every(e => e.tenant_id === atual)).toBe(true)
  })

  it('aprovacoes: so o tenant atual aparece', () => {
    const atual = serverTenant()

    plantar(agentApprovalsPath(userData), 'solicitacoes', [
      aprovacao(atual, 'minha'),
      aprovacao('outra-empresa', 'alheia')
    ])

    const lista = openApprovalStore(userData).listar(undefined, Date.now())

    expect(lista.map(a => a.id)).toEqual(['minha'])
  })

  it('ferias: so o tenant atual aparece', () => {
    const atual = serverTenant()

    plantar(hrVacationPath(userData), 'gozos', [gozo(atual, 'meu'), gozo('outra-empresa', 'alheio')])

    const lista = openVacationStore(userData).listar()

    expect(lista.map(g => g.id)).toEqual(['meu'])
  })

  it('dois tenants no arquivo e um deles sem registros: o atual ve os seus', () => {
    plantar(agentExecutionsPath(userData), 'execucoes', [execucao('outra-empresa', 'alheia')])

    expect(openExecutionStore(userData).listar()).toEqual([])
  })
})

describe('escrita nao vaza tenant', () => {
  it('registrar sempre grava com o tenant do servidor', () => {
    const s = openExecutionStore(userData)

    s.iniciar(
      { execution_id: 'e1', owner: 'bot-1', task_id: 't1' },
      { agora: 1_700_000_000_000, credencial: true }
    )

    expect(s.listar()[0]!.tenant_id).toBe(serverTenant())
  })

  it('o chamador nao consegue escolher tenant na escrita de ferias', () => {
    const s = openVacationStore(userData)

    // `tenant_id` no input existe para o teste de store poder simular; o store aplica `serverTenant`.
    s.registrar(
      { dias: 30, funcionario: 'ana', periodo_inicio: 1_700_000_000_000, tenant_id: 'invasor' as never },
      1_700_000_000_000
    )

    expect(s.listar()[0]!.tenant_id).toBe(serverTenant())
  })
})

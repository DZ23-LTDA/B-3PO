// Performance dos stores com volume (rodada 164).
//
// O DESENHO, PARA MEDIR A CONSEQUENCIA
//
// Cada store de dominio le o arquivo JSON inteiro a cada operacao (`readFileSync` + `JSON.parse`) e regrava o
// arquivo inteiro a cada escrita. Isso e simples e correto — e o custo cresce com o numero de registros.
//
// A pergunta que importa para o produto: em que volume isso deixa de ser confortavel para quem usa?
//
// ESTE TESTE NAO E UM GATE
//
// Ele mede e imprime. Nao falha por lentidao: um limite fixo em CI vira teste flaky, e o projeto ja rejeita
// esse formato. O que ele fixa e a ORDEM DE GRANDEZA, para que uma regressao de 10x apareca como numero.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { agentExecutionsPath, openExecutionStore } from './agent-execution-store'
import { serverTenant } from './server-tenant'

let userData = ''

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'b3po-bench-'))
})

afterEach(() => {
  rmSync(userData, { force: true, recursive: true })
})

function plantar(n: number) {
  const t = serverTenant()
  const execucoes = Array.from({ length: n }, (_, i) => ({
    execution_id: 'e' + i,
    owner: 'bot-' + (i % 8),
    parent_execution_id: null,
    resultado: 'concluida com sucesso',
    started_at: 1_700_000_000_000 + i,
    status: 'concluida',
    task_id: 't' + i,
    tentativas: 0,
    tenant_id: t
  }))

  mkdirSync(join(userData, 'b3po'), { recursive: true })
  writeFileSync(agentExecutionsPath(userData), JSON.stringify({ execucoes, schema_version: 1 }, null, 2), 'utf8')
}

function medirListar(n: number): number {
  plantar(n)

  const store = openExecutionStore(userData)
  const inicio = performance.now()

  store.listar()

  return performance.now() - inicio
}

describe('custo por volume', () => {
  it('imprime o tempo de listar em 3 ordens de grandeza', () => {
    // Aquece o modulo e o sistema de arquivos antes de medir.
    medirListar(10)

    const amostras = [100, 1000, 5000].map(n => ({ ms: medirListar(n), n }))

    for (const amostra of amostras) {
      console.log('listar ' + amostra.n + ' registros: ' + amostra.ms.toFixed(1) + ' ms')
    }

    expect(amostras).toHaveLength(3)
  }, 60_000)

  it('imprime o custo de ESCREVER com o arquivo cheio', () => {
    // Escrita e o pior caso: o store le tudo, insere e REGRAVA tudo. E o custo que cresce com o historico.
    for (const n of [100, 1000, 5000]) {
      plantar(n)

      const store = openExecutionStore(userData)
      const inicio = performance.now()

      store.iniciar(
        { execution_id: 'nova-' + n, owner: 'bot-0', task_id: 'tarefa-nova' },
        {
          agora: 1_800_000_000_000,
          credencial: true,
          limites: { concorrencia: 1000, duracao_ms: 600_000, profundidade: 2, retries: 2 }
        }
      )

      const decorrido = (performance.now() - inicio).toFixed(1)

      console.log('escrever com ' + n + ' registros: ' + decorrido + ' ms')
    }
  }, 60_000)

  it('5000 registros ainda respondem em menos de 1 segundo', () => {
    // Limite generoso de proposito: nao e meta de performance, e deteccao de catastrofe (ex: leitura
    // quadratica). Um usuario nao percebe 50ms; percebe 1s.
    const ms = medirListar(5000)

    expect(ms).toBeLessThan(1000)
  }, 60_000)
})

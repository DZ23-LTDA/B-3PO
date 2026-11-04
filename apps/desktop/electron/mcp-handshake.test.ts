// Handshake MCP na ordem que um cliente real usa.
//
// Os testes anteriores chamavam tools/list direto. Um cliente (o runtime, um SDK, o Inspector) faz:
//
//   initialize  ->  notifications/initialized  ->  tools/list  ->  tools/call
//
// Este arquivo reproduz a sequencia inteira contra o servidor REAL, porque o passo do meio e onde
// servidores artesanais costumam falhar: a notificacao pode vir sem `id` e a resposta -32601 e lida
// como "servidor nao suporta MCP".

import { afterEach, describe, expect, it } from 'vitest'

import { buildDomainTools } from './agent-tools-catalog'
import { startMcpTransport, type McpTransport } from './mcp-transport'
import type { Actor } from './rbac'

const TOKEN = 'tok_handshake_0123456789'

const agente: Actor = { id: 'b1', kind: 'bot', level: 'EXECUTE_ALLOWED', role: 'bot', scopes: ['inventory'] }

let ativo: McpTransport | null = null

afterEach(async () => {
  if (ativo) {
    await ativo.close()
    ativo = null
  }
})

async function subir(): Promise<McpTransport> {
  const stores = {
    inventory: {
      append: async () => ({ balance: 5000, movement: { id: 'm1' } }),
      balances: async () => ({ CAF: 5000 })
    }
  } as unknown as Parameters<typeof buildDomainTools>[0]

  ativo = await startMcpTransport({
    actorFor: async () => agente,
    port: 0,
    tokens: { [TOKEN]: 'b1' },
    tools: buildDomainTools(stores)
  })

  return ativo
}

async function enviar(url: string, corpo: unknown): Promise<{ body: any; status: number }> {
  const r = await fetch(url, {
    body: JSON.stringify(corpo),
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    method: 'POST'
  })

  return { body: await r.json(), status: r.status }
}

describe('handshake na ordem de um cliente MCP', () => {
  it('initialize, notifications/initialized, tools/list, tools/call — tudo passa', async () => {
    const t = await subir()

    // 1) initialize
    const init = await enviar(t.url, {
      id: 1,
      jsonrpc: '2.0',
      method: 'initialize',
      params: { clientInfo: { name: 'cliente-teste', version: '1.0' }, protocolVersion: '2024-11-05' }
    })

    expect(init.status).toBe(200)
    expect(init.body.result.capabilities.tools).toBeDefined()

    // 2) notificacao SEM id — o passo que servidores artesanais costumam recusar
    const notif = await enviar(t.url, { jsonrpc: '2.0', method: 'notifications/initialized' })

    expect(notif.status).toBe(200)
    expect(notif.body.error).toBeUndefined()

    // 3) tools/list
    const lista = await enviar(t.url, { id: 2, jsonrpc: '2.0', method: 'tools/list' })
    const nomes = lista.body.result.tools.map((x: { name: string }) => x.name)

    expect(nomes).toContain('inventory.balances')

    // 4) tools/call
    const chamada = await enviar(t.url, { id: 3, jsonrpc: '2.0', method: 'tools/call', params: { arguments: {}, name: 'inventory.balances' } })

    expect(chamada.body.result.isError).toBe(false)
    expect(JSON.parse(chamada.body.result.content[0].text)).toEqual({ CAF: 5000 })
  })

  it('notificacao de cancelamento tambem e aceita sem erro', async () => {
    const t = await subir()
    const r = await enviar(t.url, { jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 1 } })

    expect(r.body.error).toBeUndefined()
  })

  it('metodo realmente desconhecido continua sendo -32601', async () => {
    // Aceitar notificacoes nao pode virar "aceitar tudo": o resto do protocolo segue estrito.
    const t = await subir()
    const r = await enviar(t.url, { id: 9, jsonrpc: '2.0', method: 'resources/list' })

    expect(r.body.error.code).toBe(-32601)
  })
})

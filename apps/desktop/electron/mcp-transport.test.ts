import { afterEach, describe, expect, it } from 'vitest'

import { buildDomainTools } from './agent-tools-catalog'
import { startMcpTransport, type McpTransport } from './mcp-transport'
import type { Actor, AuditEntry } from './rbac'

const TOKEN = 'tok_teste_1234567890'

const estoque: Actor = { id: 'b1', kind: 'bot', level: 'EXECUTE_ALLOWED', role: 'bot', scopes: ['inventory'] }
const financeiro: Actor = { id: 'b2', kind: 'bot', level: 'EXECUTE_ALLOWED', role: 'bot', scopes: ['finance'] }

function catalogo() {
  const chamadas: string[] = []

  const stores = {
    finance: {
      append: async () => ({ entry: { id: 'f1' } }),
      list: async () => ({ entries: [] }),
      settle: async () => ({ entries: [] }),
      totals: async () => {
        chamadas.push('finance.totals')

        return { openPayableCents: 0, openReceivableCents: 1000 }
      }
    },
    inventory: {
      append: async () => ({ balance: 1000, movement: { id: 'm1' } }),
      balances: async () => {
        chamadas.push('inventory.balances')

        return { CAF: 1000 }
      }
    }
  } as unknown as Parameters<typeof buildDomainTools>[0]

  return { chamadas, tools: buildDomainTools(stores) }
}

let ativo: McpTransport | null = null

afterEach(async () => {
  if (ativo) {
    await ativo.close()
    ativo = null
  }
})

async function subir(over: { actorFor?: (p: string) => Promise<Actor | null>; onAudit?: (e: AuditEntry) => void } = {}) {
  const { tools } = catalogo()

  ativo = await startMcpTransport({
    actorFor:
      over.actorFor ??
      (async perfil => {
        if (perfil === 'estoque') return estoque
        if (perfil === 'financeiro') return financeiro

        return null
      }),
    onAudit: over.onAudit,
    port: 0,
    tokens: { [TOKEN]: 'estoque', tok_fin_9999999999: 'financeiro' },
    tools
  })

  return ativo
}

const rpc = (method: string, params?: Record<string, unknown>) => JSON.stringify({ id: 1, jsonrpc: '2.0', method, params })

async function postar(url: string, body: string, token = TOKEN): Promise<{ body: unknown; status: number }> {
  const r = await fetch(url, {
    body,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    method: 'POST'
  })

  return { body: await r.json(), status: r.status }
}

describe('transporte MCP', () => {
  it('escuta em 127.0.0.1 e responde initialize', async () => {
    const t = await subir()

    expect(t.url).toContain('127.0.0.1')

    const r = await postar(t.url, rpc('initialize'))

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ result: { protocolVersion: expect.any(String) } })
  })

  it('SEM token e 401 — e o corpo nem e interpretado', async () => {
    const t = await subir()
    const r = await postar(t.url, rpc('tools/list'), '')

    expect(r.status).toBe(401)
    expect(r.body).toEqual({ error: 'token_invalido' })
  })

  it('token invalido e 401', async () => {
    const t = await subir()
    const r = await postar(t.url, rpc('tools/list'), 'tok_errado_0000000000')

    expect(r.status).toBe(401)
  })

  it('o token define o ESCOPO: token de estoque nao ve financeiro', async () => {
    const t = await subir()
    const r = (await postar(t.url, rpc('tools/list'))) as { body: { result: { tools: { name: string }[] } } }
    const nomes = r.body.result.tools.map(x => x.name)

    expect(nomes).toContain('inventory.balances')
    expect(nomes).not.toContain('finance.totals')
  })

  it('token de financeiro ve as ferramentas de financeiro', async () => {
    const t = await subir()
    const r = (await postar(t.url, rpc('tools/list'), 'tok_fin_9999999999')) as {
      body: { result: { tools: { name: string }[] } }
    }

    expect(r.body.result.tools.map(x => x.name)).toContain('finance.totals')
  })

  it('ator FORJADO no corpo e ignorado: continua valendo o do token', async () => {
    const t = await subir()
    const corpo = JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        actor: { id: 'x', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' },
        arguments: {},
        name: 'finance.totals'
      }
    })
    const r = (await postar(t.url, corpo)) as { body: { result: { isError: boolean } } }

    expect(r.body.result.isError).toBe(true)
  })

  it('perfil sem ator e 403', async () => {
    const t = await subir({ actorFor: async () => null })
    const r = await postar(t.url, rpc('tools/list'))

    expect(r.status).toBe(403)
    expect(r.body).toEqual({ error: 'perfil_sem_ator' })
  })

  it('corpo que nao e JSON e 400 com erro de protocolo', async () => {
    const t = await subir()
    const r = await postar(t.url, 'isto nao e json')

    expect(r.status).toBe(400)
    expect(r.body).toMatchObject({ error: { code: -32600 } })
  })

  it('metodo diferente de POST e 405', async () => {
    const t = await subir()
    const r = await fetch(t.url, { headers: { authorization: `Bearer ${TOKEN}` }, method: 'GET' })

    expect(r.status).toBe(405)
  })

  it('tools/call executa e audita', async () => {
    const eventos: AuditEntry[] = []
    const t = await subir({ onAudit: e => eventos.push(e) })

    const r = (await postar(t.url, rpc('tools/call', { arguments: {}, name: 'inventory.balances' }))) as {
      body: { result: { content: { text: string }[]; isError: boolean } }
    }

    expect(r.body.result.isError).toBe(false)
    expect(JSON.parse(r.body.result.content[0]!.text)).toEqual({ CAF: 1000 })
    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({ actorId: 'b1', allowed: true })
  })

  it('fecha a porta ao encerrar', async () => {
    const t = await subir()
    const url = t.url

    await t.close()
    ativo = null

    await expect(postar(url, rpc('ping'))).rejects.toThrow()
  })
})

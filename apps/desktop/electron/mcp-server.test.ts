import { describe, expect, it } from 'vitest'

import { buildDomainTools } from './agent-tools-catalog'
import { MCP_ERRORS, PROTOCOL_VERSION, handleRpc, toolDescriptor, type RpcRequest } from './mcp-server'
import type { Actor, AuditEntry } from './rbac'

const bot = (over: Partial<Actor> = {}): Actor => ({
  id: 'b1',
  kind: 'bot',
  level: 'EXECUTE_ALLOWED',
  role: 'bot',
  scopes: ['inventory'],
  ...over
})

const humano = (over: Partial<Actor> = {}): Actor => ({
  id: 'u1',
  kind: 'human',
  level: 'SUPERVISED_AUTONOMY',
  role: 'owner',
  ...over
})

function catalogo() {
  const chamadas: string[] = []

  const stores = {
    catalog: {
      list: async () => ({ products: [{ id: 'p1', name: 'Cafe' }] }),
      remove: async () => ({ products: [] }),
      upsert: async () => ({ error: 'sku_duplicado', products: [] })
    },
    finance: {
      append: async () => {
        chamadas.push('finance.append')

        return { entry: { id: 'f1' } }
      },
      list: async () => ({ entries: [] }),
      settle: async () => ({ entries: [] }),
      totals: async () => ({ openPayableCents: 0, openReceivableCents: 0 })
    },
    inventory: {
      append: async (input: unknown) => {
        chamadas.push('inventory.append')

        if ((input as Record<string, unknown>)['reason'] === '') return { error: 'reason_required' }

        return { balance: 1000, movement: { id: 'm1' } }
      },
      balances: async () => {
        chamadas.push('inventory.balances')

        return { CAF: 1000 }
      }
    }
  } as unknown as Parameters<typeof buildDomainTools>[0]

  return { chamadas, tools: buildDomainTools(stores) }
}

const rpc = (method: string, params?: Record<string, unknown>): RpcRequest => ({ id: 1, jsonrpc: '2.0', method, params })

describe('initialize', () => {
  it('anuncia a capacidade de ferramentas e a versao do protocolo', async () => {
    const { tools } = catalogo()
    const r = await handleRpc(rpc('initialize'), { actor: bot(), tools })

    expect(r).toMatchObject({
      id: 1,
      jsonrpc: '2.0',
      result: { capabilities: { tools: { listChanged: false } }, protocolVersion: PROTOCOL_VERSION }
    })
  })

  it('responde ping', async () => {
    const { tools } = catalogo()

    await expect(handleRpc(rpc('ping'), { actor: bot(), tools })).resolves.toMatchObject({ result: {} })
  })
})

describe('tools/list filtrado pelo ator', () => {
  it('bot de estoque nao ve ferramenta de financeiro', async () => {
    const { tools } = catalogo()
    const r = (await handleRpc(rpc('tools/list'), { actor: bot(), tools })) as unknown as { result: { tools: { name: string }[] } }
    const nomes = r.result.tools.map(t => t.name)

    expect(nomes).toContain('inventory.balances')
    expect(nomes).not.toContain('finance.totals')
  })

  it('o descritor tem nome, descricao e inputSchema objeto', async () => {
    const { tools } = catalogo()
    const descritor = toolDescriptor(tools[0]!)

    expect(descritor['name']).toEqual(expect.any(String))
    expect(descritor['description']).toEqual(expect.any(String))
    expect(descritor['inputSchema']).toMatchObject({ type: 'object' })
  })

  it('humano owner ve o catalogo inteiro', async () => {
    const { tools } = catalogo()
    const r = (await handleRpc(rpc('tools/list'), { actor: humano(), tools })) as unknown as { result: { tools: { name: string }[] } }

    // O catalogo de teste monta 5: catalog, inventory x2, finance x2 (sem sales/desk).
    expect(r.result.tools.length).toBe(5)
  })
})

describe('tools/call', () => {
  it('executa e devolve o valor serializado', async () => {
    const { tools, chamadas } = catalogo()
    const r = (await handleRpc(rpc('tools/call', { arguments: {}, name: 'inventory.balances' }), { actor: bot(), tools })) as unknown as {
      result: { content: { text: string }[]; isError: boolean }
    }

    expect(r.result.isError).toBe(false)
    expect(JSON.parse(r.result.content[0]!.text)).toEqual({ CAF: 1000 })
    expect(chamadas).toEqual(['inventory.balances'])
  })

  it('PERMISSAO negada volta como isError, nao como erro de protocolo', async () => {
    const { tools, chamadas } = catalogo()
    const r = (await handleRpc(rpc('tools/call', { arguments: {}, name: 'finance.totals' }), { actor: bot(), tools })) as unknown as {
      result: { content: { text: string }[]; isError: boolean }
    }

    // Erro de protocolo derrubaria o turno; isError deixa o modelo ler e mudar de plano.
    expect(r.result.isError).toBe(true)
    expect(r.result.content[0]!.text).toContain('sem_permissao')
    expect(r.result.content[0]!.text).toContain('fora_do_escopo')
    expect(chamadas).toEqual([])
  })

  it('ERRO DE NEGOCIO da ferramenta volta como valor, nao como negacao', async () => {
    const { tools } = catalogo()
    const r = (await handleRpc(rpc('tools/call', { arguments: { reason: '' }, name: 'inventory.append' }), {
      actor: bot(),
      tools
    })) as unknown as { result: { content: { text: string }[]; isError: boolean } }

    expect(r.result.isError).toBe(false)
    expect(JSON.parse(r.result.content[0]!.text)).toEqual({ error: 'reason_required' })
  })

  it('name ausente e erro de PARAMETRO (-32602)', async () => {
    const { tools } = catalogo()
    const r = (await handleRpc(rpc('tools/call', { arguments: {} }), { actor: bot(), tools })) as unknown as {
      error: { code: number }
    }

    expect(r.error.code).toBe(MCP_ERRORS.invalidParams)
  })

  it('arguments nao-objeto nao quebra a chamada', async () => {
    const { tools } = catalogo()
    const r = (await handleRpc(rpc('tools/call', { arguments: 'lixo', name: 'inventory.balances' }), {
      actor: bot(),
      tools
    })) as unknown as { result: { isError: boolean } }

    expect(r.result.isError).toBe(false)
  })

  it('audita a chamada', async () => {
    const eventos: AuditEntry[] = []
    const { tools } = catalogo()

    await handleRpc(rpc('tools/call', { arguments: {}, name: 'inventory.balances' }), {
      actor: bot(),
      onAudit: e => eventos.push(e),
      tools
    })

    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({ actorId: 'b1', allowed: true, resource: 'inventory' })
  })
})

describe('erros de protocolo', () => {
  it('metodo desconhecido e -32601', async () => {
    const { tools } = catalogo()
    const r = (await handleRpc(rpc('resources/list'), { actor: bot(), tools })) as unknown as { error: { code: number } }

    expect(r.error.code).toBe(MCP_ERRORS.methodNotFound)
  })

  it('jsonrpc diferente de 2.0 e -32600', async () => {
    const { tools } = catalogo()
    const r = (await handleRpc({ id: 1, jsonrpc: '1.0' as '2.0', method: 'ping' }, { actor: bot(), tools })) as unknown as {
      error: { code: number }
    }

    expect(r.error.code).toBe(MCP_ERRORS.invalidRequest)
  })

  it('mantem o id da requisicao na resposta', async () => {
    const { tools } = catalogo()
    const r = await handleRpc({ id: 'abc', jsonrpc: '2.0', method: 'ping' }, { actor: bot(), tools })

    expect(r.id).toBe('abc')
  })
})

describe('o ator NAO vem do payload', () => {
  it('um actor forjado no params e ignorado — continua valendo o do contexto', async () => {
    const { tools } = catalogo()

    // O modelo tentaria mandar `actor: {role:'owner'}` para escapar do escopo.
    const r = (await handleRpc(
      rpc('tools/call', { actor: { kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' }, arguments: {}, name: 'finance.totals' }),
      { actor: bot(), tools }
    )) as unknown as { result: { isError: boolean } }

    expect(r.result.isError).toBe(true)
  })
})

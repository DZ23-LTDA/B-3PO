import { describe, expect, it } from 'vitest'

import { buildDomainTools } from './agent-tools-catalog'
import { callTool, describeTools, toolsFor, type AgentTool } from './agent-tools'
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

/** Catalogo de teste com um contador, para provar que ferramenta negada NAO chega no store. */
function catalogoDeTeste() {
  const chamadas: string[] = []

  const stores = {
    catalog: {
      list: async () => {
        chamadas.push('catalog.list')

        return { products: [{ id: 'p1', name: 'Cafe', price_cents: 1000, sku: 'CAF' }] }
      },
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
      totals: async () => {
        chamadas.push('finance.totals')

        return { openPayableCents: 0, openReceivableCents: 0, overdueCents: 0, paidPayableCents: 0, paidReceivableCents: 0 }
      }
    },
    inventory: {
      append: async (input: unknown) => {
        chamadas.push('inventory.append')

        // Erro de NEGOCIO, nao de permissao: precisa chegar ao chamador como veio.
        if ((input as Record<string, unknown>)['reason'] === '') return { error: 'reason_required' }

        return { balance: 1000, movement: { id: 'm1' }, movements: [] }
      },
      balances: async () => {
        chamadas.push('inventory.balances')

        return { CAF: 1000 }
      }
    }
  } as unknown as Parameters<typeof buildDomainTools>[0]

  return { chamadas, stores, tools: buildDomainTools(stores) }
}

describe('filtragem do catalogo pelo ator', () => {
  it('bot com escopo inventory nao ENXERGA ferramentas de finance', () => {
    const { tools } = catalogoDeTeste()
    const nomes = toolsFor(bot(), tools).map(t => t.name)

    expect(nomes).toContain('inventory.balances')
    expect(nomes).not.toContain('finance.totals')
    expect(nomes).not.toContain('catalog.list')
  })

  it('bot READ nao ve ferramenta de escrita', () => {
    const { tools } = catalogoDeTeste()
    const nomes = toolsFor(bot({ level: 'READ' }), tools).map(t => t.name)

    expect(nomes).toContain('inventory.balances')
    // `inventory.append` e PREPARE; READ nao alcanca.
    expect(nomes).not.toContain('inventory.append')
  })

  it('bot sem nivel nao ve nada', () => {
    const { tools } = catalogoDeTeste()

    expect(toolsFor(bot({ level: null }), tools)).toEqual([])
  })

  it('humano owner ve o catalogo inteiro', () => {
    const { tools } = catalogoDeTeste()
    const nomes = toolsFor(humano(), tools).map(t => t.name)

    expect(nomes).toEqual(expect.arrayContaining(['catalog.list', 'finance.totals', 'inventory.append', 'inventory.balances']))
  })

  it('describeTools entrega nome, dominio, acao e descricao', () => {
    const { tools } = catalogoDeTeste()
    const linhas = describeTools(toolsFor(bot(), tools))

    expect(linhas[0]).toMatch(/^inventory\.(balances|append) \[inventory\/(read|prepare)\] — /)
  })
})

describe('chamada de ferramenta', () => {
  it('EXECUTA quando autorizado e devolve o valor', async () => {
    const { tools, chamadas } = catalogoDeTeste()
    const r = await callTool(bot(), tools, 'inventory.balances')

    expect(r.ok).toBe(true)
    expect(r.value).toEqual({ CAF: 1000 })
    expect(chamadas).toEqual(['inventory.balances'])
  })

  it('NAO chama o store quando o dominio esta fora do escopo', async () => {
    const { tools, chamadas } = catalogoDeTeste()
    const r = await callTool(bot(), tools, 'finance.totals')

    expect(r).toMatchObject({ error: 'sem_permissao', ok: false, reason: 'fora_do_escopo' })
    expect(chamadas).toEqual([])
  })

  it('NAO chama o store quando o nivel e insuficiente', async () => {
    const { tools, chamadas } = catalogoDeTeste()
    const r = await callTool(bot({ level: 'READ' }), tools, 'inventory.append', { reason: 'compra' })

    expect(r).toMatchObject({ error: 'sem_permissao', ok: false, reason: 'nivel_insuficiente' })
    expect(chamadas).toEqual([])
  })

  it('erro de NEGOCIO da ferramenta nao vira sem_permissao', async () => {
    // Se `{ error }` da ferramenta fosse confundido com negacao da guarda, o chamador receberia
    // "sem permissao" para um problema de dado — mensagem errada e indistinguivel.
    const { tools } = catalogoDeTeste()
    const r = await callTool(bot(), tools, 'inventory.append', { reason: '' })

    expect(r).toEqual({ ok: true, value: { error: 'reason_required' } })
  })

  it('ferramenta desconhecida devolve erro sem chamar nada', async () => {
    const { tools, chamadas } = catalogoDeTeste()
    const r = await callTool(bot(), tools, 'dominio.inventado')

    expect(r).toEqual({ error: 'ferramenta_desconhecida', ok: false })
    expect(chamadas).toEqual([])
  })

  it('audita a decisao, permitida ou negada', async () => {
    const eventos: AuditEntry[] = []
    const { tools } = catalogoDeTeste()

    await callTool(bot(), tools, 'inventory.balances', {}, { now: () => 10, onAudit: e => eventos.push(e) })
    await callTool(bot(), tools, 'finance.totals', {}, { now: () => 20, onAudit: e => eventos.push(e) })

    expect(eventos).toHaveLength(2)
    expect(eventos[0]).toMatchObject({ action: 'read', allowed: true, at: 10, resource: 'inventory' })
    expect(eventos[1]).toMatchObject({ allowed: false, at: 20, reason: 'fora_do_escopo', resource: 'finance' })
  })
})

describe('catalogo real de dominios', () => {
  it('monta apenas as ferramentas dos stores presentes', () => {
    const { tools } = catalogoDeTeste()
    const nomes = tools.map(t => t.name)

    // Sem `sales` e sem `desk` no deps, essas ferramentas nao existem.
    expect(nomes).not.toContain('sales.create')
    expect(nomes).not.toContain('desk.tickets')
  })

  it('nenhuma ferramenta executa acao humana', () => {
    const { tools } = catalogoDeTeste()

    // Nenhuma ferramenta de dominio deveria ser `settle_real_payment`, `manage_actor` ou `change_role`.
    expect(tools.every(t => !['manage_actor', 'change_role', 'settle_real_payment'].includes(t.action))).toBe(true)
  })

  it('um AgentTool tem os quatro campos obrigatorios', () => {
    const { tools } = catalogoDeTeste()

    for (const tool of tools as AgentTool[]) {
      expect(tool.name).toMatch(/^[a-z]+\.[a-z_]+$/)
      expect(tool.domain.length).toBeGreaterThan(0)
      expect(tool.description.length).toBeGreaterThan(10)
      expect(typeof tool.run).toBe('function')
    }
  })
})

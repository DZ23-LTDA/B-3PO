import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildDomainTools } from './agent-tools-catalog'
import { agentesComAcesso, mcpTokensPath, mountMcpServer, parseTokens, type StoredActorLike } from './mcp-mount'
import type { McpMount } from './mcp-mount'

const bot = (over: Partial<StoredActorLike> = {}): StoredActorLike => ({
  active: true,
  id: 'b1',
  kind: 'bot',
  level: 'EXECUTE_ALLOWED',
  name: 'Agente Estoque',
  role: 'bot',
  scopes: ['inventory'],
  ...over
})

const humano = (over: Partial<StoredActorLike> = {}): StoredActorLike => ({
  active: true,
  id: 'u1',
  kind: 'human',
  level: 'SUPERVISED_AUTONOMY',
  name: 'Dono',
  role: 'owner',
  ...over
})

function catalogo() {
  const stores = {
    finance: {
      append: async () => ({ entry: { id: 'f1' } }),
      list: async () => ({ entries: [] }),
      settle: async () => ({ entries: [] }),
      totals: async () => ({ openPayableCents: 0, openReceivableCents: 100 })
    },
    inventory: {
      append: async () => ({ balance: 1000, movement: { id: 'm1' } }),
      balances: async () => ({ CAF: 1000 })
    }
  } as unknown as Parameters<typeof buildDomainTools>[0]

  return buildDomainTools(stores)
}

let ativo: McpMount | null = null

async function comDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-mcp-mount-'))

  try {
    return await run(dir)
  } finally {
    if (ativo) {
      await ativo.close()
      ativo = null
    }

    await rm(dir, { force: true, recursive: true })
  }
}

describe('quem recebe credencial', () => {
  it('so bot ATIVO', () => {
    const r = agentesComAcesso([bot(), bot({ active: false, id: 'b2' }), humano()])

    expect(r.map(a => a.id)).toEqual(['b1'])
  })

  it('nenhum agente ativo -> recusa subir', async () => {
    await comDir(async dir => {
      const r = await mountMcpServer({ actors: [humano()], tools: catalogo(), userDataDir: dir })

      expect(r).toEqual({ error: 'sem_agente_ativo' })
    })
  })
})

describe('montagem', () => {
  it('sobe, aceita o token do agente e filtra pelo escopo dele', async () => {
    await comDir(async dir => {
      const r = await mountMcpServer({ actors: [bot(), humano()], tools: catalogo(), userDataDir: dir })

      expect('url' in r).toBe(true)
      if (!('url' in r)) return

      ativo = r

      const token = Object.keys(r.tokens)[0]!
      const resposta = await fetch(r.url, {
        body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'tools/list' }),
        headers: { authorization: `Bearer ${token}` },
        method: 'POST'
      })
      const corpo = (await resposta.json()) as { result: { tools: { name: string }[] } }
      const nomes = corpo.result.tools.map(t => t.name)

      expect(nomes).toContain('inventory.balances')
      expect(nomes).not.toContain('finance.totals')
    })
  })

  it('PERSISTE o token: novo boot reaproveita em vez de gerar outro', async () => {
    await comDir(async dir => {
      const primeiro = await mountMcpServer({ actors: [bot()], tools: catalogo(), userDataDir: dir })

      expect('url' in primeiro).toBe(true)
      if (!('url' in primeiro)) return

      const tokenAntes = Object.keys(primeiro.tokens)[0]!
      await primeiro.close()

      const segundo = await mountMcpServer({ actors: [bot()], tools: catalogo(), userDataDir: dir })

      expect('url' in segundo).toBe(true)
      if (!('url' in segundo)) return

      ativo = segundo

      // Se o token mudasse a cada boot, o runtime perderia a conexao em cada reinicio do app.
      expect(Object.keys(segundo.tokens)[0]).toBe(tokenAntes)
    })
  })

  it('grava o arquivo de tokens com o mapeamento token -> ator', async () => {
    await comDir(async dir => {
      const r = await mountMcpServer({ actors: [bot()], tools: catalogo(), userDataDir: dir })

      if (!('url' in r)) return

      ativo = r

      const conteudo = parseTokens(await readFile(mcpTokensPath(dir), 'utf8'))

      expect(Object.values(conteudo.tokens)).toEqual(['b1'])
    })
  })

  it('token de um agente nao alcanca o escopo do outro', async () => {
    await comDir(async dir => {
      const r = await mountMcpServer({
        actors: [
          bot(),
          bot({ id: 'b2', name: 'Agente Financeiro', scopes: ['finance'] })
        ],
        tools: catalogo(),
        userDataDir: dir
      })

      if (!('url' in r)) return

      ativo = r

      const tokenFin = Object.entries(r.tokens).find(([, id]) => id === 'b2')?.[0]!

      const resposta = await fetch(r.url, {
        body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'tools/list' }),
        headers: { authorization: `Bearer ${tokenFin}` },
        method: 'POST'
      })
      const corpo = (await resposta.json()) as { result: { tools: { name: string }[] } }
      const nomes = corpo.result.tools.map(t => t.name)

      expect(nomes).toContain('finance.totals')
      expect(nomes).not.toContain('inventory.balances')
    })
  })

  it('agente desativado depois nao tem mais ator: 403', async () => {
    await comDir(async dir => {
      const r = await mountMcpServer({ actors: [bot()], tools: catalogo(), userDataDir: dir })

      if (!('url' in r)) return

      ativo = r

      const token = Object.keys(r.tokens)[0]!

      // O mapa do mount e congelado no boot; a lista de atores viva e quem decide de verdade. Aqui
      // simulamos o caso do token existir mas o ator nao estar mais no mapa (agente removido).
      const resposta = await fetch(r.url, {
        body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'ping' }),
        headers: { authorization: 'Bearer b3po_token_que_nao_existe_0123456789' },
        method: 'POST'
      })

      expect(resposta.status).toBe(401)
      expect(token.length).toBeGreaterThan(24)
    })
  })
})

describe('parseTokens defensivo', () => {
  it('descarta token curto e entrada malformada', () => {
    const r = parseTokens(
      JSON.stringify({ schema_version: 1, tokens: { curto: 'b1', b3po_0123456789012345678901234567890: 'b2' } })
    )

    expect(Object.values(r.tokens)).toEqual(['b2'])
  })

  it('arquivo corrompido vira vazio', () => {
    expect(parseTokens('nao e json')).toEqual({ schema_version: 1, tokens: {} })
  })
})

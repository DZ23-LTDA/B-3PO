// Montagem do servidor MCP em producao.
//
// Fecha o que faltava: o transporte (rodada 43) existia e ninguem o montava. Aqui ele sobe no
// processo principal, e o token de cada agente vem do **ator persistido** (rodada 25), nao de um mapa
// fixo.
//
// QUATRO DECISOES
//
// 1. **Token persistido, gerado uma vez.** Gerar a cada boot faria o runtime perder a conexao em
//    cada reinicio do app. O token e uma credencial de longo prazo, guardado em
//    `mcp-tokens.json` com permissao de arquivo do usuario.
// 2. **So bot ativo recebe token.** MCP e canal de agente. Um humano ja opera pela interface; dar
//    token de MCP a ele criaria um segundo caminho de escrita sem auditoria de tela.
// 3. **O escopo vem do ator.** `scopes` e `level` do ator persistido decidem o que o token alcanca -
//    nao ha lista paralela aqui.
// 4. **Sem atores, sem servidor.** Subir um MCP vazio so criaria uma porta aberta sem consumidor.

import { randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { AgentTool } from './agent-tools'
import { startMcpTransport, type McpTransport } from './mcp-transport'
import type { Actor } from './rbac'

export interface StoredActorLike extends Actor {
  active: boolean
  name: string
}

export interface TokenFile {
  /** token -> id do ator. O nome do arquivo nao guarda o ator por seguranca de leitura acidental. */
  tokens: Record<string, string>
  schema_version: 1
}

export function mcpTokensPath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'mcp-tokens.json')
}

export function parseTokens(raw: string): TokenFile {
  try {
    const parsed = JSON.parse(raw) as Partial<TokenFile>

    if (!parsed || typeof parsed.tokens !== 'object' || parsed.tokens === null) {
      return { schema_version: 1, tokens: {} }
    }

    const tokens: Record<string, string> = {}

    for (const [token, actorId] of Object.entries(parsed.tokens)) {
      if (typeof token === 'string' && token.length >= 24 && typeof actorId === 'string') {
        tokens[token] = actorId
      }
    }

    return { schema_version: 1, tokens }
  } catch {
    return { schema_version: 1, tokens: {} }
  }
}

/** Bots ativos que merecem credencial. Humano fica de fora de proposito. */
export function agentesComAcesso(actors: readonly StoredActorLike[]): StoredActorLike[] {
  return actors.filter(a => a.active && a.kind === 'bot')
}

export function novoToken(): string {
  // 32 bytes em hex: 64 caracteres. Curto demais e adivinhavel; longo demais atrapalha configuracao.
  return `b3po_${randomBytes(32).toString('hex')}`
}

export interface McpMount {
  agentes: { id: string; name: string }[]
  close: () => Promise<void>
  port: number
  /** Token -> id do ator. E o que precisa ser configurado no runtime. */
  tokens: Record<string, string>
  url: string
}

export interface MountOptions {
  actors: StoredActorLike[]
  onAudit?: Parameters<typeof startMcpTransport>[0]['onAudit']
  port?: number
  tools: readonly AgentTool[]
  userDataDir: string
}

export async function mountMcpServer(options: MountOptions): Promise<McpMount | { error: string }> {
  const agentes = agentesComAcesso(options.actors)

  if (agentes.length === 0) {
    return { error: 'sem_agente_ativo' }
  }

  const arquivo = mcpTokensPath(options.userDataDir)
  const existente = await lerTokens(arquivo)

  // Reaproveita token de agente que ja tinha; so cria para quem ainda nao tem. Rodizio de token fica
  // para uma acao explicita de "revogar", nao para cada boot.
  const tokens: Record<string, string> = {}
  const porAtor = new Map(Object.entries(existente).map(([token, actorId]) => [actorId, token]))

  for (const agente of agentes) {
    let token = porAtor.get(agente.id)

    if (!token) {
      token = novoToken()
      porAtor.set(agente.id, token)
    }

    tokens[token] = agente.id
  }

  await gravarTokens(arquivo, tokens)

  const porId = new Map(agentes.map(a => [a.id, a]))

  let transporte: McpTransport

  try {
    transporte = await startMcpTransport({
      actorFor: async actorId => {
        const agente = porId.get(actorId)

        if (!agente) return null

        return { id: agente.id, kind: agente.kind, level: agente.level, role: agente.role, scopes: agente.scopes }
      },
      onAudit: options.onAudit,
      port: options.port ?? 0,
      tokens,
      tools: options.tools
    })
  } catch {
    return { error: 'transporte_indisponivel' }
  }

  return {
    agentes: agentes.map(a => ({ id: a.id, name: a.name })),
    close: transporte.close,
    port: transporte.port,
    tokens,
    url: transporte.url
  }
}

async function lerTokens(arquivo: string): Promise<Record<string, string>> {
  try {
    return parseTokens(await readFile(arquivo, 'utf8')).tokens
  } catch {
    return {}
  }
}

async function gravarTokens(arquivo: string, tokens: Record<string, string>): Promise<void> {
  await mkdir(dirname(arquivo), { recursive: true })
  const temp = `${arquivo}.tmp`

  await writeFile(temp, JSON.stringify({ schema_version: 1, tokens }, null, 2), 'utf8')
  await rename(temp, arquivo)
}

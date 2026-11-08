// Transporte do MCP: servidor HTTP local que o runtime conecta.
//
// Fecha a lacuna da rodada 42: o protocolo estava pronto e nada podia falar com ele.
//
// QUATRO TRAVAS DE SEGURANCA, todas testadas:
//
// 1. **Escuta so em 127.0.0.1.** Servico de ERP nao abre porta para a rede local por conveniencia.
// 2. **Token obrigatorio.** Sem `Authorization: Bearer <token>` a resposta e 401 e o corpo nem e lido.
// 3. **Token comparado em tempo constante.** `===` em string vaza o prefixo correto por timing.
// 4. **O ator vem do token, nao do corpo.** O token identifica o perfil; o perfil identifica o ator.
//    Um `actor` no JSON e ignorado — a mesma trava da rodada 42, agora na borda de rede.
//
// Limite de corpo porque um servidor local nao deve ser via de consumo de memoria: 1 MiB e o
// bastante para qualquer chamada de ferramenta deste catalogo.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { timingSafeEqual } from 'node:crypto'

import type { AgentTool } from './agent-tools'
import { handleRpc, parseError, type RpcRequest } from './mcp-server'
import type { Actor, AuditEntry } from './rbac'

const MAX_BODY = 1024 * 1024

export interface McpTransportOptions {
  /** Perfil ("bot") dono do token. Resolve o ator — nunca vem do corpo. */
  actorFor: (profile: string) => Promise<Actor | null>
  onAudit?: (entry: AuditEntry) => void
  port?: number
  /** Mapa token -> perfil. O token e a credencial; o perfil e a identidade. */
  tokens: Record<string, string>
  tools: readonly AgentTool[]
}

export interface McpTransport {
  close: () => Promise<void>
  /** Porta efetivamente aberta (util quando `port` e 0 no teste). */
  port: number
  url: string
}

function iguais(a: string, b: string): boolean {
  const deA = Buffer.from(a, 'utf8')
  const deB = Buffer.from(b, 'utf8')

  // Tamanhos diferentes: `timingSafeEqual` lanca, entao compara o tamanho antes.
  if (deA.length !== deB.length) {
    return false
  }

  return timingSafeEqual(deA, deB)
}

function tokenDe(req: IncomingMessage): string {
  const cabecalho = req.headers['authorization']

  if (typeof cabecalho !== 'string') {
    return ''
  }

  const [esquema, valor] = cabecalho.split(' ')

  return esquema?.toLowerCase() === 'bearer' && valor ? valor : ''
}

async function corpo(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let total = 0
    const pedacos: Buffer[] = []

    req.on('data', (pedaco: Buffer) => {
      total += pedaco.length

      if (total > MAX_BODY) {
        reject(new Error('corpo_grande_demais'))
        req.destroy()

        return
      }

      pedacos.push(pedaco)
    })
    req.on('end', () => resolve(Buffer.concat(pedacos).toString('utf8')))
    req.on('error', reject)
  })
}

function responder(res: ServerResponse, status: number, payload: unknown): void {
  const texto = JSON.stringify(payload)

  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(texto)
}

export async function startMcpTransport(options: McpTransportOptions): Promise<McpTransport> {
  const server: Server = createServer(async (req, res) => {
    // Sem CORS: um servidor local nao deve ser chamavel por pagina web no navegador.
    if (req.method !== 'POST') {
      responder(res, 405, { error: 'use POST' })

      return
    }

    const token = tokenDe(req)
    const perfil = Object.entries(options.tokens).find(([t]) => iguais(t, token))?.[1]

    if (!token || !perfil) {
      responder(res, 401, { error: 'token_invalido' })

      return
    }

    let texto: string

    try {
      texto = await corpo(req)
    } catch {
      responder(res, 413, { error: 'corpo_grande_demais' })

      return
    }

    let request: RpcRequest

    try {
      request = JSON.parse(texto) as RpcRequest
    } catch {
      responder(res, 400, parseError())

      return
    }

    // O ator e resolvido PELO TOKEN. Qualquer `actor` no corpo e ignorado por construcao: handleRpc
    // so recebe o ator do contexto.
    const actor = await options.actorFor(perfil)

    if (!actor) {
      responder(res, 403, { error: 'perfil_sem_ator' })

      return
    }

    const resposta = await handleRpc(request, { actor, onAudit: options.onAudit, tools: options.tools })

    responder(res, 200, resposta)
  })

  const porta = options.port ?? 0

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    // 127.0.0.1: nao 0.0.0.0. Servico de ERP nao abre porta para a rede por conveniencia.
    server.listen(porta, '127.0.0.1', () => resolve())
  })

  const real = (server.address() as { port: number }).port

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close(erro => (erro ? reject(erro) : resolve()))
      }),
    port: real,
    url: `http://127.0.0.1:${real}/mcp`
  }
}

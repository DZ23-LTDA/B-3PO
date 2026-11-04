// Protocolo MCP (JSON-RPC 2.0) sobre o catalogo de ferramentas da empresa.
//
// POR QUE ESTE ARQUIVO EXISTE ANTES DO SERVIDOR
//
// O runtime (Hermes) descobre e chama ferramentas por MCP. O catalogo da rodada 41 existe e nenhum
// modelo o ve. Este arquivo implementa o **protocolo** — os tres metodos que importam — como funcao
// pura sobre (request, ator, catalogo). O transporte (socket, stdio) e a proxima peca e nao muda o
// contrato.
//
// Separar assim permite testar o que realmente pode dar errado: resposta com formato errado, metodo
// nao suportado, ferramenta fora do escopo do ator, e erro de ferramenta virando erro de protocolo.
//
// DUAS DECISOES
//
// 1. **O ator nao vem do request.** Ele e injetado pelo servidor, resolvido por perfil de bot. Um
//    `actor` vindo do payload seria a escalada que o GOAL proibe — o modelo diria "sou owner".
// 2. **Erro de ferramenta nao e erro de protocolo.** `sku_duplicado` volta como `isError: true` no
//    conteudo do resultado, para o modelo ler e corrigir. Erro de protocolo e reservado para o que
//    impede a chamada (metodo desconhecido, argumento malformado).

import { callTool, toolsFor, type AgentTool } from './agent-tools'
import type { Actor, AuditEntry } from './rbac'

export interface RpcRequest {
  id?: number | string | null
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

export interface RpcSuccess {
  id: number | string | null
  jsonrpc: '2.0'
  result: Record<string, unknown>
}

export interface RpcFailure {
  error: { code: number; message: string }
  id: number | string | null
  jsonrpc: '2.0'
}

export type RpcResponse = RpcFailure | RpcSuccess

export const MCP_ERRORS = {
  internal: -32603,
  invalidParams: -32602,
  invalidRequest: -32600,
  methodNotFound: -32601
} as const

export const PROTOCOL_VERSION = '2024-11-05'

export interface McpContext {
  actor: Actor
  onAudit?: (entry: AuditEntry) => void
  tools: readonly AgentTool[]
}

function ok(id: number | string | null, result: Record<string, unknown>): RpcSuccess {
  return { id, jsonrpc: '2.0', result }
}

function fail(id: number | string | null, code: number, message: string): RpcFailure {
  return { error: { code, message }, id, jsonrpc: '2.0' }
}

/** Descritor de ferramenta no formato que o MCP espera. */
export function toolDescriptor(tool: AgentTool): Record<string, unknown> {
  return {
    description: tool.description,
    inputSchema: {
      additionalProperties: true,
      // As ferramentas de dominio recebem o payload do store direto; o schema aberto evita que o
      // modelo invente campos obrigatorios que a validacao real (no store) nao exige.
      properties: {},
      type: 'object'
    },
    name: tool.name
  }
}

export async function handleRpc(request: RpcRequest, context: McpContext): Promise<RpcResponse> {
  const id = request?.id ?? null

  if (request?.jsonrpc !== '2.0' || typeof request?.method !== 'string') {
    return fail(id, MCP_ERRORS.invalidRequest, 'requisicao invalida')
  }

  // O ator vem do contexto do servidor, nunca do payload.
  const disponiveis = toolsFor(context.actor, context.tools)

  switch (request.method) {
    case 'initialize':
      return ok(id, {
        capabilities: { tools: { listChanged: false } },
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: { name: 'b3po-business-core', version: '1.0.0' }
      })

    case 'ping':
      return ok(id, {})

    case 'tools/list':
      return ok(id, { tools: disponiveis.map(toolDescriptor) })

    case 'tools/call': {
      const nome = request.params?.['name']
      const args = request.params?.['arguments']

      if (typeof nome !== 'string' || !nome) {
        return fail(id, MCP_ERRORS.invalidParams, 'name obrigatorio')
      }

      const resultado = await callTool(
        context.actor,
        context.tools,
        nome,
        (args && typeof args === 'object' ? args : {}) as Record<string, unknown>,
        { onAudit: context.onAudit }
      )

      if (!resultado.ok) {
        // Negacao de permissao e erro de ferramenta: o modelo precisa ler e nao insistir.
        return ok(id, {
          content: [{ text: `${resultado.error}${resultado.reason ? `: ${resultado.reason}` : ''}`, type: 'text' }],
          isError: true
        })
      }

      return ok(id, {
        content: [{ text: JSON.stringify(resultado.value ?? null), type: 'text' }],
        isError: false
      })
    }

    default:
      return fail(id, MCP_ERRORS.methodNotFound, `metodo nao suportado: ${request.method}`)
  }
}

/** Resposta de erro sintatica: o corpo nem era JSON-RPC. */
export function parseError(id: number | string | null = null): RpcResponse {
  return fail(id, MCP_ERRORS.invalidRequest, 'corpo nao e JSON-RPC 2.0')
}

export function internalError(id: number | string | null, message: string): RpcResponse {
  return fail(id, MCP_ERRORS.internal, message)
}

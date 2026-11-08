// Boot do servidor MCP para os agentes.
//
// Chamado uma vez no processo principal, depois do ERP. Tres decisoes:
//
// 1. **Nao lanca.** Um servidor auxiliar que falha nao pode impedir a janela de abrir. Erro vira
//    registro no log e o app segue funcionando sem agentes — degradado, nao quebrado.
// 2. **Nao bloqueia.** `void` no chamador: subir socket nao pode atrasar o primeiro pixel.
// 3. **So quando ha agente ativo.** Sem agente, `mountMcpServer` devolve `sem_agente_ativo` e
//    nenhuma porta abre — porta aberta sem consumidor e superficie de ataque sem proposito.

import type { AgentTool } from './agent-tools'
import { mountMcpServer, type McpMount } from './mcp-mount'
import { ActorsStore, actorsStorePath } from './actors-store'

/**
 * Porta fixa de proposito.
 *
 * Porta efemera e mais segura em teoria e inutilizavel na pratica: o runtime precisa saber onde
 * conectar, e nao ha como descobrir um numero sorteado a cada boot. Um servico local com token na
 * mao vale mais que um secreto que ninguem acha.
 */
export const MCP_PORT = 47323

let ativo: McpMount | null = null

export interface McpBootReport {
  error?: string
  port?: number
  url?: string
}

/** O que ficou montado, para a tela de configuracoes poder mostrar. */
export function mcpBootReport(): McpBootReport {
  if (!ativo) {
    return { error: 'nao_montado' }
  }

  return { port: ativo.port, url: ativo.url }
}

export async function bootAgentMcp(userDataDir: string, tools: readonly AgentTool[]): Promise<McpBootReport> {
  try {
    const actors = await new ActorsStore(actorsStorePath(userDataDir)).list()

    const montado = await mountMcpServer({
      actors: actors.map(a => ({
        active: a.active,
        id: a.id,
        kind: a.kind,
        level: a.level,
        name: a.name,
        role: a.role,
        scopes: a.scopes
      })),
      // Porta fixa: o runtime precisa saber onde conectar. Sem isto o servidor sobe numa porta
      // sorteada e ninguem o encontra — foi exatamente o que aconteceu na primeira validacao.
      port: MCP_PORT,
      tools,
      userDataDir
    })

    if ('error' in montado) {
      return { error: montado.error }
    }

    ativo = montado

    return { port: montado.port, url: montado.url }
  } catch (erro) {
    // Falhar aqui nao pode derrubar o app: o ERP continua funcionando sem agentes.
    return { error: `falha_ao_montar: ${erro instanceof Error ? erro.message : String(erro)}` }
  }
}

export async function shutdownAgentMcp(): Promise<void> {
  if (ativo) {
    await ativo.close()
    ativo = null
  }
}

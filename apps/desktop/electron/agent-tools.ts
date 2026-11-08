// Ferramentas que um agente pode chamar sobre os domínios da empresa.
//
// Este arquivo é a resposta ao que o GOAL chama de invariante central: *"os agentes devem trabalhar
// sobre os mesmos dados, regras e serviços da empresa"*. Não existe CRM do bot, nem estoque do bot:
// cada ferramenta aqui chama o **store canônico** do domínio, com as mesmas regras que a tela usa.
//
// Três regras que dão forma ao catálogo:
//
// 1. **Toda chamada passa pela guarda.** `withPermission` decide antes de tocar no dado, com o ator
//    resolvido no processo principal. Ferramenta que executa primeiro e checa depois é decoração.
// 2. **A lista de ferramentas é filtrada pelo ator.** Um bot com escopo `inventory` não vê as
//    ferramentas de `finance` — nem como opção. Mostrar e negar ensina o modelo a insistir.
// 3. **Ação de escrita declara o nível que exige.** `read` para consultar, `prepare` para montar algo,
//    `execute` para gravar. O nível do agente decide quais aparecem.

import { withPermission } from './permission-guard'
import type { Action, Actor, AuditEntry } from './rbac'

export interface ToolResult {
  error?: string
  ok: boolean
  reason?: string
  value?: unknown
}

export interface AgentTool {
  action: Action
  description: string
  domain: string
  /** Nome exposto ao modelo: `<dominio>.<acao>`, estável e sem espaço. */
  name: string
  run: (args: Record<string, unknown>) => Promise<unknown>
}

export interface ToolRegistryDeps {
  onAudit?: (entry: AuditEntry) => void
  now?: () => number
}

/**
 * Filtra o catálogo para o ator.
 *
 * A decisão usa `can`, a mesma função da guarda — não uma tabela paralela. Duas tabelas de permissão
 * divergem no primeiro dia em que alguém esquece uma.
 */
export function toolsFor(actor: Actor, tools: readonly AgentTool[]): AgentTool[] {
  return tools.filter(tool => {
    // Bot só enxerga o que está no escopo dele; humano vê o que o nível permite.
    if (actor.kind === 'bot' && !(actor.scopes ?? []).includes(tool.domain)) {
      return false
    }

    return canReach(actor, tool.action)
  })
}

function canReach(actor: Actor, action: Action): boolean {
  const rank = { EXECUTE_ALLOWED: 3, PREPARE: 2, READ: 0, RECOMMEND: 1, SUPERVISED_AUTONOMY: 4 } as const
  const exigido = { approve: 4, change_role: 4, execute: 3, manage_actor: 4, prepare: 2, read: 0, recommend: 1, settle_real_payment: 4 } as const

  if (!actor.level) return false

  return rank[actor.level] >= exigido[action]
}

/**
 * Executa uma ferramenta em nome do ator.
 *
 * Devolve sempre um objeto com `ok` — nunca lança — porque o resultado volta para o modelo, e uma
 * exceção no meio de uma sequência de ferramentas derruba o turno inteiro em vez de deixar o agente
 * corrigir o rumo.
 */
export async function callTool(
  actor: Actor,
  tools: readonly AgentTool[],
  name: string,
  args: Record<string, unknown> = {},
  deps: ToolRegistryDeps = {}
): Promise<ToolResult> {
  const tool = tools.find(t => t.name === name)

  if (!tool) {
    return { error: 'ferramenta_desconhecida', ok: false }
  }

  const permitido = await withPermission(
    actor,
    tool.action,
    { onAudit: deps.onAudit, now: deps.now, resource: tool.domain },
    async () => tool.run(args)
  )

  // A guarda devolve `{ error: 'sem_permissao', reason }`. Não basta procurar `error` no resultado:
  // várias ferramentas legitimamente devolvem `{ error }` (ex.: `sku_duplicado`), e tratá-las como
  // negação transformaria um erro de negócio em "sem permissão" — mensagem errada e indistinguível.
  if (
    permitido !== null &&
    typeof permitido === 'object' &&
    (permitido as { error?: string }).error === 'sem_permissao'
  ) {
    const negado = permitido as { error: string; reason?: string }

    return { error: negado.error, ok: false, reason: negado.reason }
  }

  return { ok: true, value: permitido }
}

/** Descrição do catálogo no formato que um modelo consome: nome, domínio, ação e texto. */
export function describeTools(tools: readonly AgentTool[]): string[] {
  return tools.map(tool => `${tool.name} [${tool.domain}/${tool.action}] — ${tool.description}`)
}

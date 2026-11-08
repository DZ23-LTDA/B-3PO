// Despacho de eventos para as automacoes.
//
// Existe para que cada dominio NAO repita a montagem (buscar regras, resolver ator, chamar runRules).
// Um lugar so, usado por venda, atendimento e estoque.
//
// DOIS TIPOS DE GATILHO, E ELES NAO SAO A MESMA COISA
//
// **Evento** (`venda.faturada`, `ticket.aberto`): acontece num instante, no meio de uma acao do
// usuario. O despacho e sincrono com a acao e nao pode desfaze-la.
//
// **Condicao vencida** (`ticket.atrasado`, `estoque.zerado`, `conta.vencendo`): derivada do RELOGIO ou
// de um limiar. Nao tem "o momento em que aconteceu" — um ticket esta atrasado enquanto estiver
// atrasado, nao apenas no segundo em que o prazo passou. Disparar uma vez por segundo seria um laco;
// disparar uma vez por tick exige memoria de "ja avisei", que este modulo ainda nao tem.
//
// Por isso `estoque.zerado` e emitido como evento no momento em que o saldo CRUZA para zero (a
// transicao e o evento), e `ticket.atrasado`/`conta.vencendo` ficam registrados como pendencias: sao
// varredura, nao evento, e fingir que sao evento produziria disparo repetido.

import { resolveRuleActor } from './automation-actors'
import { runRules, type AutomationReport, type AutomationRule, type AutomationTrigger } from './automation-store'
import type { AgentTool } from './agent-tools'
import type { Actor } from './rbac'

export interface EventPayload {
  /** Resumo do fato. A automacao nao deve depender da forma do documento de origem. */
  detail: Record<string, unknown>
  tenant_id: string
  type: AutomationTrigger
}

export interface DispatcherDeps {
  /** Atores persistidos. Resolvido a cada execucao para que desativar desligue a automacao. */
  actors: () => Promise<(Actor & { active: boolean })[]>
  automations: { list: (tenantId: string) => Promise<AutomationRule[]> }
  now: () => number
  onAudit?: (report: AutomationReport, event: EventPayload) => void
  /** Resolvido no disparo, não na criação: quem monta o despachante pode não ter as ferramentas ainda. */
  tools: () => readonly AgentTool[]
}

export type Dispatcher = (event: EventPayload) => Promise<AutomationReport>

export function createDispatcher(deps: DispatcherDeps): Dispatcher {
  return async event => {
    const regras = await deps.automations.list(event.tenant_id)

    const report = await runRules(regras, event.type, {
      actorFor: async id => resolveRuleActor(await deps.actors(), id),
      now: deps.now(),
      tenantId: event.tenant_id,
      tools: deps.tools()
    })

    deps.onAudit?.(report, event)

    return report
  }
}

/**
 * Chama o despacho sem deixar uma falha de automacao derrubar a acao do usuario.
 *
 * Silencioso de proposito no retorno: o registro do que aconteceu e responsabilidade de `onAudit`, nao
 * do dominio que disparou. Um dominio que devolvesse erro por causa de uma regra estaria mentindo
 * sobre o que aconteceu com o dado dele.
 */
export async function dispatchQuietly(dispatcher: Dispatcher | null | undefined, event: EventPayload): Promise<void> {
  if (!dispatcher) return

  try {
    await dispatcher(event)
  } catch {
    // A acao do usuario ja aconteceu; a falha da regra aparece na auditoria.
  }
}

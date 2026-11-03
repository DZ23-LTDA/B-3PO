/**
 * Contrato de execução do cliente mobile B-3PO.
 *
 * O mobile é um CLIENTE: ele não roda loop, não abre sessão e não executa ferramenta. Ele recebe
 * eventos reais do gateway (o mesmo runtime Hermes que o desktop usa), traduz para o vocabulário
 * público (execution.*) e mantém um log idempotente. Essa é a única fonte de verdade de progresso —
 * nada aqui inventa evento: um frame desconhecido vira `null`.
 *
 * Espelha `apps/desktop/src/plugins/hermes-bots/orchestration.ts` de propósito: o contrato é o mesmo
 * dos dois lados. Quando houver pacote compartilhado, este arquivo passa a reexportá-lo.
 */

/** Eventos públicos da camada B-3PO (v1). */
export type ExecutionEventType =
  | 'execution.created'
  | 'execution.started'
  | 'execution.waiting_approval'
  | 'execution.tool_started'
  | 'execution.tool_finished'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.cancel_requested'
  | 'execution.cancelled'

export interface ExecutionEvent {
  event_id: string
  execution_id: string
  correlation_id: string
  sequence: number
  type: ExecutionEventType
  at: number
  /** Carga específica do tipo; nunca contém segredo nem transcript completo. */
  data?: Record<string, unknown>
}

/** Frame vindo do gateway (turn/tool). Só o que o cliente realmente entende. */
export interface RuntimeFrame {
  type?: string
  session_id?: string
  turn_id?: string
  tool_name?: string
  call_id?: string
  ok?: boolean
  error?: string
  text?: string
}

export interface ExecutionIdentity {
  execution_id: string
  correlation_id: string
  session_id: string
}

/**
 * Traduz um frame do runtime para o tipo público, ou `null` quando o frame não é nosso.
 *
 * Regra dura: nunca fabricar evento. `tool.generating` e frames de progresso não viram
 * `execution.tool_started`; só o que o gateway declarou como início/fim real.
 */
export function mapRuntimeFrame(frame: RuntimeFrame): ExecutionEventType | null {
  switch (frame.type) {
    case 'turn.start':
      return 'execution.started'
    case 'turn.end':
      return 'execution.completed'
    case 'turn.error':
    case 'turn.failed':
      return 'execution.failed'
    case 'tool.start':
      return 'execution.tool_started'
    case 'tool.complete':
      return 'execution.tool_finished'
    case 'approval.request':
    case 'tool.waiting_approval':
      return 'execution.waiting_approval'
    default:
      return null
  }
}

/** O que o runtime declara suportar; o cliente nunca promete o que não existe. */
export const RUNTIME_CAPABILITIES = Object.freeze({
  approval: 'gateway' as const,
  cancellation: 'interrupt' as const,
  tool_trace: true,
  /** O mobile NÃO executa ferramenta: capabilities descrevem o runtime, não o cliente. */
  clientExecutesTools: false
})

export type Decision = 'allow' | 'deny' | 'ask'

export interface PermissionPolicy {
  allow: string[]
  deny: string[]
  default: Decision
}

/**
 * Decide se uma ferramenta pode rodar. `deny` sempre vence; depois `allow`; depois o default.
 * A decisão é do backend — o cliente só reproduz a política para explicar a UI e desabilitar botões.
 */
export function decideTool(policy: PermissionPolicy, tool: string): Decision {
  if (policy.deny.includes(tool)) {
    return 'deny'
  }

  if (policy.allow.includes(tool)) {
    return 'allow'
  }

  return policy.default
}

/**
 * Log de execução idempotente: reenvio de evento (reconexão, replay do gateway) não duplica linha.
 * Chave = `execution_id:sequence:type`, com `event_id` como desempate.
 */
export class ExecutionLog {
  private readonly seen = new Set<string>()
  private readonly events: ExecutionEvent[] = []

  append(event: ExecutionEvent): boolean {
    const key = `${event.execution_id}:${event.sequence}:${event.type}:${event.event_id}`

    if (this.seen.has(key)) {
      return false
    }

    this.seen.add(key)
    this.events.push(event)

    return true
  }

  list(executionId?: string): readonly ExecutionEvent[] {
    return executionId ? this.events.filter(event => event.execution_id === executionId) : [...this.events]
  }

  /** Estado derivado do log — nunca guardado à parte, para não divergir. */
  stateOf(executionId: string): 'unknown' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' {
    let state: ReturnType<ExecutionLog['stateOf']> = 'unknown'

    for (const event of this.list(executionId)) {
      switch (event.type) {
        case 'execution.created':
        case 'execution.started':
        case 'execution.tool_started':
        case 'execution.tool_finished':
          state = state === 'unknown' || state === 'waiting_approval' ? 'running' : state
          break
        case 'execution.waiting_approval':
          state = 'waiting_approval'
          break
        case 'execution.completed':
          state = 'completed'
          break
        case 'execution.failed':
          state = 'failed'
          break
        case 'execution.cancel_requested':
        case 'execution.cancelled':
          state = 'cancelled'
          break
      }
    }

    return state
  }
}

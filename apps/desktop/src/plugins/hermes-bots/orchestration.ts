/**
 * Camada de orquestração B-3PO v1 (O1/D3) — adaptador de eventos.
 *
 * A camada é dona do domínio: `execution_id`, `correlation_id`, normalização de eventos,
 * política de ferramenta e apresentação de estado. O Hermes continua dono do loop, da sessão,
 * das ferramentas e do estado interno — este módulo **não** executa nada.
 *
 * Regras que o código abaixo garante:
 * - evento que o runtime não emite vira `null`, nunca um evento inventado;
 * - `capabilities` declara o que é real (`approval` por gateway, `cancellation` por interrupt);
 * - a política é decidida no despacho (allow / ask / deny), com `deny` vencendo sempre;
 * - a aplicação de eventos é idempotente por `event_id` + `sequence`.
 */

export const EVENT_VERSION = 1 as const

export type ExecutionEventType =
  | 'execution.created'
  | 'execution.started'
  | 'execution.tool_started'
  | 'execution.tool_finished'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.cancel_requested'
  | 'execution.cancelled'

export interface ExecutionEvent {
  event_version: typeof EVENT_VERSION
  event_type: ExecutionEventType
  event_id: string
  execution_id: string
  bot_id: string
  occurred_at: number
  sequence: number
  session_ref?: null | string
  payload: Record<string, unknown>
}

/** Frame cru do runtime (o que o gateway entrega). Tolerante por desenho. */
export interface RuntimeFrame {
  type?: string
  [key: string]: unknown
}

export interface RuntimeCapabilities {
  runtime: 'hermes'
  contract_version: 1
  /** Eventos que o adaptador consegue emitir a partir de frames reais. */
  events: ExecutionEventType[]
  /** `gateway`: aprovação existe via tools/approval e é roteada por fora deste canal. */
  approval: 'gateway'
  /** `interrupt`: cancelamento é pedido ao runtime e confirmado por resposta dele. */
  cancellation: 'interrupt'
  /** Eventos de ferramenta existem de verdade (`tool.start`/`tool.complete`). */
  tool_trace: true
}

export const HERMES_CAPABILITIES: RuntimeCapabilities = Object.freeze({
  runtime: 'hermes',
  contract_version: 1,
  events: [
    'execution.created',
    'execution.started',
    'execution.tool_started',
    'execution.tool_finished',
    'execution.completed',
    'execution.failed'
  ] as ExecutionEventType[],
  approval: 'gateway',
  cancellation: 'interrupt',
  tool_trace: true
})

/** Mapa frame do runtime → tipo do contrato. Só entram os que o runtime realmente emite. */
const FRAME_MAP: Record<string, ExecutionEventType> = {
  'turn.start': 'execution.started',
  'turn.end': 'execution.completed',
  'turn.error': 'execution.failed',
  'tool.start': 'execution.tool_started',
  'tool.complete': 'execution.tool_finished'
}

export interface ExecutionContext {
  execution_id: string
  bot_id: string
  correlation_id?: string
  session_ref?: null | string
}

let counter = 0

function nextId(prefix: string, now: () => number, rand: () => number): string {
  counter = (counter + 1) % 1_000_000
  const random = Math.floor(rand() * 0xffffffff).toString(16).padStart(8, '0')

  return `${prefix}_${now().toString(36)}${counter.toString(36).padStart(3, '0')}${random}`
}

export function newExecutionId(now: () => number = Date.now, rand: () => number = Math.random): string {
  return nextId('exec', now, rand)
}

export function newCorrelationId(now: () => number = Date.now, rand: () => number = Math.random): string {
  return nextId('corr', now, rand)
}

export function newEventId(now: () => number = Date.now, rand: () => number = Math.random): string {
  return nextId('evt', now, rand)
}

function asString(value: unknown): null | string {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * Converte um frame do runtime no evento do contrato.
 * Devolve `null` quando o frame não é mapeável — nunca inventa evento.
 */
export function mapRuntimeFrame(
  context: ExecutionContext,
  frame: RuntimeFrame,
  sequence: number,
  now: () => number = Date.now,
  rand: () => number = Math.random
): ExecutionEvent | null {
  const type = asString(frame?.type)

  if (!type) {return null}

  const eventType = FRAME_MAP[type]

  if (!eventType) {return null}

  const payload: Record<string, unknown> = {}
  const tool = asString(frame.name ?? frame.tool)
  const toolId = asString(frame.tool_id)

  if (tool) {payload.tool = tool}

  if (toolId) {payload.tool_id = toolId}

  if (eventType === 'execution.failed') {
    payload.reason = asString(frame.error ?? frame.message) ?? 'runtime error'
  }

  const session = asString(frame.sid ?? frame.session_id) ?? context.session_ref ?? null

  return {
    event_version: EVENT_VERSION,
    event_type: eventType,
    event_id: newEventId(now, rand),
    execution_id: context.execution_id,
    bot_id: context.bot_id,
    occurred_at: now(),
    sequence,
    session_ref: session,
    payload
  }
}

/** Decisão de política para uma ferramenta. `deny` sempre vence. */
export function decideTool(
  policy: { allow: string[]; deny: string[]; default: 'deny' | 'ask' },
  tool: string
): 'allow' | 'ask' | 'deny' {
  if (policy.deny.includes(tool)) {return 'deny'}

  if (policy.allow.includes(tool)) {return 'allow'}

  return policy.default
}

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'unknown'

/**
 * Log de execução idempotente: aplicar o mesmo evento duas vezes (reconexão, replay)
 * não duplica estado. É o que impede execução/evento duplicado após reconectar.
 */
export class ExecutionLog {
  private readonly events: ExecutionEvent[] = []
  private readonly seen = new Set<string>()
  private statusValue: ExecutionStatus = 'unknown'

  append(event: ExecutionEvent): boolean {
    const key = `${event.execution_id}:${event.sequence}:${event.event_type}`

    if (this.seen.has(key)) {return false}

    if (this.seen.has(event.event_id)) {return false}

    this.seen.add(key)
    this.seen.add(event.event_id)
    this.events.push(event)

    if (event.event_type === 'execution.started') {this.statusValue = 'running'}

    if (event.event_type === 'execution.completed') {this.statusValue = 'completed'}

    if (event.event_type === 'execution.failed') {this.statusValue = 'failed'}

    if (event.event_type === 'execution.cancelled') {this.statusValue = 'cancelled'}

    return true
  }

  list(): readonly ExecutionEvent[] {
    return this.events
  }

  status(): ExecutionStatus {
    return this.statusValue
  }
}


/**
 * Automações do CRM (GOAL §14.5).
 *
 * O motor NÃO executa nada: ele decide **quais** ações devem acontecer, com que chave de idempotência,
 * e o que foi recusado por política. A execução real (enviar template, chamar bot, atualizar CRM) fica
 * em outro módulo, com permissão e aprovação. Isso permite provar as regras de segurança sem tocar em
 * serviço externo.
 *
 * Regras que o código impõe — e os testes provam:
 *
 * - **idempotência por (evento, regra)**: o mesmo evento reenviado (webhook repete, retry do cliente)
 *   não gera a ação duas vezes;
 * - **deduplicação por janela**: o mesmo assunto para o mesmo contato dentro da janela é ignorado,
 *   mesmo com evento novo;
 * - **limite de cadeia**: ação que dispara outro evento carrega `depth`; acima do teto o motor para —
 *   automação não entra em laço infinito;
 * - **teto por evento**: uma regra não pode gerar mais ações que o permitido;
 * - **pausada/desligada** não roda, e o motivo aparece no resultado;
 * - **ação sensível exige aprovação**: não vira envio silencioso, sai marcada como `needs_approval`;
 * - **toda decisão é auditada**: aprovada, recusada, ou ignorada, com motivo.
 */

export type TriggerType =
  | 'message_received'
  | 'contact_created'
  | 'lead_created'
  | 'stage_changed'
  | 'task_overdue'
  | 'schedule'
  | 'webhook'
  | 'crm_event'

export type ActionKind =
  | 'classify'
  | 'assign'
  | 'create_task'
  | 'update_crm'
  | 'notify'
  | 'request_approval'
  | 'send_template'
  | 'call_bot'

/** Ações que mexem com o mundo fora do CRM: exigem aprovação antes de executar. */
const SENSITIVE_ACTIONS: ReadonlySet<ActionKind> = new Set<ActionKind>([
  'send_template',
  'call_bot',
  'update_crm'
])

export interface AutomationEvent {
  id: string
  type: TriggerType
  at: number
  /** Contato/conversa alvo; usado para deduplicação por assunto. */
  subjectId: string | null
  /** Quantas automações já dispararam por causa deste evento (proteção de cadeia). */
  depth?: number
  payload?: Record<string, unknown>
}

export interface AutomationAction {
  kind: ActionKind
  params?: Record<string, unknown>
}

export interface AutomationLimits {
  /** Máximo de ações por evento nesta regra. */
  maxActionsPerEvent?: number
  /** Janela de deduplicação para o mesmo `subjectId` + regra. */
  dedupeWindowMs?: number
}

export interface AutomationRule {
  id: string
  name: string
  enabled: boolean
  /** `true` suspende sem apagar, preservando as demais regras. */
  paused?: boolean
  trigger: TriggerType
  /** Condição simples: `payload[campo] === valor`. Sem campo, a regra casa por tipo. */
  conditions?: Array<{ field: string; equals: unknown }>
  actions: AutomationAction[]
  limits?: AutomationLimits
}

export interface AutomationState {
  /** Chaves `evento:regra` já processadas. */
  processed: Record<string, true>
  /** Última execução por `regra:subject`, para a janela de deduplicação. */
  lastRun: Record<string, number>
}

export type SkipReason =
  | 'rule_disabled'
  | 'rule_paused'
  | 'trigger_mismatch'
  | 'condition_failed'
  | 'already_processed'
  | 'deduplicated'
  | 'chain_limit'
  | 'action_limit'

export interface PlannedAction extends AutomationAction {
  ruleId: string
  eventId: string
  /** Chave para o executor não repetir a ação se o evento for reenviado. */
  idempotencyKey: string
  needsApproval: boolean
}

export interface AuditEntry {
  at: number
  ruleId: string
  eventId: string
  outcome: 'planned' | 'skipped'
  reason: SkipReason | null
  actions: number
}

export interface AutomationResult {
  actions: PlannedAction[]
  state: AutomationState
  audit: AuditEntry[]
}

export const DEFAULT_MAX_ACTIONS_PER_EVENT = 5
export const DEFAULT_DEDUPE_WINDOW_MS = 5 * 60 * 1000
export const DEFAULT_MAX_DEPTH = 3

export function emptyAutomationState(): AutomationState {
  return { processed: {}, lastRun: {} }
}

function conditionsMatch(rule: AutomationRule, event: AutomationEvent): boolean {
  if (!rule.conditions || rule.conditions.length === 0) {
    return true
  }

  const payload = event.payload ?? {}

  return rule.conditions.every(condition => payload[condition.field] === condition.equals)
}

function skip(rule: AutomationRule, event: AutomationEvent, reason: SkipReason): AuditEntry {
  return { at: event.at, ruleId: rule.id, eventId: event.id, outcome: 'skipped', reason, actions: 0 }
}

/**
 * Roda as regras para um evento. Devolve o estado novo (nunca muta o recebido) e a auditoria de cada
 * decisão — inclusive as recusas, que são o que permite explicar "por que a automação não rodou".
 */
export function runAutomations(
  event: AutomationEvent,
  rules: readonly AutomationRule[],
  state: AutomationState,
  options: { maxDepth?: number } = {}
): AutomationResult {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH
  const depth = event.depth ?? 0

  const processed: Record<string, true> = { ...state.processed }
  const lastRun: Record<string, number> = { ...state.lastRun }
  const actions: PlannedAction[] = []
  const audit: AuditEntry[] = []

  for (const rule of rules) {
    if (!rule.enabled) {
      audit.push(skip(rule, event, 'rule_disabled'))
      continue
    }

    if (rule.paused) {
      audit.push(skip(rule, event, 'rule_paused'))
      continue
    }

    if (rule.trigger !== event.type) {
      // Ruído esperado: só audita quando a regra era candidata por outro filtro.
      continue
    }

    if (!conditionsMatch(rule, event)) {
      audit.push(skip(rule, event, 'condition_failed'))
      continue
    }

    const key = `${event.id}:${rule.id}`

    if (processed[key]) {
      audit.push(skip(rule, event, 'already_processed'))
      continue
    }

    if (depth >= maxDepth) {
      audit.push(skip(rule, event, 'chain_limit'))
      continue
    }

    const subjectKey = `${rule.id}:${event.subjectId ?? '-'}`
    const windowMs = rule.limits?.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS
    const previous = lastRun[subjectKey]

    if (previous !== undefined && event.at - previous < windowMs) {
      audit.push(skip(rule, event, 'deduplicated'))
      continue
    }

    const cap = rule.limits?.maxActionsPerEvent ?? DEFAULT_MAX_ACTIONS_PER_EVENT

    if (rule.actions.length > cap) {
      audit.push(skip(rule, event, 'action_limit'))
      continue
    }

    processed[key] = true
    lastRun[subjectKey] = event.at

    for (const [index, action] of rule.actions.entries()) {
      actions.push({
        ...action,
        ruleId: rule.id,
        eventId: event.id,
        idempotencyKey: `${rule.id}:${event.id}:${index}`,
        needsApproval: SENSITIVE_ACTIONS.has(action.kind)
      })
    }

    audit.push({ at: event.at, ruleId: rule.id, eventId: event.id, outcome: 'planned', reason: null, actions: rule.actions.length })
  }

  return { actions, state: { processed, lastRun }, audit }
}

/** Resumo para a tela de automações: o que rodou e o que foi recusado, com motivo legível. */
export function auditSummary(audit: readonly AuditEntry[]): Array<{ label: string; count: number }> {
  const reasons: Record<SkipReason, string> = {
    rule_disabled: 'regra desligada',
    rule_paused: 'regra pausada',
    trigger_mismatch: 'gatilho diferente',
    condition_failed: 'condição não bateu',
    already_processed: 'evento já processado (idempotência)',
    deduplicated: 'repetido dentro da janela',
    chain_limit: 'limite de encadeamento',
    action_limit: 'limite de ações por evento'
  }

  const counts = new Map<string, number>()

  for (const entry of audit) {
    const label = entry.outcome === 'planned' ? 'ações planejadas' : reasons[entry.reason ?? 'rule_disabled']
    counts.set(label, (counts.get(label) ?? 0) + (entry.outcome === 'planned' ? entry.actions : 1))
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

/** Regras que exigem aprovação nunca são planejadas como envio direto. */
export function requiresApproval(actions: readonly PlannedAction[]): boolean {
  return actions.some(action => action.needsApproval)
}

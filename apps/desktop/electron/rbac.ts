// RBAC e policy engine.
//
// A regra do GOAL que dá forma a este arquivo: **não confiar no frontend** e **não permitir escalada de
// privilégios entre Bots**. Por isso a decisão é uma função pura sobre o ator e a ação, tomada no
// processo principal — nunca uma checagem de interface.
//
// Os cinco níveis são cumulativos de baixo para cima: quem pode preparar pode recomendar; quem pode
// executar pode preparar. É o que evita uma matriz de combinações impossíveis de auditar.
//
// Duas travas que existem porque são o erro clássico de RBAC:
//
// 1. **Bot não herda permissão de humano.** Um agente com `EXECUTE_ALLOWED` executa o que está na
//    lista dele, e nada mais — em particular não cria ator, não muda papel e não aprova a própria ação.
// 2. **Ação sensível exige humano**, independentemente do nível. Pagamento real, demissão e mudança de
//    permissão não são delegáveis a um agente, mesmo que ele tenha o nível mais alto.

export const LEVELS = ['READ', 'RECOMMEND', 'PREPARE', 'EXECUTE_ALLOWED', 'SUPERVISED_AUTONOMY'] as const

export type Level = (typeof LEVELS)[number]

export const ROLES = ['viewer', 'operator', 'manager', 'owner', 'bot'] as const

export type Role = (typeof ROLES)[number]

export type ActorKind = 'bot' | 'human'

export interface Actor {
  id: string
  kind: ActorKind
  /** Nível efetivo. Nulo = sem acesso. */
  level: null | Level
  role: Role
  /** Só para bot: domínios em que ele pode agir. Vazio = nenhum. */
  scopes?: readonly string[]
}

export const ACTIONS = [
  'read',
  'recommend',
  'prepare',
  'execute',
  'settle_real_payment',
  'approve',
  'manage_actor',
  'change_role'
] as const

export type Action = (typeof ACTIONS)[number]

/** Ações que nenhum agente pode executar, em nenhum nível. */
const HUMAN_ONLY: readonly Action[] = ['manage_actor', 'change_role', 'settle_real_payment']

/** Nível mínimo que cada ação exige de um humano. */
const MIN_LEVEL: Record<Action, Level> = {
  approve: 'SUPERVISED_AUTONOMY',
  change_role: 'SUPERVISED_AUTONOMY',
  execute: 'EXECUTE_ALLOWED',
  manage_actor: 'SUPERVISED_AUTONOMY',
  prepare: 'PREPARE',
  read: 'READ',
  recommend: 'RECOMMEND',
  settle_real_payment: 'SUPERVISED_AUTONOMY'
}

const RANK: Record<Level, number> = {
  EXECUTE_ALLOWED: 3,
  PREPARE: 2,
  READ: 0,
  RECOMMEND: 1,
  SUPERVISED_AUTONOMY: 4
}

export function rankOf(level: null | Level): number {
  return level ? RANK[level] : -1
}

/** O ator alcança o nível exigido? */
export function hasLevel(actor: Actor, required: Level): boolean {
  return rankOf(actor.level) >= RANK[required]
}

export interface Decision {
  allowed: boolean
  /** Por que foi negado. Vazio quando permitido. */
  reason: string
}

/**
 * A decisão. `resource` é o domínio (catalog, inventory, finance…) e é o que limita um bot.
 *
 * Devolve motivo em toda negativa: uma negativa silenciosa faz o operador tentar de novo achando que
 * foi erro de sistema.
 */
export function can(actor: Actor, action: Action, resource = ''): Decision {
  if (!actor.level) {
    return { allowed: false, reason: 'sem_nivel' }
  }

  if (actor.kind === 'bot' && HUMAN_ONLY.includes(action)) {
    return { allowed: false, reason: 'acao_exige_humano' }
  }

  // Bot só age no domínio que lhe foi atribuído. Sem scopes declarados, não age em nenhum.
  if (actor.kind === 'bot' && resource) {
    const escopos = actor.scopes ?? []

    if (!escopos.includes(resource)) {
      return { allowed: false, reason: 'fora_do_escopo' }
    }
  }

  if (!hasLevel(actor, MIN_LEVEL[action])) {
    return { allowed: false, reason: 'nivel_insuficiente' }
  }

  return { allowed: true, reason: '' }
}

/**
 * Um bot pode receber este nível?
 *
 * `SUPERVISED_AUTONOMY` para bot é permitido em operação normal, mas nunca para as ações HUMAN_ONLY —
 * e essa checagem fica em `can`, não aqui. O que esta função impede é dar a um bot o papel `owner`,
 * que carregaria autoridade sobre outros atores.
 */
export function canGrantLevel(grantor: Actor, target: Actor, level: Level): Decision {
  if (grantor.kind === 'bot') {
    return { allowed: false, reason: 'bot_nao_concede' }
  }

  // Conceder exige capacidade de administrar (EXECUTE_ALLOWED), não o nível máximo: exigir
  // SUPERVISED_AUTONOMY faria só o owner conceder qualquer coisa, e um manager não conseguiria dar
  // nível menor a um novo operador.
  if (!hasLevel(grantor, 'EXECUTE_ALLOWED')) {
    return { allowed: false, reason: 'nivel_insuficiente' }
  }

  // Ninguém concede acima do próprio nível: é o que impede escalada.
  if (RANK[level] > rankOf(grantor.level)) {
    return { allowed: false, reason: 'acima_do_proprio_nivel' }
  }

  if (target.kind === 'bot' && level === 'SUPERVISED_AUTONOMY' && target.role === 'owner') {
    return { allowed: false, reason: 'bot_como_owner' }
  }

  return { allowed: true, reason: '' }
}

export interface AuditEntry {
  action: Action
  actorId: string
  allowed: boolean
  at: number
  reason: string
  resource: string
}

/** Registra a decisão. Auditoria é do sistema, não do ator. */
export function audit(actor: Actor, action: Action, resource: string, decision: Decision, at: number): AuditEntry {
  return {
    action,
    actorId: actor.id,
    allowed: decision.allowed,
    at,
    reason: decision.reason,
    resource
  }
}

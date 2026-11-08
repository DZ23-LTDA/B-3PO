/**
 * B-3PO bot schema v1 (F4 da Ata de Consenso).
 *
 * Fica como camada de contrato sobre o profile do Hermes: o bot **é** um profile,
 * e este módulo define o registro canônico (identity / runtime_config / links_and_state)
 * sem duplicar transcript, memória, sessão ou estado interno do runtime.
 *
 * Regras duras:
 * - `engine` tem um único valor válido no v1: `hermes`;
 * - `permission_policy` é obrigatória e o default é restritivo (deny);
 * - campos não confirmados ficam `null` e não geram promessa de UI;
 * - o mascote é identidade visual, nunca executor.
 */

export const BOT_SCHEMA_VERSION = 1 as const

export type BotEngine = 'hermes'

/** Política aplicada no ponto de execução (toolset), nunca como filtro de UI. */
export interface PermissionPolicy {
  /** Ferramentas explicitamente permitidas. Vazio = nenhuma por padrão. */
  allow: string[]
  /** Ferramentas sempre negadas, vencem `allow`. */
  deny: string[]
  /** Comportamento para ferramenta não listada. */
  default: 'deny' | 'ask'
}

export interface BotIdentity {
  schema_version: typeof BOT_SCHEMA_VERSION
  id: string
  name: string
  description: null | string
  mascot_id: null | string
  /** Persona/instruções. Referência ao SOUL do profile, não cópia do transcript. */
  instructions: null | string
  labels: string[]
}

export interface BotRuntimeConfig {
  engine: BotEngine
  provider: null | string
  model: null | string
  permission_policy: PermissionPolicy
  /** Referências opcionais; `null` enquanto não confirmadas na auditoria. */
  workspace_ref: null | string
  tools: null | string[]
  skills: null | string[]
  mcp_refs: null | string[]
}

export interface BotLinksState {
  conversation_ref: null | string
  session_ref: null | string
  routines_ref: null | string
  memory_ref: null | string
  /** Estado transitório só para sincronizar a UI; nunca persistido como configuração. */
  live_state: null | {
    status: 'idle' | 'working' | 'waiting_approval' | 'error'
    updated_at?: number
  }
}

export interface BotRecord {
  identity: BotIdentity
  runtime_config: BotRuntimeConfig
  links_and_state: BotLinksState
}

/** Default restritivo: nada permitido sem declaração explícita. */
export const RESTRICTIVE_POLICY: PermissionPolicy = Object.freeze({
  allow: [],
  deny: [],
  default: 'deny'
})

/** Subconjunto de `BotMeta` que este módulo consome (evita dependência circular). */
export interface LegacyBotMeta {
  created?: number
  description?: string
  groups?: string[]
  group?: null | string
  shape?: string
  title?: string
}

export function restrictivePolicy(): PermissionPolicy {
  return { allow: [], deny: [], default: 'deny' }
}

/**
 * Converte o metadado legado do plugin (BotMeta + nome do profile) no registro v1.
 * Nunca inventa valor: provider/model/refs ficam `null` até quem sabe preencher.
 */
export function fromLegacyBotMeta(id: string, meta: LegacyBotMeta = {}): BotRecord {
  const labels = new Set<string>()

  for (const group of meta.groups ?? []) {if (group) {labels.add(group)}}

  if (meta.group) {labels.add(meta.group)}

  return {
    identity: {
      schema_version: BOT_SCHEMA_VERSION,
      id,
      name: meta.title?.trim() || id,
      description: meta.description?.trim() || null,
      mascot_id: null,
      instructions: null,
      labels: [...labels]
    },
    runtime_config: {
      engine: 'hermes',
      provider: null,
      model: null,
      permission_policy: restrictivePolicy(),
      workspace_ref: null,
      tools: null,
      skills: null,
      mcp_refs: null
    },
    links_and_state: {
      conversation_ref: null,
      session_ref: null,
      routines_ref: null,
      memory_ref: null,
      live_state: null
    }
  }
}

function stringOrNull(value: unknown): null | string {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringArrayOrNull(value: unknown): null | string[] {
  if (!Array.isArray(value)) {return null}
  const items = value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')

  return items
}

export function normalizePolicy(raw: unknown): PermissionPolicy {
  if (!raw || typeof raw !== 'object') {return restrictivePolicy()}
  const candidate = raw as Partial<PermissionPolicy>
  const allow = stringArrayOrNull(candidate.allow) ?? []
  const deny = stringArrayOrNull(candidate.deny) ?? []
  const fallback: PermissionPolicy['default'] = candidate.default === 'ask' ? 'ask' : 'deny'

  return { allow, deny, default: fallback }
}

/**
 * Normaliza um registro possivelmente legado/incompleto para v1.
 * Idempotente: passar um v1 de volta devolve o mesmo conteúdo.
 */
export function migrateBotRecord(raw: unknown): BotRecord {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('bot record must be an object')
  }

  const input = raw as Record<string, unknown>
  const identityIn = (input.identity ?? {}) as Record<string, unknown>
  const runtimeIn = (input.runtime_config ?? {}) as Record<string, unknown>
  const linksIn = (input.links_and_state ?? {}) as Record<string, unknown>

  const engine = (runtimeIn.engine ?? 'hermes') as unknown

  if (engine !== 'hermes') {
    throw new Error(`unsupported engine: ${String(engine)} (v1 accepts only "hermes")`)
  }

  const id = stringOrNull(identityIn.id)

  if (!id) {throw new Error('bot record requires identity.id')}

  return {
    identity: {
      schema_version: BOT_SCHEMA_VERSION,
      id,
      name: stringOrNull(identityIn.name) ?? id,
      description: stringOrNull(identityIn.description),
      mascot_id: stringOrNull(identityIn.mascot_id),
      instructions: stringOrNull(identityIn.instructions),
      labels: stringArrayOrNull(identityIn.labels) ?? []
    },
    runtime_config: {
      engine: 'hermes',
      provider: stringOrNull(runtimeIn.provider),
      model: stringOrNull(runtimeIn.model),
      permission_policy: normalizePolicy(runtimeIn.permission_policy),
      workspace_ref: stringOrNull(runtimeIn.workspace_ref),
      tools: stringArrayOrNull(runtimeIn.tools),
      skills: stringArrayOrNull(runtimeIn.skills),
      mcp_refs: stringArrayOrNull(runtimeIn.mcp_refs)
    },
    links_and_state: {
      conversation_ref: stringOrNull(linksIn.conversation_ref),
      session_ref: stringOrNull(linksIn.session_ref),
      routines_ref: stringOrNull(linksIn.routines_ref),
      memory_ref: stringOrNull(linksIn.memory_ref),
      live_state: null
    }
  }
}

/** Valida o registro; devolve lista de erros (vazia = válido). */
export function validateBotRecord(record: BotRecord): string[] {
  const errors: string[] = []

  if (!record?.identity?.id) {errors.push('identity.id is required')}

  if (!record?.identity?.name) {errors.push('identity.name is required')}

  if (record?.identity?.schema_version !== BOT_SCHEMA_VERSION) {
    errors.push(`identity.schema_version must be ${BOT_SCHEMA_VERSION}`)
  }

  if (record?.runtime_config?.engine !== 'hermes') {
    errors.push('runtime_config.engine must be "hermes" in v1')
  }

  if (!record?.runtime_config?.permission_policy) {
    errors.push('runtime_config.permission_policy is required')
  } else if (record.runtime_config.permission_policy.default !== 'deny' &&
             record.runtime_config.permission_policy.default !== 'ask') {
    errors.push('runtime_config.permission_policy.default must be "deny" or "ask"')
  }

  return errors
}

/** `mascot_id` é identidade visual; nunca define runtime. */
export function mascotIdFor(record: BotRecord): null | string {
  return record.identity.mascot_id
}


/** Metadado persistido do bot (subconjunto relevante para o contrato v1). */
export interface BotMetaLike extends LegacyBotMeta {
  mascot_id?: null | string
  permission_policy?: PermissionPolicy
}

/**
 * Compõe o registro v1 a partir do metadado persistido.
 * Campos ausentes caem no default restritivo — nunca herdam permissão de outro bot.
 */
export function botRecordFromMeta(id: string, meta: BotMetaLike = {}): BotRecord {
  const record = fromLegacyBotMeta(id, meta)
  record.identity.mascot_id = meta.mascot_id ?? null
  record.runtime_config.permission_policy = meta.permission_policy
    ? normalizePolicy(meta.permission_policy)
    : restrictivePolicy()

  return record
}

/** Extrai do registro apenas o que o metadado persistido guarda (identidade + política). */
export function botMetaPatchFromRecord(record: BotRecord): {
  mascot_id: null | string
  permission_policy: PermissionPolicy
} {
  return {
    mascot_id: record.identity.mascot_id,
    permission_policy: record.runtime_config.permission_policy
  }
}

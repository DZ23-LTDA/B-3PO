/**
 * Contrato do schema de Bot v1 (F4): três blocos, engine única, política obrigatória
 * e migração que nunca inventa valor.
 */

import { describe, expect, it } from 'vitest'

import {
  BOT_SCHEMA_VERSION,
  type BotRecord,
  fromLegacyBotMeta,
  mascotIdFor,
  migrateBotRecord,
  restrictivePolicy,
  validateBotRecord
} from './bot-schema'

describe('fromLegacyBotMeta', () => {
  it('mapeia nome, descrição e labels do metadado legado', () => {
    const record = fromLegacyBotMeta('reviewer', {
      title: 'Code Reviewer',
      description: 'Revisa diffs',
      groups: ['Engenharia', ''],
      group: 'Qualidade'
    })

    expect(record.identity).toMatchObject({
      schema_version: BOT_SCHEMA_VERSION,
      id: 'reviewer',
      name: 'Code Reviewer',
      description: 'Revisa diffs',
      mascot_id: null,
      labels: ['Engenharia', 'Qualidade']
    })
  })

  it('cai no id quando não há título e mantém refs nulas', () => {
    const record = fromLegacyBotMeta('planner')

    expect(record.identity.name).toBe('planner')
    expect(record.runtime_config.provider).toBeNull()
    expect(record.runtime_config.model).toBeNull()
    expect(record.runtime_config.workspace_ref).toBeNull()
    expect(record.links_and_state.memory_ref).toBeNull()
  })

  it('nasce com política restritiva e engine hermes', () => {
    const record = fromLegacyBotMeta('x')

    expect(record.runtime_config.engine).toBe('hermes')
    expect(record.runtime_config.permission_policy).toEqual({
      allow: [],
      deny: [],
      default: 'deny'
    })
  })
})

describe('migrateBotRecord', () => {
  it('preenche política ausente com default restritivo', () => {
    const migrated = migrateBotRecord({
      identity: { id: 'b1', name: 'B1', schema_version: 1 },
      runtime_config: { engine: 'hermes' }
    })

    expect(migrated.runtime_config.permission_policy).toEqual(restrictivePolicy())
  })

  it('rejeita engine diferente de hermes no v1', () => {
    expect(() =>
      migrateBotRecord({
        identity: { id: 'b1', name: 'B1' },
        runtime_config: { engine: 'other-runtime' }
      })
    ).toThrow(/unsupported engine/)
  })

  it('rejeita registro sem identity.id', () => {
    expect(() => migrateBotRecord({ identity: {} })).toThrow(/identity\.id/)
  })

  it('preserva mascot_id e normaliza default inválido para deny', () => {
    const migrated = migrateBotRecord({
      identity: { id: 'b2', name: 'B2', mascot_id: 'cortex' },
      runtime_config: {
        engine: 'hermes',
        permission_policy: { allow: ['read_file'], deny: [], default: 'allow-everything' }
      }
    })

    expect(migrated.identity.mascot_id).toBe('cortex')
    expect(migrated.runtime_config.permission_policy.allow).toEqual(['read_file'])
    expect(migrated.runtime_config.permission_policy.default).toBe('deny')
  })

  it('aceita default ask', () => {
    const migrated = migrateBotRecord({
      identity: { id: 'b3', name: 'B3' },
      runtime_config: { engine: 'hermes', permission_policy: { allow: [], deny: ['shell'], default: 'ask' } }
    })

    expect(migrated.runtime_config.permission_policy.default).toBe('ask')
    expect(migrated.runtime_config.permission_policy.deny).toEqual(['shell'])
  })

  it('é idempotente para um registro v1', () => {
    const once = migrateBotRecord({
      identity: { id: 'b4', name: 'B4', mascot_id: 'bit' },
      runtime_config: { engine: 'hermes', permission_policy: { allow: ['web'], deny: [], default: 'deny' } },
      links_and_state: { session_ref: 'sess-1' }
    })

    const twice = migrateBotRecord(once)

    expect(twice).toEqual(once)
  })
})

describe('validateBotRecord', () => {
  it('aceita registro migrado', () => {
    const record = migrateBotRecord({ identity: { id: 'ok', name: 'OK' } })
    expect(validateBotRecord(record)).toEqual([])
  })

  it('reprova política ausente e engine diferente', () => {
    const broken = {
      identity: { id: 'bad', name: 'Bad', schema_version: 1, labels: [] },
      runtime_config: { engine: 'nope' },
      links_and_state: {}
    } as unknown as BotRecord

    const errors = validateBotRecord(broken)
    expect(errors).toContain('runtime_config.engine must be "hermes" in v1')
    expect(errors).toContain('runtime_config.permission_policy is required')
  })
})

describe('mascotIdFor', () => {
  it('devolve null quando não há mascote e o id quando há', () => {
    const plain = fromLegacyBotMeta('sem-mascote')
    expect(mascotIdFor(plain)).toBeNull()

    const withMascot = migrateBotRecord({
      identity: { id: 'com-mascote', name: 'Com', mascot_id: 'nexus' }
    })

    expect(mascotIdFor(withMascot)).toBe('nexus')
  })
})

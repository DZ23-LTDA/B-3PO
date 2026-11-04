// O alias `owner` — a divida da rodada 68.
//
// O defeito: a tela cria regra com `actor_id: 'owner'`, o dono real tem id gerado, o despachante nao
// encontrava ninguem, e a regra falhava com `ator_ausente` em TODA execucao. A regra parecia
// configurada e nunca rodava.

import { describe, expect, it } from 'vitest'

import { OWNER_ALIAS, resolveRuleActor, withOwnerAlias, type ActorRecord } from './automation-actors'
import type { Actor } from './rbac'

const dono: Actor = { id: 'actor_1700000000000_ab12cd', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner', scopes: [] }

const ator = (over: Partial<ActorRecord> = {}): ActorRecord => ({
  active: true,
  id: 'bot_1',
  kind: 'bot',
  level: 'EXECUTE_ALLOWED',
  role: 'bot',
  scopes: ['inventory'],
  ...over
})

describe('withOwnerAlias', () => {
  it('acrescenta o rotulo owner apontando para o dono real', () => {
    const lista = withOwnerAlias([ator()], dono)
    const alias = lista.find(a => a.id === OWNER_ALIAS)

    expect(alias).toBeDefined()
    expect(alias!.level).toBe('SUPERVISED_AUTONOMY')
    expect(alias!.role).toBe('owner')
    expect(alias!.active).toBe(true)
  })

  it('sem dono a lista fica como esta: melhor falhar visivel que inventar ator', () => {
    expect(withOwnerAlias([ator()], null)).toHaveLength(1)
  })

  it('se ja existe ator com id literal owner, o dado real manda', () => {
    const literal = ator({ id: OWNER_ALIAS, level: 'READ' })
    const lista = withOwnerAlias([literal], dono)

    expect(lista.filter(a => a.id === OWNER_ALIAS)).toHaveLength(1)
    expect(lista.find(a => a.id === OWNER_ALIAS)!.level).toBe('READ')
  })

  it('nao muta a lista recebida', () => {
    const original = [ator()]

    withOwnerAlias(original, dono)

    expect(original).toHaveLength(1)
  })
})

describe('resolveRuleActor', () => {
  it('o caso que falhava: regra com owner roda quando o alias existe', () => {
    const lista = withOwnerAlias([ator()], dono)

    const resolvido = resolveRuleActor(lista, OWNER_ALIAS)

    expect(resolvido).not.toBeNull()
    expect(resolvido!.level).toBe('SUPERVISED_AUTONOMY')
  })

  it('sem o alias, a mesma regra falha — a prova de que o alias e o que conserta', () => {
    // Lista sem `withOwnerAlias`: e exatamente o estado anterior a correcao.
    expect(resolveRuleActor([ator()], OWNER_ALIAS)).toBeNull()
  })

  it('ator inativo nao resolve', () => {
    const lista = withOwnerAlias([ator({ active: false })], dono)

    expect(resolveRuleActor(lista, 'bot_1')).toBeNull()
  })

  it('id que nao existe nao resolve', () => {
    expect(resolveRuleActor(withOwnerAlias([], dono), 'fantasma')).toBeNull()
  })

  it('respeita o escopo do ator: o alias nao inventa permissao', () => {
    // O dono tem escopos vazios no fixture; o alias nao acrescenta nenhum.
    const lista = withOwnerAlias([], dono)

    expect(resolveRuleActor(lista, OWNER_ALIAS)!.scopes).toEqual([])
  })
})

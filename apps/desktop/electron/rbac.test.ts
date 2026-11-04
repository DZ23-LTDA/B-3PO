import { describe, expect, it } from 'vitest'

import { audit, can, canGrantLevel, hasLevel, LEVELS, rankOf, type Actor } from './rbac'

const humano = (over: Partial<Actor> = {}): Actor => ({
  id: 'u1',
  kind: 'human',
  level: 'SUPERVISED_AUTONOMY',
  role: 'owner',
  ...over
})

const bot = (over: Partial<Actor> = {}): Actor => ({
  id: 'b1',
  kind: 'bot',
  level: 'EXECUTE_ALLOWED',
  role: 'bot',
  scopes: ['inventory'],
  ...over
})

describe('niveis cumulativos', () => {
  it('rank sobe na ordem declarada', () => {
    expect(LEVELS.map(rankOf)).toEqual([0, 1, 2, 3, 4])
  })

  it('quem executa pode preparar e recomendar', () => {
    const a = bot({ level: 'EXECUTE_ALLOWED' })

    expect(hasLevel(a, 'PREPARE')).toBe(true)
    expect(hasLevel(a, 'RECOMMEND')).toBe(true)
    expect(hasLevel(a, 'READ')).toBe(true)
    expect(hasLevel(a, 'SUPERVISED_AUTONOMY')).toBe(false)
  })

  it('sem nivel nao alcanca nada', () => {
    const a = humano({ level: null })

    expect(hasLevel(a, 'READ')).toBe(false)
    expect(can(a, 'read', 'catalog')).toEqual({ allowed: false, reason: 'sem_nivel' })
  })
})

describe('o que um humano pode', () => {
  it('owner executa e aprova', () => {
    expect(can(humano(), 'execute', 'finance').allowed).toBe(true)
    expect(can(humano(), 'approve', 'finance').allowed).toBe(true)
  })

  it('viewer so le', () => {
    const a = humano({ level: 'READ', role: 'viewer' })

    expect(can(a, 'read', 'catalog').allowed).toBe(true)
    expect(can(a, 'prepare', 'catalog')).toEqual({ allowed: false, reason: 'nivel_insuficiente' })
    expect(can(a, 'execute', 'catalog')).toEqual({ allowed: false, reason: 'nivel_insuficiente' })
  })

  it('operator prepara mas nao executa', () => {
    const a = humano({ level: 'PREPARE', role: 'operator' })

    expect(can(a, 'prepare', 'sales').allowed).toBe(true)
    expect(can(a, 'execute', 'sales')).toEqual({ allowed: false, reason: 'nivel_insuficiente' })
  })
})

describe('o que um bot NAO pode, mesmo com nivel alto', () => {
  it('nao gerencia atores nem troca papel', () => {
    const a = bot({ level: 'SUPERVISED_AUTONOMY' })

    expect(can(a, 'manage_actor', 'inventory')).toEqual({ allowed: false, reason: 'acao_exige_humano' })
    expect(can(a, 'change_role', 'inventory')).toEqual({ allowed: false, reason: 'acao_exige_humano' })
  })

  it('nao liquida pagamento real', () => {
    const a = bot({ level: 'SUPERVISED_AUTONOMY' })

    expect(can(a, 'settle_real_payment', 'finance')).toEqual({ allowed: false, reason: 'acao_exige_humano' })
  })

  it('nao age fora do escopo declarado', () => {
    const a = bot({ level: 'SUPERVISED_AUTONOMY', scopes: ['inventory'] })

    expect(can(a, 'execute', 'inventory').allowed).toBe(true)
    expect(can(a, 'read', 'finance')).toEqual({ allowed: false, reason: 'fora_do_escopo' })
  })

  it('sem escopo declarado nao age em dominio nenhum', () => {
    const a = bot({ scopes: undefined })

    expect(can(a, 'read', 'inventory')).toEqual({ allowed: false, reason: 'fora_do_escopo' })
  })

  it('mas consulta sem dominio (recurso vazio) segue o nivel', () => {
    const a = bot({ level: 'READ' })

    expect(can(a, 'read', '').allowed).toBe(true)
  })
})

describe('escalada de privilegio', () => {
  it('bot nunca concede nivel', () => {
    expect(canGrantLevel(bot({ level: 'SUPERVISED_AUTONOMY' }), humano({ level: 'READ' }), 'READ')).toEqual({
      allowed: false,
      reason: 'bot_nao_concede'
    })
  })

  it('ninguem concede acima do proprio nivel', () => {
    const manager = humano({ level: 'EXECUTE_ALLOWED', role: 'manager' })

    expect(canGrantLevel(manager, humano({ level: 'READ' }), 'SUPERVISED_AUTONOMY')).toEqual({
      allowed: false,
      reason: 'acima_do_proprio_nivel'
    })
    expect(canGrantLevel(manager, humano({ level: 'READ' }), 'PREPARE').allowed).toBe(true)
  })

  it('quem nao tem o nivel maximo nao concede nada', () => {
    const preparer = humano({ level: 'PREPARE', role: 'operator' })

    expect(canGrantLevel(preparer, humano(), 'READ')).toEqual({ allowed: false, reason: 'nivel_insuficiente' })
  })

  it('bot nao vira owner', () => {
    const alvo = bot({ role: 'owner' })

    expect(canGrantLevel(humano(), alvo, 'SUPERVISED_AUTONOMY')).toEqual({ allowed: false, reason: 'bot_como_owner' })
  })
})

describe('auditoria', () => {
  it('registra permitido e negado com motivo', () => {
    const a = bot({ level: 'READ' })

    const permitido = audit(a, 'read', 'inventory', can(a, 'read', 'inventory'), 1000)
    const negado = audit(a, 'execute', 'inventory', can(a, 'execute', 'inventory'), 2000)

    expect(permitido).toEqual({ action: 'read', actorId: 'b1', allowed: true, at: 1000, reason: '', resource: 'inventory' })
    expect(negado.allowed).toBe(false)
    expect(negado.reason).toBe('nivel_insuficiente')
    expect(negado.actorId).toBe('b1')
  })
})

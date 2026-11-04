import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { buildDomainTools } from './agent-tools-catalog'
import { automationStorePath, AutomationStore, MAX_RUNS_PER_EVENT, normalizeRule, parseAutomation, runRules } from './automation-store'
import type { AutomationRule } from './automation-store'
import type { Actor } from './rbac'

const T0 = 1_700_000_000_000

const bot: Actor = { id: 'b1', kind: 'bot', level: 'EXECUTE_ALLOWED', role: 'bot', scopes: ['inventory'] }
const olho: Actor = { id: 'b0', kind: 'bot', level: 'READ', role: 'bot', scopes: ['inventory'] }

const regra = (over: Partial<AutomationRule> = {}): AutomationRule => ({
  action_args: { kind: 'entrada', product_sku: 'X', quantity_milli: 1000, reason: 'auto' },
  action_name: 'inventory.append',
  active: true,
  actor_id: 'b1',
  created_at: T0,
  id: 'r1',
  name: 'Repor ao vender',
  tenant_id: 'local',
  trigger: 'venda.faturada',
  updated_at: T0,
  ...over
})

function tools() {
  const append = vi.fn(async () => ({ balance: 1000, movement: { id: 'm1' } }))
  const stores = {
    inventory: { append, balances: async () => ({}) }
  } as unknown as Parameters<typeof buildDomainTools>[0]

  return { append, tools: buildDomainTools(stores) }
}

async function withStore<T>(run: (store: AutomationStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-auto-'))

  try {
    return await run(new AutomationStore(automationStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('normalizacao', () => {
  it('exige nome, gatilho, acao e ator', () => {
    expect(normalizeRule({}, 1)).toEqual({ error: 'nome_obrigatorio' })
    expect(normalizeRule({ name: 'x' }, 1)).toEqual({ error: 'gatilho_invalido' })
    expect(normalizeRule({ name: 'x', trigger: 'venda.faturada' }, 1)).toEqual({ error: 'acao_obrigatoria' })
    expect(normalizeRule({ action_name: 'a', name: 'x', trigger: 'venda.faturada' }, 1)).toEqual({
      error: 'ator_obrigatorio'
    })
  })

  it('recusa gatilho fora da lista', () => {
    expect(normalizeRule({ action_name: 'a', actor_id: 'b1', name: 'x', trigger: 'qualquer' }, 1)).toEqual({
      error: 'gatilho_invalido'
    })
  })

  it('nasce ativa, e aceita active:false', () => {
    const a = normalizeRule({ action_name: 'a', actor_id: 'b1', name: 'x', trigger: 'venda.faturada' }, 1)
    const b = normalizeRule({ action_name: 'a', actor_id: 'b1', active: false, name: 'x', trigger: 'venda.faturada' }, 1)

    expect('rule' in a && a.rule.active).toBe(true)
    expect('rule' in b && b.rule.active).toBe(false)
  })

  it('arquivo corrompido vira vazio', () => {
    expect(parseAutomation('nao e json')).toEqual({ rules: [], schema_version: 1 })
  })
})

describe('executor', () => {
  it('roda a acao pelo catalogo, com o ator da regra', async () => {
    const { append, tools: catalogo } = tools()
    const r = await runRules([regra()], 'venda.faturada', {
      actorFor: async () => bot,
      now: T0,
      tenantId: 'local',
      tools: catalogo
    })

    expect(r.runs).toHaveLength(1)
    expect(r.runs[0]!.ok).toBe(true)
    expect(append).toHaveBeenCalledTimes(1)
  })

  it('NAO roda quando o nivel do ator nao permite executar', async () => {
    // A automacao nao e um atalho: READ nao escreve, mesmo que a regra exista.
    const { append, tools: catalogo } = tools()
    const r = await runRules([regra()], 'venda.faturada', {
      actorFor: async () => olho,
      now: T0,
      tenantId: 'local',
      tools: catalogo
    })

    expect(r.runs[0]!.ok).toBe(false)
    expect(r.runs[0]!.error).toBe('sem_permissao')
    expect(append).not.toHaveBeenCalled()
  })

  it('nao roda quando o escopo do ator nao alcanca a acao', async () => {
    const { append, tools: catalogo } = tools()
    const r = await runRules([regra()], 'venda.faturada', {
      actorFor: async () => ({ ...bot, scopes: ['finance'] }),
      now: T0,
      tenantId: 'local',
      tools: catalogo
    })

    expect(r.runs[0]!.ok).toBe(false)
    expect(append).not.toHaveBeenCalled()
  })

  it('ator ausente vira falha da regra, sem derrubar as outras', async () => {
    const { tools: catalogo } = tools()
    const r = await runRules([regra({ actor_id: 'sumiu', id: 'r1' }), regra({ id: 'r2' })], 'venda.faturada', {
      actorFor: async id => (id === 'sumiu' ? null : bot),
      now: T0,
      tenantId: 'local',
      tools: catalogo
    })

    expect(r.runs.map(x => x.ok)).toEqual([false, true])
    expect(r.runs[0]!.error).toBe('ator_ausente')
  })

  it('ignora regra inativa e de outro tenant', async () => {
    const { append, tools: catalogo } = tools()
    const r = await runRules(
      [regra({ active: false }), regra({ id: 'r2', tenant_id: 'outro' }), regra({ id: 'r3', trigger: 'ticket.aberto' })],
      'venda.faturada',
      { actorFor: async () => bot, now: T0, tenantId: 'local', tools: catalogo }
    )

    expect(r.candidatas).toBe(0)
    expect(append).not.toHaveBeenCalled()
  })

  it('teto por disparo corta a rodada e diz que cortou', async () => {
    const { append, tools: catalogo } = tools()
    const muitas = Array.from({ length: MAX_RUNS_PER_EVENT + 5 }, (_, i) => regra({ id: `r${i}`, name: `R${i}` }))

    const r = await runRules(muitas, 'venda.faturada', {
      actorFor: async () => bot,
      now: T0,
      tenantId: 'local',
      tools: catalogo
    })

    expect(r.runs).toHaveLength(MAX_RUNS_PER_EVENT)
    expect(r.interrompido).toBe(true)
    expect(append).toHaveBeenCalledTimes(MAX_RUNS_PER_EVENT)
  })

  it('uma regra aparece UMA vez por disparo, mesmo sendo a mesma acao', async () => {
    const { append, tools: catalogo } = tools()
    const r = await runRules([regra(), regra({ id: 'r2' })], 'venda.faturada', {
      actorFor: async () => bot,
      now: T0,
      tenantId: 'local',
      tools: catalogo
    })

    // Duas regras distintas = duas execucoes. O que nao pode e a MESMA regra duas vezes.
    expect(r.runs.map(x => x.rule_id)).toEqual(['r1', 'r2'])
    expect(append).toHaveBeenCalledTimes(2)
  })
})

describe('store', () => {
  it('cria e lista por tenant', async () => {
    await withStore(async store => {
      const r = await store.create({ action_name: 'inventory.append', actor_id: 'b1', name: 'Repor', trigger: 'venda.faturada' })

      expect('rule' in r).toBe(true)
      expect(await store.list()).toHaveLength(1)
      expect(await store.list('outro')).toHaveLength(0)
    })
  })

  it('recusa nome repetido no mesmo tenant', async () => {
    await withStore(async store => {
      const dados = { action_name: 'inventory.append', actor_id: 'b1', name: 'Repor', trigger: 'venda.faturada' }

      await store.create(dados)
      expect(await store.create(dados)).toEqual({ error: 'regra_duplicada' })
    })
  })

  it('desativar tira a regra da execucao', async () => {
    await withStore(async store => {
      const criada = await store.create({
        action_name: 'inventory.append',
        actor_id: 'b1',
        name: 'Repor',
        trigger: 'venda.faturada'
      })

      if (!('rule' in criada)) return

      await store.setActive(criada.rule.id, false)

      const { append, tools: catalogo } = tools()
      const r = await runRules(await store.list(), 'venda.faturada', {
        actorFor: async () => bot,
        now: T0,
        tenantId: 'local',
        tools: catalogo
      })

      expect(r.candidatas).toBe(0)
      expect(append).not.toHaveBeenCalled()
    })
  })
})

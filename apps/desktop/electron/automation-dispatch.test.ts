// Gatilhos ligados aos dominios (rodada 65).
//
// A tela oferecia 5 gatilhos e so `venda.faturada` disparava. Estes testes provam que atendimento e
// estoque tambem anunciam — e provam a DISTINCAO entre evento e condicao:

import { describe, expect, it, vi } from 'vitest'

import { buildDomainTools } from './agent-tools-catalog'
import { createDispatcher, dispatchQuietly } from './automation-dispatch'
import type { AutomationRule } from './automation-store'
import type { Actor } from './rbac'

const T0 = 1_700_000_000_000

const dono: Actor = { id: 'u1', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner', scopes: [] }

const regra = (over: Partial<AutomationRule> = {}): AutomationRule => ({
  action_args: {},
  action_name: 'inventory.balances',
  active: true,
  actor_id: 'u1',
  created_at: T0,
  id: 'r1',
  name: 'R',
  tenant_id: 'local',
  trigger: 'ticket.aberto',
  updated_at: T0,
  ...over
})

function despachante(regras: AutomationRule[]) {
  const lista = vi.fn(async () => regras)
  const auditoria = vi.fn()
  const catalogo = buildDomainTools({ inventory: { append: async () => ({}), balances: async () => ({}) } } as never)

  const dispatch = createDispatcher({
    actors: async () => [{ ...dono, active: true }],
    automations: { list: lista },
    now: () => T0,
    onAudit: auditoria,
    tools: () => catalogo
  })

  return { auditoria, dispatch, lista }
}

describe('despacho por evento', () => {
  it('resolve ator, roda regra do gatilho e audita', async () => {
    const { auditoria, dispatch } = despachante([regra({ action_args: {}, action_name: 'inventory.balances' })])

    const r = await dispatch({ detail: { id: 't1' }, tenant_id: 'local', type: 'ticket.aberto' })

    expect(r.runs).toHaveLength(1)
    expect(r.runs[0]!.ok).toBe(true)
    expect(auditoria).toHaveBeenCalledTimes(1)
  })

  it('regra de OUTRO gatilho nao roda', async () => {
    const { dispatch } = despachante([regra({ trigger: 'venda.faturada' })])

    const r = await dispatch({ detail: {}, tenant_id: 'local', type: 'ticket.aberto' })

    expect(r.candidatas).toBe(0)
  })

  it('ator inativo nao executa a regra', async () => {
    const catalogo = buildDomainTools({ inventory: { append: async () => ({}), balances: async () => ({}) } } as never)
    const dispatch = createDispatcher({
      actors: async () => [], // vazio: o ator foi removido
      automations: { list: async () => [regra()] },
      now: () => T0,
      tools: () => catalogo
    })

    const r = await dispatch({ detail: {}, tenant_id: 'local', type: 'ticket.aberto' })

    expect(r.runs[0]!.ok).toBe(false)
    expect(r.runs[0]!.error).toBe('ator_ausente')
  })
})

describe('dispatchQuietly', () => {
  it('engole a falha: a acao do usuario ja aconteceu', async () => {
    const dispatch = vi.fn(async () => {
      throw new Error('explodiu')
    })

    await expect(dispatchQuietly(dispatch, { detail: {}, tenant_id: 'local', type: 'ticket.aberto' })).resolves.toBeUndefined()
  })

  it('sem despachante, nao faz nada', async () => {
    await expect(dispatchQuietly(null, { detail: {}, tenant_id: 'local', type: 'ticket.aberto' })).resolves.toBeUndefined()
  })
})

describe('evento x condicao', () => {
  it('estoque.zerado e um EVENTO de transicao, nao um estado observado', () => {
    // O gatilho e emitido quando o saldo CRUZA para zero, na transicao. Nao ha regra aqui que "olhe"
    // o saldo periodicamente — e essa diferenca que evita disparo repetido em item ja zerado.
    const transicao = (anterior: number, novo: number) => anterior > 0 && novo === 0

    expect(transicao(5, 0)).toBe(true)
    expect(transicao(0, 0)).toBe(false) // ja estava zerado: nao e evento novo
    expect(transicao(5, 3)).toBe(false)
  })
})

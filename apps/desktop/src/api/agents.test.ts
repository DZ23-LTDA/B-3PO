// Contrato do cliente de agentes (rodada 147).
//
// O QUE ESTE TESTE PROTEGE
//
// A r99 usou `window.hermes` quando o preload expõe `window.hermesDesktop`, e o typecheck passou porque havia um
// cast. A r127 declarou um nível `block` que a ponte não tinha, e a tela renderizou nada. Os dois defeitos
// tiveram a mesma forma: **o tipo dizia uma coisa e a ponte fazia outra**.
//
// Este teste confere o CONTRATO: com uma ponte na forma que o preload expõe, o cliente acha e chama.

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  agentsAvailable,
  cancelarExecucao,
  decidirAprovacao,
  erroDeAprovacao,
  listarAgentes,
  listarAprovacoes,
  listarExecucoes
} from './agents'

const globalAny = globalThis as unknown as { window?: Record<string, unknown> }

function comPonte(agents: Record<string, unknown>) {
  globalAny.window = { hermesDesktop: { agents } }
}

afterEach(() => {
  delete globalAny.window
})

describe('agentsAvailable', () => {
  it('sem window, esconde', () => {
    expect(agentsAvailable()).toBe(false)
  })

  it('com window mas sem hermesDesktop, esconde', () => {
    globalAny.window = {}
    expect(agentsAvailable()).toBe(false)
  })

  it('com hermesDesktop.agents na forma do preload, mostra', () => {
    comPonte({ approvals: vi.fn(), roster: vi.fn() })
    expect(agentsAvailable()).toBe(true)
  })

  it('NAO procura em window.hermes (defeito da r99)', () => {
    globalAny.window = { hermes: { agents: { approvals: vi.fn(), roster: vi.fn() } } }
    expect(agentsAvailable()).toBe(false)
  })
})

describe('forma plana (defeito da r127)', () => {
  it('chama roster direto no grupo agents, sem nivel intermediario', async () => {
    const roster = vi.fn().mockResolvedValue({ agentes: [{ id: 'finance' }] })

    comPonte({ approvals: vi.fn(), roster })
    await listarAgentes()

    expect(roster).toHaveBeenCalledTimes(1)
  })

  it('NAO procura agents.agent.roster', async () => {
    // A r127 declarou um nivel `block` que a ponte nao tinha e a tela mostrou nada, com tipo valido.
    const interno = vi.fn()

    comPonte({ approvals: vi.fn(), roster: undefined })
    globalAny.window = { hermesDesktop: { agents: { agent: { roster: interno } } } }
    await listarAgentes()

    expect(interno).not.toHaveBeenCalled()
  })
})

describe('chamadas', () => {
  it('listarAgentes devolve a lista', async () => {
    comPonte({ roster: vi.fn().mockResolvedValue({ agentes: [{ id: 'sales' }] }) })
    await expect(listarAgentes()).resolves.toHaveLength(1)
  })

  it('listarExecucoes passa o filtro', async () => {
    const executions = vi.fn().mockResolvedValue([])

    comPonte({ executions, roster: vi.fn() })
    await listarExecucoes({ owner: 'finance' })

    expect(executions).toHaveBeenCalledWith({ owner: 'finance' })
  })

  it('listarAprovacoes passa o status', async () => {
    const approvals = vi.fn().mockResolvedValue([])

    comPonte({ approvals, roster: vi.fn() })
    await listarAprovacoes('pendente')

    expect(approvals).toHaveBeenCalledWith('pendente')
  })

  it('decidirAprovacao repassa o payload', async () => {
    const decide = vi.fn().mockResolvedValue({ ok: true })

    comPonte({ decide, roster: vi.fn() })
    await expect(decidirAprovacao({ decidir: 'aprovar', id: 'a1', quem: 'leandro' })).resolves.toEqual({ ok: true })
    expect(decide).toHaveBeenCalledWith({ decidir: 'aprovar', id: 'a1', quem: 'leandro' })
  })

  it('cancelarExecucao repassa o id', async () => {
    const cancelExecution = vi.fn().mockResolvedValue({ ok: true })

    comPonte({ cancelExecution, roster: vi.fn() })
    await cancelarExecucao('e1')

    expect(cancelExecution).toHaveBeenCalledWith('e1')
  })

  it('erro na ponte nao estoura para a tela', async () => {
    comPonte({ roster: vi.fn().mockRejectedValue(new Error('boom')) })
    await expect(listarAgentes()).resolves.toEqual([])
  })

  it('sem ponte devolve lista vazia em vez de estourar', async () => {
    await expect(listarAgentes()).resolves.toEqual([])
    await expect(listarExecucoes()).resolves.toEqual([])
    await expect(listarAprovacoes()).resolves.toEqual([])
  })
})

describe('erroDeAprovacao', () => {
  it('traduz os motivos conhecidos', () => {
    expect(erroDeAprovacao('mesmo_autor')).toContain('pediu')
    expect(erroDeAprovacao('ja_decidida')).toContain('decidida')
    expect(erroDeAprovacao('nao_encontrada')).toContain('não encontrada')
  })

  it('motivo desconhecido tem texto generico, nao o codigo', () => {
    const texto = erroDeAprovacao('qualquer_coisa')

    expect(texto).not.toContain('_')
    expect(texto.length).toBeGreaterThan(10)
  })
})

// Guarda de permissão nos canais de automação (r5 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// Uma regra ativa EXECUTA ações em nome do usuário sem ninguém olhando. Criar ou ativar uma regra não é
// configuração de tela — é delegar poder de ação a um disparo automático.
//
// Com os canais abertos, qualquer renderer podia montar uma regra que dispara `execute` no financeiro e
// ligá-la sem que existisse um responsável. O inventário da r2 mediu seis canais abertos aqui.
//
// A DISTINÇÃO QUE IMPORTA
//
//   list / triggers / tools   → `read`      ver o que existe
//   sweep                     → `execute`   disparar agora
//   create / setActive        → `execute`   armar / desarmar
//
// `setActive` é o caso menos óbvio e o mais importante: ativar uma regra parada é *armar*. Tratar como
// `read` deixaria alguém com nível de leitura armar um disparo de execução.

import { describe, expect, it } from 'vitest'

import { registerAutomationIpc, type AutomationDeps } from './automation-ipc'
import type { Actor } from './rbac'

type Handler = (event: unknown, arg: unknown) => Promise<unknown>

const DONO: Actor = { id: 'ator-dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }

function negado(resposta: unknown): boolean {
  return typeof resposta === 'object' && resposta !== null && (resposta as { error?: string }).error === 'sem_permissao'
}

/** Store espião: conta criações, ativações e varreduras. */
function montar(actor: Actor | null): {
  handlers: Map<string, Handler>
  criadas: () => number
  ativadas: () => number
  varreduras: () => number
} {
  const handlers = new Map<string, Handler>()
  let criadas = 0
  let ativadas = 0
  let varreduras = 0

  const automations = {
    list: async () => [],
    create: async (raw: unknown) => {
      criadas++
      return { rule: { id: 'regra-1', raw } }
    },
    setActive: async (id: string, active: boolean) => {
      ativadas++
      return { rule: { active, id } }
    }
  } as unknown as AutomationDeps['automations']

  const tools = [{ action: 'execute', description: 'lancar', domain: 'finance', name: 'finance.lancar' }] as unknown as AutomationDeps['tools']

  registerAutomationIpc(
    { handle: (canal: string, handler: Handler) => void handlers.set(canal, handler) } as never,
    {
      actorOf: async () => actor,
      automations,
      sweep: async () => {
        varreduras++
      },
      tools
    }
  )

  return { ativadas: () => ativadas, criadas: () => criadas, handlers, varreduras: () => varreduras }
}

describe('canais de automação exigem ator', () => {
  it('os seis canais são registrados', () => {
    const { handlers } = montar(DONO)

    expect([...handlers.keys()].sort()).toEqual([
      'hermes:automations:create',
      'hermes:automations:list',
      'hermes:automations:setActive',
      'hermes:automations:sweep',
      'hermes:automations:tools',
      'hermes:automations:triggers'
    ])
  })

  it('sem ator, os seis recusam com sem_permissao', async () => {
    const { handlers } = montar(null)

    for (const canal of [
      'hermes:automations:list',
      'hermes:automations:triggers',
      'hermes:automations:tools',
      'hermes:automations:sweep',
      'hermes:automations:create',
      'hermes:automations:setActive'
    ]) {
      const resposta = await handlers.get(canal)!(null, { active: true, id: 'r1', trigger: 'estoque.zerado' })

      expect(negado(resposta), `${canal} deveria recusar sem ator`).toBe(true)
    }
  })

  it('sem ator, NENHUMA regra e criada', async () => {
    const { criadas, handlers } = montar(null)

    await handlers.get('hermes:automations:create')!(null, { action: 'execute', trigger: 'estoque.zerado' })

    expect(criadas()).toBe(0)
  })

  it('sem ator, NENHUMA regra e ativada', async () => {
    const { ativadas, handlers } = montar(null)

    await handlers.get('hermes:automations:setActive')!(null, { active: true, id: 'r1' })

    expect(ativadas()).toBe(0)
  })

  it('sem ator, a varredura NAO dispara acao nenhuma', async () => {
    const { handlers, varreduras } = montar(null)

    await handlers.get('hermes:automations:sweep')!(null, undefined)

    expect(varreduras()).toBe(0)
  })

  it('sem ator, a recusa acontece ANTES de validar o payload', async () => {
    const { handlers } = montar(null)

    // gatilho inválido: se a validação rodasse primeiro, a resposta seria `gatilho_invalido`.
    const resposta = await handlers.get('hermes:automations:create')!(null, { trigger: 'nao_existe' })

    expect(negado(resposta)).toBe(true)
  })

  it('com ator, a validacao do payload volta a valer', async () => {
    const { handlers } = montar(DONO)

    expect(await handlers.get('hermes:automations:create')!(null, { trigger: 'nao_existe' })).toEqual({
      error: 'gatilho_invalido'
    })
    expect(await handlers.get('hermes:automations:setActive')!(null, { id: '' })).toEqual({ error: 'estado_invalido' })
  })

  it('com ator, criar e ativar chegam ao store', async () => {
    const { ativadas, criadas, handlers } = montar(DONO)

    await handlers.get('hermes:automations:create')!(null, { action: 'execute', trigger: 'estoque.zerado' })
    await handlers.get('hermes:automations:setActive')!(null, { active: true, id: 'r1' })

    expect(criadas()).toBe(1)
    expect(ativadas()).toBe(1)
  })
})

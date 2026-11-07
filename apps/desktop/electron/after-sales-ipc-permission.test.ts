// Guarda de permissão nos canais de pós-venda (r7 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE — E O QUE ELE PROVA
//
// Este é o único caso do inventário em que a dependência JÁ EXISTIA e não era usada. `AfterSalesDeps`
// declarava `actorOf`, o resolvedor era passado na montagem, e nenhum dos quatro handlers chamava
// `exigirAtor`.
//
// **O código parecia protegido.** Quem lesse a interface veria `actorOf` e assumiria que ele é consultado.
//
// É por isso que o ratchet procura `exigirAtor` no texto, não `actorOf`: a presença do resolvedor não
// prova que ele é chamado. Se o ratchet olhasse `actorOf`, este arquivo teria passado desde a primeira
// medição.

import { describe, expect, it } from 'vitest'

import { registerAfterSalesIpc, type AfterSalesDeps } from './after-sales-ipc'
import type { Actor } from './rbac'

type Handler = (event: unknown, arg: unknown) => Promise<unknown>

const DONO: Actor = { id: 'ator-dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }

function negado(resposta: unknown): boolean {
  return typeof resposta === 'object' && resposta !== null && (resposta as { error?: string }).error === 'sem_permissao'
}

function montar(actor: Actor | null): {
  handlers: Map<string, Handler>
  criados: () => number
  statusMudados: () => number
} {
  const handlers = new Map<string, Handler>()
  let criados = 0
  let statusMudados = 0

  const afterSales = {
    list: async () => [],
    listAll: async () => [],
    create: async (raw: unknown) => {
      criados++
      return { followUp: { id: 'f1', raw } }
    },
    setStatus: async (id: string, status: string) => {
      statusMudados++
      return { followUp: { id, status } }
    }
  } as unknown as AfterSalesDeps['afterSales']

  registerAfterSalesIpc(
    { handle: (canal: string, handler: Handler) => void handlers.set(canal, handler) } as never,
    {
      actorOf: async () => actor,
      afterSales,
      sales: { list: async () => [] }
    }
  )

  return { criados: () => criados, handlers, statusMudados: () => statusMudados }
}

describe('canais de pós-venda exigem ator', () => {
  it('os quatro canais são registrados', () => {
    const { handlers } = montar(DONO)

    expect([...handlers.keys()].sort()).toEqual([
      'hermes:aftersales:create',
      'hermes:aftersales:indicators',
      'hermes:aftersales:list',
      'hermes:aftersales:setStatus'
    ])
  })

  it('sem ator, os quatro recusam com sem_permissao', async () => {
    const { handlers } = montar(null)

    for (const canal of [
      'hermes:aftersales:list',
      'hermes:aftersales:indicators',
      'hermes:aftersales:create',
      'hermes:aftersales:setStatus'
    ]) {
      const resposta = await handlers.get(canal)!(null, { id: 'f1', kind: 'satisfacao', status: 'feito' })

      expect(negado(resposta), `${canal} deveria recusar sem ator`).toBe(true)
    }
  })

  it('sem ator, NAO cria acompanhamento nem muda status', async () => {
    const { criados, handlers, statusMudados } = montar(null)

    await handlers.get('hermes:aftersales:create')!(null, { kind: 'satisfacao' })
    await handlers.get('hermes:aftersales:setStatus')!(null, { id: 'f1', status: 'feito' })

    expect(criados()).toBe(0)
    expect(statusMudados()).toBe(0)
  })

  it('sem ator, a recusa acontece ANTES de validar o payload', async () => {
    const { handlers } = montar(null)

    const resposta = await handlers.get('hermes:aftersales:create')!(null, { kind: 'nao_existe' })

    expect(negado(resposta)).toBe(true)
  })

  it('com ator, a validacao de tipo e status volta a valer', async () => {
    const { handlers } = montar(DONO)

    expect(await handlers.get('hermes:aftersales:create')!(null, { kind: 'nao_existe' })).toEqual({
      error: 'tipo_invalido'
    })
    expect(await handlers.get('hermes:aftersales:setStatus')!(null, { id: 'f1', status: 'inventado' })).toEqual({
      error: 'status_invalido'
    })
  })

  it('com ator, criar e mudar status chegam ao store', async () => {
    const { criados, handlers, statusMudados } = montar(DONO)

    await handlers.get('hermes:aftersales:create')!(null, { kind: 'satisfacao' })
    await handlers.get('hermes:aftersales:setStatus')!(null, { id: 'f1', status: 'feito' })

    expect(criados()).toBe(1)
    expect(statusMudados()).toBe(1)
  })
})

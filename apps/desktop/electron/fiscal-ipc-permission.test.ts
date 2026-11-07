// Guarda de permissão nos canais fiscais (r4 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// O inventário da r2 mediu 219 canais e 1 com guarda. `fiscal-ipc.ts` tinha quatro abertos — e dois deles
// produzem efeito legal: `emitir` cria documento fiscal, `cancelar` o desfaz perante o fisco.
//
// Não é leitura de dado de negócio. Um canal que emite nota em nome da empresa sem exigir ator não é
// "cobertura incompleta": é a empresa respondendo por um documento que ninguém autorizou.
//
// O CONTRATO (o mesmo das rodadas 215–225 e da r3)
//
//   1. `exigirAtor` no handler
//   2. `deps.actorOf` obrigatório na assinatura
//   3. testes que provam recusa sem ator, recusa antes da validação, e que nada é emitido

import { describe, expect, it } from 'vitest'

import { registerFiscalIpc, type FiscalDeps } from './fiscal-ipc'
import type { Actor } from './rbac'

type Handler = (event: unknown, arg: unknown) => Promise<unknown>

const DONO: Actor = { id: 'ator-dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }

function negado(resposta: unknown): boolean {
  return typeof resposta === 'object' && resposta !== null && (resposta as { error?: string }).error === 'sem_permissao'
}

/**
 * Monta os canais com um store espião.
 *
 * O espião conta emissões e cancelamentos: a prova mais forte não é "respondeu erro", é
 * **nada foi escrito**.
 */
function montar(actor: Actor | null): { handlers: Map<string, Handler>; emitidos: () => number; cancelados: () => number } {
  const handlers = new Map<string, Handler>()
  let emitidos = 0
  let cancelados = 0

  const store = {
    list: async () => [],
    emitir: async () => {
      emitidos++
      return { document: { id: 'doc-1' } }
    },
    cancelar: async () => {
      cancelados++
      return { document: { id: 'doc-1' } }
    }
  } as unknown as FiscalDeps['store']

  const provider = { homologado: true, id: 'sandbox', nome: 'Sandbox' } as unknown as NonNullable<FiscalDeps['provider']>

  registerFiscalIpc(
    { handle: (canal: string, handler: Handler) => void handlers.set(canal, handler) } as never,
    { actorOf: async () => actor, provider, store }
  )

  return { handlers, emitidos: () => emitidos, cancelados: () => cancelados }
}

describe('canais fiscais exigem ator', () => {
  it('os quatro canais são registrados', () => {
    const { handlers } = montar(DONO)

    expect([...handlers.keys()].sort()).toEqual([
      'hermes:fiscal:cancelar',
      'hermes:fiscal:emitir',
      'hermes:fiscal:list',
      'hermes:fiscal:status'
    ])
  })

  it('sem ator, os quatro recusam com sem_permissao', async () => {
    const { handlers } = montar(null)

    for (const canal of ['hermes:fiscal:list', 'hermes:fiscal:status', 'hermes:fiscal:emitir', 'hermes:fiscal:cancelar']) {
      const resposta = await handlers.get(canal)!(null, { motivo: 'erro', sale_id: 'v1', tenant_id: 't1' })

      expect(negado(resposta), `${canal} deveria recusar sem ator`).toBe(true)
    }
  })

  it('sem ator, NAO emite nota — o store nem e chamado', async () => {
    const { handlers, emitidos } = montar(null)

    await handlers.get('hermes:fiscal:emitir')!(null, { sale_id: 'v1', tenant_id: 't1' })

    expect(emitidos()).toBe(0)
  })

  it('sem ator, NAO cancela nota — o store nem e chamado', async () => {
    const { handlers, cancelados } = montar(null)

    await handlers.get('hermes:fiscal:cancelar')!(null, { motivo: 'erro', sale_id: 'v1', tenant_id: 't1' })

    expect(cancelados()).toBe(0)
  })

  it('sem ator, a recusa acontece ANTES de validar o payload', async () => {
    const { handlers } = montar(null)

    // payload inválido: se a validação rodasse primeiro, a resposta seria `pedido_invalido`.
    const resposta = await handlers.get('hermes:fiscal:emitir')!(null, null)

    expect(negado(resposta)).toBe(true)
  })

  it('com ator, a validacao do payload volta a valer', async () => {
    const { handlers } = montar(DONO)

    expect(await handlers.get('hermes:fiscal:emitir')!(null, {})).toEqual({ error: 'venda_obrigatoria' })
    expect(await handlers.get('hermes:fiscal:cancelar')!(null, { sale_id: 'v1' })).toEqual({ error: 'motivo_obrigatorio' })
  })

  it('com ator, emitir chega ao store', async () => {
    const { handlers, emitidos } = montar(DONO)

    const resposta = await handlers.get('hermes:fiscal:emitir')!(null, { sale_id: 'v1', tenant_id: 't1' })

    expect(emitidos()).toBe(1)
    expect(resposta).toEqual({ document: { id: 'doc-1' } })
  })
})

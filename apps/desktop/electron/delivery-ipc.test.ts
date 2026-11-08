// Os canais da logística (r58 do GOAL V2).
//
// A entrega tem regra (r56) e disco (r57). Estes testes provam que a regra **atravessa o canal** — e,
// principalmente, que o que vem do renderer não decide quem recebeu.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DeliveryStore, deliveryStorePath } from './delivery-store'
import { registerDeliveryIpc } from './delivery-ipc'
import type { Actor } from './rbac'

let dir = ''
let store: DeliveryStore
let mapa: Map<string, (e: unknown, p: unknown) => Promise<unknown>>

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-ent-ipc-'))
  store = new DeliveryStore(deliveryStorePath(dir))
  mapa = new Map()

  registerDeliveryIpc(
    { handle: (c: string, l: (e: unknown, p: unknown) => Promise<unknown>) => mapa.set(c, l) } as never,
    { actorOf: async () => DONO, store }
  )
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const chamar = async (canal: string, payload?: unknown): Promise<Record<string, unknown>> =>
  (await mapa.get(canal)?.(null, payload)) as Record<string, unknown>

describe('os canais', () => {
  it('registra exatamente quatro', () => {
    expect([...mapa.keys()].sort()).toEqual([
      'hermes:logistica:criar',
      'hermes:logistica:entregas',
      'hermes:logistica:porPedido',
      'hermes:logistica:transitar'
    ])
  })

  it('criar e listar', async () => {
    const criada = await chamar('hermes:logistica:criar', { destino: 'Rua A', order_id: 'v1' })

    expect(criada['error']).toBeUndefined()
    expect((await chamar('hermes:logistica:entregas'))['entregas']).toHaveLength(1)
  })

  it('porPedido responde null quando não há — "não tem entrega" é resposta, não falha', async () => {
    expect(await chamar('hermes:logistica:porPedido', 'venda-sem')).toMatchObject({ entrega: null })
  })
})

describe('quem recebeu não vem do renderer', () => {
  it('em_rota sem recebedor no payload assume o ator (o despachante)', async () => {
    const criada = await chamar('hermes:logistica:criar', { destino: 'X', order_id: 'v1' })
    const id = (criada['entrega'] as { id: string }).id

    const r = await chamar('hermes:logistica:transitar', { id, status: 'em_rota' })

    expect((r['entrega'] as { entregador: string }).entregador).toBe('dono')
  })

  it('entregue SEM recebedor é recusado — assumir o operador registraria a pessoa errada', async () => {
    const criada = await chamar('hermes:logistica:criar', { destino: 'X', order_id: 'v1' })
    const id = (criada['entrega'] as { id: string }).id

    await chamar('hermes:logistica:transitar', { id, status: 'em_rota' })

    // A tentação seria cair no ator aqui também. Seria registrar o operador como quem RECEBEU — e o
    // comprovante existe justamente para ser prova contra a alegação de que ninguém recebeu.
    expect(await chamar('hermes:logistica:transitar', { id, status: 'entregue' })).toMatchObject({
      error: 'comprovante_obrigatorio'
    })
  })

  it('entregue COM recebedor no payload grava aquele nome', async () => {
    const criada = await chamar('hermes:logistica:criar', { destino: 'X', order_id: 'v1' })
    const id = (criada['entrega'] as { id: string }).id

    await chamar('hermes:logistica:transitar', { id, status: 'em_rota' })

    const r = await chamar('hermes:logistica:transitar', { id, recebedor: 'maria', status: 'entregue' })

    expect((r['entrega'] as { comprovante: { recebedor: string } }).comprovante.recebedor).toBe('maria')
  })
})

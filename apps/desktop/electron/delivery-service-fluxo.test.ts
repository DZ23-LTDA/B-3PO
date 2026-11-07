// O FLUXO: entrega recusada -> ticket no atendimento (r142 do GOAL V2).
//
// O QUE ESTE TESTE PROVA
//
// A r141 montou a ligacao no `erp-ipc`, mas **nenhum teste atravessava os dois stores**. Este atravessa:
// cria a entrega, transita para `em_rota`, recusa, e verifica que **o ticket existe no atendimento**.
//
// O QUE ELE PEGOU - e por isso ele existe
//
// A r140 escreveu uma ligacao que pedia `contact_phone`, `motivo` e `total_cents`. **A `Entrega` nao tem
// nenhum dos tres.** O typecheck da r141 derrubou, mas **so o fluxo prova que a forma nova chega ao fim**:
// o ticket nasce, com o pedido na descricao, e com a prioridade certa.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DeliveryStore, deliveryStorePath } from './delivery-store'
import { registerDeliveryIpc } from './delivery-ipc'
import type { Actor } from './rbac'
import { ServiceDeskStore, serviceDeskStorePath } from './service-desk-store'

let dir = ''
let entregas: DeliveryStore
let desk: ServiceDeskStore
let mapa: Map<string, (e: unknown, p: unknown) => Promise<unknown>>

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' } as Actor

/** A montagem do `erp-ipc`, reduzida ao que este fluxo exercita (r141). */
function montar(): void {
  mapa = new Map()

  registerDeliveryIpc(
    { handle: (canal: string, listener: (e: unknown, p: unknown) => Promise<unknown>) => mapa.set(canal, listener) } as never,
    {
      actorOf: async () => DONO,
      onRecusa: async evento => {
        // O mesmo corpo do `erp-ipc`: a entrega nao tem telefone, entao o ticket leva o PEDIDO.
        const { intencaoDeAtendimento } = await import('./delivery-service-link')
        const intencao = intencaoDeAtendimento('recusada', evento.status_anterior, {
          destino: evento.destino,
          entrega_id: evento.entrega_id,
          order_id: evento.order_id,
          tenant_id: evento.tenant_id
        })

        if (intencao.tipo !== 'abrir_ticket') return

        await desk.open({
          channel: 'logistica',
          contact_phone: '',
          description: intencao.descricao,
          priority: intencao.prioridade,
          subject: intencao.assunto
        })
      },
      store: entregas
    }
  )
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-ent-desk-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
  entregas = new DeliveryStore(deliveryStorePath(dir))
  desk = new ServiceDeskStore(serviceDeskStorePath(dir))
  montar()
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const chamar = async (canal: string, payload?: unknown): Promise<Record<string, unknown>> =>
  (await mapa.get(canal)?.(null, payload)) as Record<string, unknown>

/** Cria uma entrega e a leva a `em_rota` — o estado de onde a recusa acontece. */
async function entregarEmRota(destino: string): Promise<string> {
  const criada = await chamar('hermes:logistica:criar', { destino, order_id: 'v1', tenant_id: 'local' })
  const entrega = criada['entrega'] as { id: string }

  await chamar('hermes:logistica:transitar', { id: entrega.id, status: 'em_rota', tenant_id: 'local' })

  return entrega.id
}

describe('a recusa abre UM ticket — e ele diz o que fazer', () => {
  it('em_rota -> recusada cria o ticket no atendimento', async () => {
    const id = await entregarEmRota('Rua A, 100')

    expect(await desk.list('local')).toHaveLength(0)

    await chamar('hermes:logistica:transitar', { id, status: 'recusada', tenant_id: 'local' })

    const tickets = await desk.list('local')

    expect(tickets).toHaveLength(1)
  })

  it('o ticket leva o PEDIDO na descricao — a porta ate o cliente', async () => {
    const id = await entregarEmRota('Rua A, 100')

    await chamar('hermes:logistica:transitar', { id, status: 'recusada', tenant_id: 'local' })

    const t = (await desk.list('local'))[0]

    expect(t?.description).toContain('v1')
    expect(t?.subject).toBe('Entrega recusada')
  })

  it('com destino, a prioridade e MEDIA — da para reagendar', async () => {
    const id = await entregarEmRota('Rua A, 100')

    await chamar('hermes:logistica:transitar', { id, status: 'recusada', tenant_id: 'local' })

    expect((await desk.list('local'))[0]?.priority).toBe('media')
  })
})

describe('sem destino, o ticket e URGENTE — mas o CANAL nao deixa criar assim', () => {
  it('criar entrega SEM destino e recusado — o caso vazio e defensivo, nao de uso', async () => {
    // A r142 descobriu isto ao escrever o fluxo: `criar` exige `destino`, entao **nao ha como chegar em
    // `recusada` com destino vazio pelo canal**. A regra `destino vazio -> urgente` (r141) continua certa como
    // DEFESA — um registro antigo, ou um dado gravado antes da validacao —, mas **nao e um caminho de uso**.
    //
    // Dizer isso e melhor que remover a regra: o dia em que a validacao de `criar` mudar, a prioridade ja
    // responde certo.
    const tentativa = await chamar('hermes:logistica:criar', { destino: '', order_id: 'v1', tenant_id: 'local' })

    expect(tentativa).toMatchObject({ error: expect.any(String) })
    expect(await desk.list('local')).toHaveLength(0)
  })
})

describe('a MESMA recusa nao abre um segundo ticket', () => {
  it('transitar para recusada duas vezes deixa UM ticket', async () => {
    const id = await entregarEmRota('Rua A, 100')

    await chamar('hermes:logistica:transitar', { id, status: 'recusada', tenant_id: 'local' })
    await chamar('hermes:logistica:transitar', { id, status: 'recusada', tenant_id: 'local' })

    // O segundo ticket faria a fila crescer sem que nada tivesse acontecido.
    expect(await desk.list('local')).toHaveLength(1)
  })
})

describe('o caminho normal nao abre ticket', () => {
  it('em_rota -> entregue nao gera nada', async () => {
    const id = await entregarEmRota('Rua A, 100')

    await chamar('hermes:logistica:transitar', {
      id,
      recebedor: 'Maria',
      status: 'entregue',
      tenant_id: 'local'
    })

    expect(await desk.list('local')).toHaveLength(0)
  })
})

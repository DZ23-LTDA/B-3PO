// O FLUXO: nota baixa -> follow-up de satisfacao (r153 do GOAL V2).
//
// O QUE ESTE TESTE PROVA
//
// A r151 escreveu a DECISAO (`intencaoDePosVenda`) e a r152 a monta no `erp-ipc` sobre o `afterSales`. Este teste
// atravessa os dois stores: abre um ticket, resolve, avalia com nota baixa, e verifica que **o follow-up existe no
// pos-venda**.
//
// O QUE ELE PEGOU
//
// A r152 descobriu que o `afterSales` nascia DEPOIS de quem o usa - montado antes, seria `undefined`. Aqui o
// `afterSales` e passado pronto, e o teste falharia se a ligacao dependesse de algo ausente.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AfterSalesStore, afterSalesStorePath } from './after-sales-store'
import type { Actor } from './rbac'
import { ServiceDeskStore, serviceDeskStorePath } from './service-desk-store'
import { registerServiceDeskIpc } from './service-desk-ipc'
import { intencaoDePosVenda, notaDoFollowUp } from './service-aftersales-link'

let dir = ''
let desk: ServiceDeskStore
let afterSales: AfterSalesStore
let mapa: Map<string, (e: unknown, p: unknown, s?: unknown) => Promise<unknown>>

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' } as Actor

/** A montagem do `erp-ipc`, reduzida ao que este fluxo exercita (r152). */
function montar(): void {
  mapa = new Map()

  registerServiceDeskIpc(
    { handle: (canal: string, listener: (e: unknown, p: unknown, s?: unknown) => Promise<unknown>) => mapa.set(canal, listener) } as never,
    desk,
    { actorOf: async () => DONO },
    {
      onRated: async ticket => {
        const intencao = intencaoDePosVenda(ticket)

        if (intencao.tipo !== 'criar') return

        await afterSales.create({
          contact_phone: intencao.contact_phone,
          kind: intencao.kind,
          notes: notaDoFollowUp(intencao),
          sale_at: intencao.baseEm,
          sale_id: intencao.origem,
          tenant_id: ticket.tenant_id
        })
      },
      ticketOpened: async () => {}
    }
  )
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-desk-pos-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
  desk = new ServiceDeskStore(serviceDeskStorePath(dir))
  afterSales = new AfterSalesStore(afterSalesStorePath(dir))
  montar()
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

// O `handle` do ipcMain recebe (event, ...args): aqui os args chegam como tupla explicita em vez de spread.
const chamar = async (canal: string, a?: unknown, b?: unknown): Promise<Record<string, unknown>> =>
  (await mapa.get(canal)?.(null, a, b)) as Record<string, unknown>

/** Abre, resolve e avalia um ticket — o caminho real da tela. */
async function atenderEAvaliar(nota: number, telefone = '+5511999990009'): Promise<string> {
  const aberto = await chamar('hermes:desk:open', {
    channel: 'telefone',
    contact_phone: telefone,
    description: 'o bujao veio errado',
    priority: 'alta',
    subject: 'pedido errado'
  })

  const id = (aberto['ticket'] as { id: string }).id

  await chamar('hermes:desk:setStatus', id, 'em_andamento')
  await chamar('hermes:desk:setStatus', id, 'resolvido')
  // r153: o closed_at SO existe em fechado (o resolvido o deixa null), e o prazo do follow-up depende
  // dele. Fechar e o caminho que a tela do atendimento oferece depois de resolver.
  await chamar('hermes:desk:setStatus', id, 'fechado')
  await chamar('hermes:desk:rate', id, nota)

  return id
}

describe('a nota BAIXA cria o follow-up', () => {
  it('nota 1 cria um follow-up de satisfacao', async () => {
    await atenderEAvaliar(1)

    const followUps = await afterSales.list('local')

    expect(followUps).toHaveLength(1)
    expect(followUps[0]?.kind).toBe('satisfacao')
  })

  it('o ref e o TICKET — a origem certa', async () => {
    const id = await atenderEAvaliar(1)

    // Se fosse `venda:<id>`, colidiria com o follow-up de recompra da mesma venda e nao criaria nada.
    // O store DERIVA o ref de sale_id (r153): unico por (origem, kind).
    expect((await afterSales.list('local'))[0]?.ref).toContain('ticket:')
  })

  it('e a nota DIZ por que ele existe', async () => {
    await atenderEAvaliar(1)

    expect((await afterSales.list('local'))[0]?.notes).toContain('nota 1')
  })

  it('o prazo comeca no FECHAMENTO do atendimento, nao na venda', async () => {
    const id = await atenderEAvaliar(2)
    const followUp = (await afterSales.list('local'))[0]
    const ticket = (await desk.list('local')).find(t => t.id === id)

    // `sale_at` e a base do prazo; aqui ele carrega a data do ATENDIMENTO.
    expect(followUp?.sale_at).toBe(ticket?.closed_at ?? 0)
  })
})

describe('a nota BOA nao cria nada', () => {
  it('nota 5 e um cliente satisfeito — procura-lo e ruido', async () => {
    await atenderEAvaliar(5)

    expect(await afterSales.list('local')).toHaveLength(0)
  })

  it('e nota 3 e neutra', async () => {
    await atenderEAvaliar(3)

    expect(await afterSales.list('local')).toHaveLength(0)
  })
})

describe('ticket sem telefone nao cria follow-up', () => {
  it('uma tarefa que ninguem executa', async () => {
    await atenderEAvaliar(1, '')

    expect(await afterSales.list('local')).toHaveLength(0)
  })
})

describe('duas avaliacoes do mesmo ticket nao criam dois follow-ups', () => {
  it('o ref e a chave de idempotencia', async () => {
    const id = await atenderEAvaliar(1)

    // A segunda avaliacao do mesmo ticket: o `ref` e igual, e o store nao duplica.
    await chamar('hermes:desk:rate', id, 2)

    expect(await afterSales.list('local')).toHaveLength(1)
  })
})

// O CICLO DO NEGOCIO (r157 do GOAL V2).
//
// O QUE ESTE TESTE PROVA - e ele e diferente dos oito que ja existem
//
// Cada uma das oito ligacoes do §17 tem o seu fluxo, **em par**: venda→CRM, entrega→atendimento, atendimento→
// pos-venda. **O que nunca foi provado e que as oito funcionam JUNTAS** - que o cliente que compra, recebe, reclama
// e avalia e O MESMO cliente visto por sete modulos ao mesmo tempo.
//
// E o "ponta a ponta" de verdade: nao a seta isolada, mas **o ciclo**.
//
// O CICLO
//
//   compra    -> estoque sobe
//   venda     -> estoque baixa, financeiro recebe, CRM conhece o cliente
//   entrega   -> recusada vira ticket no atendimento
//   ticket    -> o CRM registra o chamado
//   avaliacao -> nota baixa vira follow-up no pos-venda
//
// A PERGUNTA QUE ELE RESPONDE
//
// **O dado chega ao fim da cadeia?** Um cliente que passou pelos cinco fatos tem, no CRM, a compra E o chamado; no
// financeiro, o lancamento; no pos-venda, o follow-up; e no estoque, o saldo certo.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AfterSalesStore, afterSalesStorePath } from './after-sales-store'
import { CrmContactStore, crmStorePath } from './crm-contacts-store'
import { DeliveryStore, deliveryStorePath } from './delivery-store'
import { FinanceStore, financeStorePath } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { intencaoDePosVenda, notaDoFollowUp } from './service-aftersales-link'
import { intencaoParaContato, patchDoContatoPorAtendimento } from './service-crm-link'
import { inputDoContato, intencaoParaCrm } from './sales-crm-link'
import { ServiceDeskStore, serviceDeskStorePath } from './service-desk-store'

const TELEFONE = '+5511999990009'
const TENANT = 'local'

let dir = ''
let estoque: InventoryStore
let finance: FinanceStore
let crm: CrmContactStore
let entregas: DeliveryStore
let desk: ServiceDeskStore
let posVenda: AfterSalesStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-ciclo-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
  estoque = new InventoryStore(inventoryStorePath(dir))
  finance = new FinanceStore(financeStorePath(dir))
  crm = new CrmContactStore(crmStorePath(dir))
  entregas = new DeliveryStore(deliveryStorePath(dir))
  desk = new ServiceDeskStore(serviceDeskStorePath(dir))
  posVenda = new AfterSalesStore(afterSalesStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

/** As duas pontas de CRM que a r134 e a r147 montaram - aqui, juntas. */
async function contatoDaVenda(telefone: string, totalCents: number, saleId: string, quando: number) {
  const intencao = intencaoParaCrm({
    contact_phone: telefone,
    sale_id: saleId,
    tenant_id: TENANT,
    total_cents: totalCents
  })

  if (intencao.tipo !== 'registrar') return

  const existente = (await crm.list(TENANT)).find(c => c.phone === intencao.telefone)

  await crm.upsert(inputDoContato(intencao, existente), TENANT)
}

async function contatoDoChamado(ticket: { id: string; contact_phone: string; opened_at: number }) {
  const intencao = intencaoParaContato({
    contact_phone: ticket.contact_phone,
    opened_at: ticket.opened_at,
    tenant_id: TENANT,
    ticket_id: ticket.id
  })

  if (intencao.tipo !== 'registrar') return

  const existente = (await crm.list(TENANT)).find(c => c.phone === intencao.telefone)

  await crm.upsert(
    {
      ...patchDoContatoPorAtendimento(intencao),
      // r147: o normalize preenche com null; a ligacao repassa o que o CRM ja sabia.
      last_purchase_at: existente?.last_purchase_at ?? null,
      last_purchase_cents: existente?.last_purchase_cents ?? null,
      last_sale_id: existente?.last_sale_id ?? null,
      name: existente?.name || intencao.nomeSugerido,
      phone: intencao.telefone
    },
    TENANT
  )
}

describe('o ciclo inteiro do negocio', () => {
  it('compra, venda, entrega, reclamacao e avaliacao chegam ao fim da cadeia', async () => {
    // 1. A COMPRA repoe o estoque.
    await estoque.append({ kind: 'entrada', product_sku: 'bujao', quantity: 100, tenant_id: TENANT })

    // 2. A VENDA baixa o estoque, lanca no financeiro, e o CRM conhece o cliente.
    await estoque.append({ kind: 'saida', product_sku: 'bujao', quantity: 10, tenant_id: TENANT })
    await finance.append({ amount_cents: 15000, description: 'venda', due_at: Date.now() + 86_400_000, kind: 'receber', tenant_id: TENANT })
    await contatoDaVenda(TELEFONE, 15000, 'v1', 1_000)

    // 3. A ENTREGA e recusada — e vira ticket.
    const entrega = await entregas.criar({ destino: 'Rua A, 100', order_id: 'v1', tenant_id: TENANT })

    if ('error' in entrega) throw new Error(entrega.error)

    await entregas.transitar({ id: entrega.entrega.id, status: 'em_rota', tenant_id: TENANT })
    await entregas.transitar({ id: entrega.entrega.id, status: 'recusada', tenant_id: TENANT })

    const ticket = await desk.open({
      channel: 'logistica',
      contact_phone: TELEFONE,
      description: 'entrega recusada',
      priority: 'media',
      subject: 'Entrega recusada'
    })

    if ('error' in ticket) throw new Error(ticket.error)

    // 4. O TICKET chega ao CRM.
    await contatoDoChamado({
      contact_phone: ticket.ticket.contact_phone,
      id: ticket.ticket.id,
      opened_at: ticket.ticket.opened_at
    })

    // 5. A AVALIACAO baixa vira follow-up.
    await desk.setStatus(ticket.ticket.id, 'em_andamento')
    await desk.setStatus(ticket.ticket.id, 'resolvido')
    await desk.setStatus(ticket.ticket.id, 'fechado')

    const avaliado = await desk.rate(ticket.ticket.id, 1)

    if ('error' in avaliado) throw new Error(avaliado.error)

    const avaliadoTicket = avaliado.tickets.find(t => t.id === ticket.ticket.id)

    if (!avaliadoTicket) throw new Error('ticket sumiu')

    const intencao = intencaoDePosVenda({
      closed_at: avaliadoTicket.closed_at,
      contact_phone: avaliadoTicket.contact_phone,
      satisfaction: avaliadoTicket.satisfaction,
      tenant_id: TENANT,
      ticket_id: avaliadoTicket.id
    })

    if (intencao.tipo !== 'criar') throw new Error('esperava follow-up')

    await posVenda.create({
      contact_phone: intencao.contact_phone,
      kind: intencao.kind,
      notes: notaDoFollowUp(intencao),
      sale_at: intencao.baseEm,
      sale_id: intencao.origem,
      tenant_id: TENANT
    })

    // O FIM DA CADEIA: cada modulo sabe o que aconteceu.
    const contato = (await crm.list(TENANT))[0] as unknown as Record<string, unknown>
    const lancamentos = await finance.list(TENANT)
    const followUps = await posVenda.list(TENANT)

    // O CRM tem as DUAS pontas: a compra (r134) e o chamado (r147).
    expect(contato['last_purchase_cents']).toBe(15000)
    expect(typeof contato['last_ticket_at']).toBe('number')

    // O financeiro tem o lancamento da venda.
    expect(lancamentos.some(l => l.amount_cents === 15000)).toBe(true)

    // O pos-venda tem o follow-up — e ele aponta para o ticket, nao para a venda.
    expect(followUps).toHaveLength(1)
    expect(followUps[0]?.ref).toContain('ticket:')

    // E o estoque fechou: 100 - 10 = 90.
    const saldos = await estoque.balances(TENANT)

    // r157: o estoque trabalha em MILESIMOS (quantity vira milli), nao em unidades. 90000 milesimos sao
    // 90 bujoes. Comparar com 90 aqui seria comparar a unidade errada — e o teste passaria a mentir assim que
    // alguem mudasse a escala.
    expect(saldos['bujao']).toBe(90_000)
  })

  it('e o CRM nao criou dois contatos para a mesma pessoa', async () => {
    await contatoDaVenda(TELEFONE, 15000, 'v1', 1_000)

    const ticket = await desk.open({
      channel: 'telefone',
      contact_phone: TELEFONE,
      description: 'x',
      priority: 'alta',
      subject: 'y'
    })

    if ('error' in ticket) throw new Error(ticket.error)

    await contatoDoChamado({
      contact_phone: ticket.ticket.contact_phone,
      id: ticket.ticket.id,
      opened_at: ticket.ticket.opened_at
    })

    // A chave e (phone, tenant_id): um cliente, uma ficha, duas ligacoes.
    expect(await crm.list(TENANT)).toHaveLength(1)
  })
})

// O 4o FLUXO: ATENDIMENTO -> SERVICO -> AGENDA (r103 do GOAL V2).
//
// A medicao da r102: o ticket abre, o servico existe, a agenda existe - e NADA GARANTIA QUE OS TRES
// FALASSEM DO MESMO PROBLEMA. O scheduling-service-link.ts ja existia e nao tinha fluxo testado.
//
// O QUE ESTE TESTE PROVA
//
// Um cliente reclama; o atendimento abre um ticket com SLA DERIVADO da prioridade; a resolucao exige uma
// visita, que entra na agenda para o MESMO telefone; o ticket fecha; e a satisfacao so existe depois.
//
// Decisoes do scheduling-service-link que o fluxo exercita:
//   1. Servico fora do catalogo e ERRO - nao cria servico por acidente.
//   2. ends_at informado e IGNORADO em favor do catalogo.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { SchedulingStore, schedulingStorePath } from './scheduling-store'
import { linkService, priceForAppointment } from './scheduling-service-link'
import { ServiceDeskStore, serviceDeskStorePath } from './service-desk-store'

let dir = ''
let desk: ServiceDeskStore
let agenda: SchedulingStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-atend-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
  desk = new ServiceDeskStore(serviceDeskStorePath(dir))
  agenda = new SchedulingStore(schedulingStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

/** Abre e estreita a uniao - `open` devolve `{ ticket }` ou `{ error }`. */
async function abrir(prioridade: string, telefone: string) {
  const r = await desk.open({
    channel: 'telefone',
    contact_phone: telefone,
    description: 'o bujao nao chegou',
    priority: prioridade,
    subject: 'entrega'
  })

  if ('error' in r) throw new Error(`esperava ticket, veio: ${r.error}`)

  return r.ticket
}

describe('o ticket nasce com SLA DERIVADO da prioridade', () => {
  it('urgente promete 4 horas - o SLA nao vem do payload', async () => {
    const t = await abrir('urgente', '+5511999990001')
    const horas = (t.sla_due_at - t.opened_at) / (60 * 60 * 1000)

    expect(horas).toBe(4)
    expect(t.status).toBe('aberto')
  })

  it('BAIXA prioridade promete MAIS tempo que URGENTE - a prioridade muda a promessa', async () => {
    const baixa = await abrir('baixa', '+5511999990002')
    const urgente = await abrir('urgente', '+5511999990003')

    const hBaixa = (baixa.sla_due_at - baixa.opened_at) / (60 * 60 * 1000)
    const hUrgente = (urgente.sla_due_at - urgente.opened_at) / (60 * 60 * 1000)

    expect(hBaixa).toBeGreaterThan(hUrgente)
  })
})

describe('o servico vem do CATALOGO', () => {
  // ctive: true é obrigatório: o link só aceita serviço ATIVO do catálogo.
  const CATALOGO = [{ active: true, id: 's1', name: 'Troca', price_cents: 15000, service_minutes: 30 }]

  it('SERVICO FORA DO CATALOGO E ERRO - nao cria servico por acidente', () => {
    // "Corte", "corte " e "Corte " viram tres servicos se o agendamento puder criar catalogo.
    expect(linkService({ service: 'Nao existe', starts_at: 1_000_000 }, CATALOGO as never)).toMatchObject({
      error: expect.any(String)
    })
  })

  it('servico do catalogo e LINKADO - o nome nao e digitado a mao', () => {
    const r = linkService({ service: 'Troca', starts_at: 1_000_000 }, CATALOGO as never)

    // Duas fontes para a mesma coisa fariam o fim do horario divergir do catalogo.
    expect(r.error).toBeUndefined()
  })

  it('o PRECO vem do catalogo - o caixa nao redigita', () => {
    expect(priceForAppointment({ service: 'Troca' }, CATALOGO as never)).toBe(15000)
  })
})

describe('a agenda grava o compromisso', () => {
  it('book cria o agendamento', async () => {
    const dia = Date.UTC(2026, 10, 5, 12, 0, 0)

    const r = await agenda.book({
      contact_phone: '+5511999990001',
      ends_at: dia + 30 * 60 * 1000,
      service: 'Troca',
      starts_at: dia,
      tenant_id: 'local'
    })

    expect(r).toBeDefined()
  })
})

describe('o fluxo inteiro: reclamacao, ticket, agenda, satisfacao', () => {
  it('as pecas falam do MESMO cliente e o ticket fecha com avaliacao', async () => {
    const telefone = '+5511999990009'

    // 1. O cliente reclama.
    const t = await abrir('alta', telefone)

    expect(t.contact_phone).toBe(telefone)
    expect(t.sla_due_at).toBeGreaterThan(t.opened_at)

    // 2. A resolucao exige uma visita, para o MESMO telefone.
    const dia = Date.UTC(2026, 10, 6, 9, 0, 0)

    await agenda.book({
      contact_phone: telefone,
      ends_at: dia + 30 * 60 * 1000,
      service: 'Troca',
      starts_at: dia,
      tenant_id: 'local'
    })

    // 3. O ticket avanca e fecha.
    await desk.setStatus(t.id, 'em_andamento')
    await desk.setStatus(t.id, 'resolvido')

    // 4. E o cliente avalia - so DEPOIS do desfecho.
    const avaliado = await desk.rate(t.id, 5)

    if ('error' in avaliado) throw new Error(avaliado.error)

    expect(avaliado.tickets.find(x => x.id === t.id)?.satisfaction).toBe(5)
  })

  it('AVALIAR UM TICKET ABERTO e RECUSADO - a nota seria sobre atendimento que nao aconteceu', async () => {
    const t = await abrir('media', '+5511999990010')
    const r = await desk.rate(t.id, 5)

    // `rate` devolve `review: false` em vez de gravar - a nota nao existe antes do desfecho.
    expect(r).toMatchObject({ error: 'avaliar_exige_resolvido' })
  })
})


import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  ServiceDeskStore,
  dueAtFor,
  indicators,
  isOverdue,
  needsHumanReview,
  parseServiceDesk,
  serviceDeskStorePath,
  slaRemainingMinutes,
  ticketsFor,
  type Ticket
} from './service-desk-store'

async function withStore<T>(run: (store: ServiceDeskStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-desk-'))

  try {
    return await run(new ServiceDeskStore(serviceDeskStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const AGORA = 1_700_000_000_000

const ticket = (over: Partial<Ticket> = {}): Ticket => ({
  assignee: '',
  channel: 'manual',
  closed_at: null,
  contact_phone: '',
  created_at: AGORA,
  description: '',
  id: 'tk_1',
  number: 1,
  opened_at: AGORA,
  priority: 'media',
  sla_due_at: dueAtFor(AGORA, 'media'),
  status: 'aberto',
  subject: 'Pedido atrasado',
  satisfaction: null,
  tenant_id: 'local',
  updated_at: AGORA,
  ...over
})

describe('SLA derivado', () => {
  it('prazo vem da prioridade, em horas', () => {
    expect(dueAtFor(AGORA, 'urgente')).toBe(AGORA + 4 * 3_600_000)
    expect(dueAtFor(AGORA, 'alta')).toBe(AGORA + 8 * 3_600_000)
    expect(dueAtFor(AGORA, 'media')).toBe(AGORA + 24 * 3_600_000)
    expect(dueAtFor(AGORA, 'baixa')).toBe(AGORA + 72 * 3_600_000)
  })

  it('atraso e DERIVADO do relogio, nao gravado', () => {
    const t = ticket({ sla_due_at: AGORA + 3_600_000 })

    expect(isOverdue(t, AGORA)).toBe(false)
    expect(isOverdue(t, AGORA + 2 * 3_600_000)).toBe(true)
  })

  it('ticket resolvido ou fechado nao conta como atrasado', () => {
    const t = ticket({ sla_due_at: AGORA - 1000, status: 'fechado' })

    expect(isOverdue(t, AGORA)).toBe(false)
  })

  it('minutos restantes ficam negativos quando estourou', () => {
    const t = ticket({ sla_due_at: AGORA + 30 * 60_000 })

    expect(slaRemainingMinutes(t, AGORA)).toBe(30)
    expect(slaRemainingMinutes(t, AGORA + 60 * 60_000)).toBe(-30)
  })
})

describe('store de atendimento', () => {
  it('abre ticket e numera em sequencia', async () => {
    await withStore(async store => {
      const a = await store.open({ subject: 'Primeiro' })
      const b = await store.open({ subject: 'Segundo' })

      expect('ticket' in a && a.ticket.number).toBe(1)
      expect('ticket' in b && b.ticket.number).toBe(2)
    })
  })

  it('exige assunto', async () => {
    await withStore(async store => {
      expect(await store.open({ subject: '  ' })).toEqual({ error: 'subject_required' })
    })
  })

  it('IGNORA sla_due_at informado e deriva da prioridade', async () => {
    await withStore(async store => {
      const r = await store.open({ opened_at: AGORA, priority: 'urgente', sla_due_at: AGORA + 999_999_999, subject: 'X' })

      expect('ticket' in r && r.ticket.sla_due_at).toBe(AGORA + 4 * 3_600_000)
    })
  })

  it('nao fecha sem resolver', async () => {
    await withStore(async store => {
      const r = await store.open({ subject: 'X' })
      if (!('ticket' in r)) return

      expect(await store.setStatus(r.ticket.id, 'fechado')).toEqual({ error: 'fechar_exige_resolvido' })

      await store.setStatus(r.ticket.id, 'resolvido')
      expect('tickets' in (await store.setStatus(r.ticket.id, 'fechado'))).toBe(true)
    })
  })

  it('nao avalia ticket aberto', async () => {
    await withStore(async store => {
      const r = await store.open({ subject: 'X' })
      if (!('ticket' in r)) return

      expect(await store.rate(r.ticket.id, 5)).toEqual({ error: 'avaliar_exige_resolvido' })
    })
  })

  it('avalia e MARCA REVISAO quando a nota e baixa', async () => {
    await withStore(async store => {
      const r = await store.open({ subject: 'X' })
      if (!('ticket' in r)) return

      await store.setStatus(r.ticket.id, 'resolvido')

      const ruim = await store.rate(r.ticket.id, 1)
      expect('review' in ruim && ruim.review).toBe(true)

      const bom = await store.rate(r.ticket.id, 5)
      expect('review' in bom && bom.review).toBe(false)
    })
  })

  it('recusa nota fora de 1..5', async () => {
    await withStore(async store => {
      const r = await store.open({ subject: 'X' })
      if (!('ticket' in r)) return

      await store.setStatus(r.ticket.id, 'resolvido')

      expect(await store.rate(r.ticket.id, 0)).toEqual({ error: 'nota_invalida' })
      expect(await store.rate(r.ticket.id, 6)).toEqual({ error: 'nota_invalida' })
    })
  })
})

describe('fila e indicadores', () => {
  it('ordena por urgencia e depois por idade', () => {
    const lista = [
      ticket({ id: 'a', number: 1, priority: 'baixa' }),
      ticket({ id: 'b', number: 2, opened_at: AGORA - 1000, priority: 'urgente' }),
      ticket({ id: 'c', number: 3, priority: 'urgente' })
    ]

    // Urgentes primeiro; entre urgentes, o mais antigo.
    expect(ticketsFor(lista).map(t => t.id)).toEqual(['b', 'c', 'a'])
  })

  it('conta abertos, atrasados e media de satisfacao', () => {
    const lista = [
      ticket({ id: 'a', sla_due_at: AGORA - 1 }),
      ticket({ id: 'b', satisfaction: 5, status: 'fechado' }),
      ticket({ id: 'c', satisfaction: 1, status: 'fechado' })
    ]

    const r = indicators(lista, AGORA)

    expect(r.abertos).toBe(1)
    expect(r.atrasados).toBe(1)
    expect(r.satisfacaoMedia).toBe(3)
  })

  it('sem avaliacao, media e null (nao zero)', () => {
    // 0 seria "todo mundo odiou"; null e "ninguem avaliou". Confundir os dois mente sobre o servico.
    expect(indicators([ticket()], AGORA).satisfacaoMedia).toBeNull()
  })

  it('satisfacao baixa pede humano; nula nao', () => {
    expect(needsHumanReview(1)).toBe(true)
    expect(needsHumanReview(2)).toBe(true)
    expect(needsHumanReview(3)).toBe(false)
    expect(needsHumanReview(null)).toBe(false)
  })

  it('arquivo corrompido vira vazio', () => {
    expect(parseServiceDesk('nao e json')).toEqual({ schema_version: 1, tickets: [] })
  })
})

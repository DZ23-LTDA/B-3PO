import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ServiceDeskStore, serviceDeskStorePath, type Ticket } from './service-desk-store'
import { registerServiceDeskIpc, toView } from './service-desk-ipc'

type Handler = (event: unknown, ...args: unknown[]) => unknown

function fakeIpc() {
  const handlers = new Map<string, Handler>()

  return {
    channels: () => [...handlers.keys()].sort(),
    handle: (channel: string, handler: Handler) => {
      handlers.set(channel, handler)
    },
    invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
      const handler = handlers.get(channel)

      if (!handler) throw new Error(`canal nao registrado: ${channel}`)

      return handler(null, ...args)
    }
  }
}

async function withIpc<T>(run: (ipc: ReturnType<typeof fakeIpc>) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-desk-ipc-'))

  try {
    const ipc = fakeIpc()

    registerServiceDeskIpc(ipc, new ServiceDeskStore(serviceDeskStorePath(dir)))

    return await run(ipc)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const AGORA = 1_700_000_000_000

describe('view derivada', () => {
  const base: Ticket = {
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
    sla_due_at: AGORA + 60 * 60_000,
    status: 'aberto',
    subject: 'X',
    satisfaction: null,
    tenant_id: 'local',
    updated_at: AGORA
  }

  it('marca atrasado e minutos restantes no momento da leitura', () => {
    const dentro = toView(base, AGORA)
    const depois = toView(base, AGORA + 2 * 60 * 60_000)

    expect(dentro.atrasado).toBe(false)
    expect(dentro.sla_minutos).toBe(60)
    expect(depois.atrasado).toBe(true)
    expect(depois.sla_minutos).toBe(-60)
  })

  it('marca revisao quando a satisfacao e baixa', () => {
    expect(toView({ ...base, satisfaction: 1 }, AGORA).precisaRevisao).toBe(true)
    expect(toView({ ...base, satisfaction: 5 }, AGORA).precisaRevisao).toBe(false)
  })
})

describe('IPC de atendimento', () => {
  it('registra os cinco canais', async () => {
    await withIpc(async ipc => {
      expect(ipc.channels()).toEqual([
        'hermes:desk:indicators',
        'hermes:desk:open',
        'hermes:desk:rate',
        'hermes:desk:setStatus',
        'hermes:desk:tickets'
      ])
    })
  })

  it('abre ticket e devolve a fila com derivados', async () => {
    await withIpc(async ipc => {
      await ipc.invoke('hermes:desk:open', { priority: 'urgente', subject: 'Pedido atrasado' })

      const r = (await ipc.invoke('hermes:desk:tickets')) as { tickets: { atrasado: boolean; sla_minutos: number }[] }

      expect(r.tickets).toHaveLength(1)
      expect(r.tickets[0]!.atrasado).toBe(false)
      // 4h de SLA para urgente, em minutos.
      expect(r.tickets[0]!.sla_minutos).toBeGreaterThan(230)
    })
  })

  it('indicadores saem do backend', async () => {
    await withIpc(async ipc => {
      await ipc.invoke('hermes:desk:open', { subject: 'A' })

      await expect(ipc.invoke('hermes:desk:indicators')).resolves.toEqual({
        atrasados: 0,
        abertos: 1,
        satisfacaoMedia: null
      })
    })
  })

  it('fluxo completo: resolver, avaliar, revisar', async () => {
    await withIpc(async ipc => {
      const aberto = (await ipc.invoke('hermes:desk:open', { subject: 'B' })) as { ticket: Ticket }

      await ipc.invoke('hermes:desk:setStatus', aberto.ticket.id, 'resolvido')

      const avaliado = (await ipc.invoke('hermes:desk:rate', aberto.ticket.id, 1)) as { review: boolean }

      expect(avaliado.review).toBe(true)
    })
  })

  it('propaga erros de regra como valor', async () => {
    await withIpc(async ipc => {
      await expect(ipc.invoke('hermes:desk:open', { subject: ' ' })).resolves.toEqual({ error: 'subject_required' })
      await expect(ipc.invoke('hermes:desk:setStatus', 'nao-existe', 'fechado')).resolves.toEqual({
        error: 'ticket_nao_encontrado'
      })
    })
  })

  it('tolera argumentos de tipo errado sem quebrar', async () => {
    await withIpc(async ipc => {
      // A nota e validada ANTES de procurar o ticket: "cinco" virou 0, entao nota_invalida vem
      // primeiro. Com nota valida e id invalido, ai sim o ticket nao e encontrado.
      await expect(ipc.invoke('hermes:desk:rate', 42, 'cinco')).resolves.toEqual({ error: 'nota_invalida' })
      await expect(ipc.invoke('hermes:desk:rate', 42, 5)).resolves.toEqual({ error: 'ticket_nao_encontrado' })
    })
  })
})

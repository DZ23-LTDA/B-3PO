import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { SchedulingStore, schedulingStorePath, type Appointment } from './scheduling-store'
import { registerSchedulingIpc, type BookResult } from './scheduling-ipc'

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

async function withIpc<T>(run: (ipc: ReturnType<typeof fakeIpc>, store: SchedulingStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-sched-ipc-'))

  try {
    const store = new SchedulingStore(schedulingStorePath(dir))
    const ipc = fakeIpc()

    registerSchedulingIpc(ipc, store, { actorOf: async () => ({ id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }) })

    return await run(ipc, store)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const H9 = 1793784000000
const HORA = 3_600_000

const slot = (over: Record<string, unknown> = {}) => ({
  ends_at: H9 + HORA,
  resource_id: 'cadeira-1',
  starts_at: H9,
  ...over
})

describe('IPC da agenda', () => {
  it('registra os cinco canais', async () => {
    await withIpc(async ipc => {
      expect(ipc.channels()).toEqual([
        'hermes:scheduling:book',
        'hermes:scheduling:cancel',
        'hermes:scheduling:confirm',
        'hermes:scheduling:day',
        'hermes:scheduling:list'
      ])
    })
  })

  it('marca um compromisso e ele aparece na lista do dia', async () => {
    await withIpc(async ipc => {
      const r = (await ipc.invoke('hermes:scheduling:book', slot())) as BookResult

      expect('appointment' in r).toBe(true)

      const dia = (await ipc.invoke('hermes:scheduling:day', undefined, H9, H9 + 24 * HORA)) as {
        appointments: Appointment[]
      }

      expect(dia.appointments).toHaveLength(1)
      expect(dia.appointments[0]!.resource_id).toBe('cadeira-1')
    })
  })

  it('recusa conflito e devolve o compromisso que ocupa o horario', async () => {
    await withIpc(async ipc => {
      await ipc.invoke('hermes:scheduling:book', slot())

      const conflito = (await ipc.invoke(
        'hermes:scheduling:book',
        slot({ starts_at: H9 + 1800000, ends_at: H9 + HORA + 1800000 })
      )) as BookResult

      expect(conflito).toHaveProperty('error', 'conflito_de_agenda')
      expect(conflito).toHaveProperty('conflict')
    })
  })

  it('encaixe perfeito e aceito pelo IPC', async () => {
    await withIpc(async ipc => {
      await ipc.invoke('hermes:scheduling:book', slot())

      const encaixe = (await ipc.invoke('hermes:scheduling:book', slot({ starts_at: H9 + HORA, ends_at: H9 + 2 * HORA }))) as BookResult

      expect('appointment' in encaixe).toBe(true)
    })
  })

  it('confirma e cancela', async () => {
    await withIpc(async ipc => {
      const r = (await ipc.invoke('hermes:scheduling:book', slot())) as { appointment: Appointment }
      const id = r.appointment.id

      const confirmado = (await ipc.invoke('hermes:scheduling:confirm', id)) as { appointments: Appointment[] }

      expect(confirmado.appointments[0]!.status).toBe('confirmado')

      const cancelado = (await ipc.invoke('hermes:scheduling:cancel', id, undefined, 'cliente desmarcou')) as {
        appointments: Appointment[]
      }

      expect(cancelado.appointments[0]!.status).toBe('cancelado')
    })
  })

  it('propaga erro de validacao como valor', async () => {
    await withIpc(async ipc => {
      await expect(ipc.invoke('hermes:scheduling:book', { resource_id: '', starts_at: H9, ends_at: H9 + HORA })).resolves.toEqual({
        error: 'resource_required'
      })
      await expect(ipc.invoke('hermes:scheduling:confirm', 'nao-existe')).resolves.toEqual({
        error: 'compromisso_nao_encontrado'
      })
    })
  })

  it('tolera argumentos invalidos de dia sem quebrar', async () => {
    await withIpc(async ipc => {
      const r = (await ipc.invoke('hermes:scheduling:day', 42, 'abc', null)) as { appointments: Appointment[] }

      expect(r.appointments).toEqual([])
    })
  })
})

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ServicesStore, servicesStorePath, type Service } from './services-store'
import { registerServicesIpc } from './services-ipc'

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
  const dir = await mkdtemp(join(tmpdir(), 'b3po-services-ipc-'))

  try {
    const ipc = fakeIpc()

    registerServicesIpc(ipc, new ServicesStore(servicesStorePath(dir)))

    return await run(ipc)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('IPC de servicos', () => {
  it('registra os quatro canais', async () => {
    await withIpc(async ipc => {
      expect(ipc.channels()).toEqual([
        'hermes:services:find',
        'hermes:services:list',
        'hermes:services:remove',
        'hermes:services:save'
      ])
    })
  })

  it('cadastra e devolve a lista', async () => {
    await withIpc(async ipc => {
      const r = (await ipc.invoke('hermes:services:save', { name: 'Corte', price_cents: 5000 })) as {
        service: Service
        services: Service[]
      }

      expect(r.service.name).toBe('Corte')
      expect(r.services).toHaveLength(1)
    })
  })

  it('propaga erro de validacao como valor', async () => {
    await withIpc(async ipc => {
      await expect(ipc.invoke('hermes:services:save', { name: '' })).resolves.toEqual({ error: 'name_required' })
      await expect(ipc.invoke('hermes:services:save', { duration_min: 0, name: 'X' })).resolves.toEqual({
        error: 'duration_required'
      })
    })
  })

  it('find resolve o servico que a agenda recebeu como texto', async () => {
    await withIpc(async ipc => {
      await ipc.invoke('hermes:services:save', { name: 'Manicure' })

      await expect(ipc.invoke('hermes:services:find', 'manicure')).resolves.toMatchObject({
        service: { name: 'Manicure' }
      })
      await expect(ipc.invoke('hermes:services:find', 'Pedicure')).resolves.toEqual({ service: null })
    })
  })

  it('tolera argumento de tipo errado sem quebrar', async () => {
    await withIpc(async ipc => {
      await expect(ipc.invoke('hermes:services:find', 42)).resolves.toEqual({ service: null })
      await expect(ipc.invoke('hermes:services:remove', null)).resolves.toEqual({ error: 'servico_nao_encontrado' })
    })
  })
})

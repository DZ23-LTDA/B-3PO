import { describe, expect, it } from 'vitest'

import { registerSchedulingCatalogIpc } from './scheduling-catalog-ipc'
import type { Service } from './services-store'

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

const servico = (over: Partial<Service> = {}): Service => ({
  active: true,
  created_at: 1,
  duration_min: 45,
  id: 'srv_1',
  name: 'Corte',
  notes: '',
  price_cents: 5000,
  tenant_id: 'local',
  updated_at: 1,
  ...over
})

const INICIO = 1_700_000_000_000

async function withChannel<T>(
  run: (ipc: ReturnType<typeof fakeIpc>, gravados: Record<string, unknown>[]) => Promise<T>,
  catalogo: Service[] = [servico()],
  /** r177: o ator e parametro, para o teste de negacao passar um sem EXECUTE. */
  ator: unknown = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }
): Promise<T> {
  const ipc = fakeIpc()
  const gravados: Record<string, unknown>[] = []

  registerSchedulingCatalogIpc(ipc, {
    // r176: o ctorOf e obrigatorio - o canal passou a exigir xecute em scheduling. O dono tem tudo.
    // r176: o actorOf e obrigatorio - o canal passou a exigir execute em scheduling.
    actorOf: async () => ator as never,
    scheduling: {
      book: async (input: unknown) => {
        gravados.push(input as Record<string, unknown>)

        return { appointment: { service: (input as Record<string, unknown>)['service'] } }
      }
    },
    services: { list: async () => catalogo }
  })

  return run(ipc, gravados)
}

describe('agendamento pelo catalogo', () => {
  it('registra o canal', async () => {
    await withChannel(async ipc => {
      expect(ipc.channels()).toEqual(['hermes:scheduling:bookFromCatalog'])
    })
  })

  it('DERIVA ends_at da duracao e passa o preco ao store', async () => {
    await withChannel(async (ipc, gravados) => {
      await ipc.invoke('hermes:scheduling:bookFromCatalog', {
        contact_phone: '+5511',
        service: 'corte',
        starts_at: INICIO
      })

      expect(gravados).toHaveLength(1)
      expect(gravados[0]).toMatchObject({
        ends_at: INICIO + 45 * 60_000,
        price_cents: 5000,
        service: 'Corte',
        service_id: 'srv_1'
      })
    })
  })

  it('descarta o ends_at do chamador em favor do catalogo', async () => {
    await withChannel(async (ipc, gravados) => {
      await ipc.invoke('hermes:scheduling:bookFromCatalog', {
        ends_at: INICIO + 9_999_999,
        service: 'Corte',
        starts_at: INICIO
      })

      expect(gravados[0]!['ends_at']).toBe(INICIO + 45 * 60_000)
    })
  })

  it('NAO chama o store quando o servico nao existe — nada e gravado', async () => {
    await withChannel(async (ipc, gravados) => {
      const r = await ipc.invoke('hermes:scheduling:bookFromCatalog', { service: 'Escova', starts_at: INICIO })

      expect(r).toEqual({ error: 'servico_nao_encontrado' })
      expect(gravados).toHaveLength(0)
    })
  })

  it('propaga erro de entrada sem gravar', async () => {
    await withChannel(async (ipc, gravados) => {
      await expect(ipc.invoke('hermes:scheduling:bookFromCatalog', { starts_at: INICIO })).resolves.toEqual({
        error: 'service_required'
      })
      await expect(ipc.invoke('hermes:scheduling:bookFromCatalog', { service: 'Corte' })).resolves.toEqual({
        error: 'starts_at_invalid'
      })
      expect(gravados).toHaveLength(0)
    })
  })
})

describe('a guarda do canal (r176/r177)', () => {
  /**
   * O caminho NEGADO — o que os 120 testes anteriores não cobriam.
   *
   * **A guarda estava montada desde a r176 e só o caminho feliz era exercitado.** Um `actorOf` que devolvesse
   * `null` por engano faria o canal **recusar tudo**, e nenhum teste veria — **mesma classe da r149: o ator existe
   * e não é exercitado onde importa.**
   */
  it('ator com READ nao agenda — agendar e EXECUTE', async () => {
    await withChannel(
      async (ipc, gravados) => {
        const r = (await ipc.invoke('hermes:scheduling:bookFromCatalog', {
          contact_phone: '+5511',
          service: 'corte',
          starts_at: INICIO
        })) as { error: string }

        expect(r.error).toBe('sem_permissao')
        // **E nada foi gravado**: a recusa acontece ANTES do store, não depois.
        expect(gravados).toHaveLength(0)
      },
      [servico()],
      { id: 'leitor', kind: 'human', level: 'READ', role: 'viewer' }
    )
  })

  it('sem ator nenhum tambem recusa', async () => {
    await withChannel(
      async (ipc, gravados) => {
        const r = (await ipc.invoke('hermes:scheduling:bookFromCatalog', {
          contact_phone: '+5511',
          service: 'corte',
          starts_at: INICIO
        })) as { error: string }

        expect(r.error).toBe('sem_permissao')
        expect(gravados).toHaveLength(0)
      },
      [servico()],
      null
    )
  })
})

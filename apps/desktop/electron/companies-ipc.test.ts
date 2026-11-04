import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CompaniesStore, companiesStorePath, type Branch, type Company } from './companies-store'
import { registerCompaniesIpc } from './companies-ipc'

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
  const dir = await mkdtemp(join(tmpdir(), 'b3po-companies-ipc-'))

  try {
    const store = new CompaniesStore(companiesStorePath(dir))
    const ipc = fakeIpc()

    registerCompaniesIpc(ipc, store)

    return await run(ipc)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('IPC de empresas', () => {
  it('registra os quatro canais', async () => {
    await withIpc(async ipc => {
      expect(ipc.channels()).toEqual([
        'hermes:companies:branches',
        'hermes:companies:list',
        'hermes:companies:saveBranch',
        'hermes:companies:saveCompany'
      ])
    })
  })

  it('cadastra empresa e devolve a lista', async () => {
    await withIpc(async ipc => {
      const r = (await ipc.invoke('hermes:companies:saveCompany', { name: 'DZ23 LTDA' })) as {
        companies: Company[]
        company: Company
      }

      expect(r.company.name).toBe('DZ23 LTDA')
      expect(r.companies).toHaveLength(1)
    })
  })

  it('cadastra filial sob a empresa e lista', async () => {
    await withIpc(async ipc => {
      const c = (await ipc.invoke('hermes:companies:saveCompany', { name: 'DZ23' })) as { company: Company }

      const f = (await ipc.invoke('hermes:companies:saveBranch', {
        company_id: c.company.id,
        name: 'Centro'
      })) as { branches: Branch[] }

      expect(f.branches).toHaveLength(1)

      const lista = (await ipc.invoke('hermes:companies:branches', c.company.id)) as { branches: Branch[] }

      expect(lista.branches[0]!.name).toBe('Centro')
    })
  })

  it('propaga erro de validacao como valor', async () => {
    await withIpc(async ipc => {
      await expect(ipc.invoke('hermes:companies:saveCompany', { name: '' })).resolves.toEqual({ error: 'name_required' })
      await expect(ipc.invoke('hermes:companies:saveBranch', { name: 'X' })).resolves.toEqual({ error: 'company_required' })
      await expect(ipc.invoke('hermes:companies:saveBranch', { company_id: 'nada', name: 'X' })).resolves.toEqual({
        error: 'empresa_nao_encontrada'
      })
    })
  })

  it('tolera id nao-string em branches sem quebrar', async () => {
    await withIpc(async ipc => {
      await expect(ipc.invoke('hermes:companies:branches', 42)).resolves.toEqual({ branches: [] })
    })
  })
})

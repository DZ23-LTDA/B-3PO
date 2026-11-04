import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { HrStore, hrStorePath, type Department } from './hr-store'
import { registerHrIpc } from './hr-ipc'

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
  const dir = await mkdtemp(join(tmpdir(), 'b3po-hr-ipc-'))

  try {
    const ipc = fakeIpc()

    registerHrIpc(ipc, new HrStore(hrStorePath(dir)))

    return await run(ipc)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('IPC de RH', () => {
  // r191: eram cinco canais; `offboarding` e `treinamentos` entraram para o GOAL §19.
  // O teste continua sendo a lista FECHADA de canais — protege contra canal acidental, nao um numero.
  it('registra exatamente os canais de RH', async () => {
    await withIpc(async ipc => {
      expect(ipc.channels()).toEqual([
        'hermes:hr:departments',
        'hermes:hr:employees',
        'hermes:hr:offboarding',
        'hermes:hr:policy',
        'hermes:hr:saveDepartment',
        'hermes:hr:saveEmployee',
        'hermes:hr:treinamentos'
      ])
    })
  })

  it('cadastra departamento e colaborador', async () => {
    await withIpc(async ipc => {
      const d = (await ipc.invoke('hermes:hr:saveDepartment', { name: 'TI' })) as { department: Department }

      await ipc.invoke('hermes:hr:saveEmployee', { department_id: d.department.id, name: 'Ana', salary_cents: 500000 })

      const lista = (await ipc.invoke('hermes:hr:employees', false)) as { employees: { name: string; salary_cents: null | number }[] }

      expect(lista.employees).toHaveLength(1)
      // Sem pedir, o salario nao vem.
      expect(lista.employees[0]!.salary_cents).toBeNull()
    })
  })

  it('entrega o salario quando pedido explicitamente', async () => {
    await withIpc(async ipc => {
      const d = (await ipc.invoke('hermes:hr:saveDepartment', { name: 'TI' })) as { department: Department }

      await ipc.invoke('hermes:hr:saveEmployee', { department_id: d.department.id, name: 'Ana', salary_cents: 500000 })

      const lista = (await ipc.invoke('hermes:hr:employees', true)) as { employees: { salary_cents: null | number }[] }

      expect(lista.employees[0]!.salary_cents).toBe(500000)
    })
  })

  it('a POLITICA responde antes da tentativa', async () => {
    await withIpc(async ipc => {
      await expect(ipc.invoke('hermes:hr:policy', 'desligar', '')).resolves.toEqual({
        reason: 'decisao_sobre_pessoa',
        required: true
      })
      await expect(ipc.invoke('hermes:hr:policy', 'alterar_cargo', '')).resolves.toEqual({ reason: '', required: false })
    })
  })

  it('politica recusa motivo vedado', async () => {
    await withIpc(async ipc => {
      await expect(ipc.invoke('hermes:hr:policy', 'desligar', 'por causa da idade')).resolves.toEqual({
        reason: 'motivo_vedado:idade',
        required: true
      })
    })
  })

  it('operacao desconhecida exige aprovacao por precaucao', async () => {
    await withIpc(async ipc => {
      await expect(ipc.invoke('hermes:hr:policy', 'demitir_todo_mundo', '')).resolves.toEqual({
        reason: 'operacao_desconhecida',
        required: true
      })
    })
  })

  it('a recusa do store continua valendo mesmo com a politica dizendo que precisa', async () => {
    await withIpc(async ipc => {
      const d = (await ipc.invoke('hermes:hr:saveDepartment', { name: 'TI' })) as { department: Department }
      const criado = (await ipc.invoke('hermes:hr:saveEmployee', { department_id: d.department.id, name: 'Ana' })) as {
        employee: { id: string }
      }

      await expect(
        ipc.invoke('hermes:hr:saveEmployee', { department_id: d.department.id, id: criado.employee.id, name: 'Ana', status: 'desligado' })
      ).resolves.toEqual({ error: 'desligamento_exige_aprovacao' })
    })
  })
})

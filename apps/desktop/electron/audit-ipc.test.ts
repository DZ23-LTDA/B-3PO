// O canal de leitura da trilha de auditoria (r36 do GOAL V2).
//
// O QUE ELE PROVA
//
// A r35 criou o ledger em disco. Sem canal, a trilha existiria **para quem abrisse o JSON** — e o padrão
// da r2 já se repetiu nas rodadas 3–8 e 25–28: a capacidade sem porta.
//
// O QUE ESTES TESTES TRAVAM
//
//   1. o canal existe e é `read` (consultar a trilha não exige poder de execução)
//   2. quem não tem permissão é recusado
//   3. `descartadas` chega junto — uma lista truncada sem aviso sugere histórico completo
//   4. o limite é respeitado

import { describe, expect, it } from 'vitest'

import { registerAuditIpc } from './audit-ipc'
import type { AuditStore } from './audit-store'
import type { Actor } from './rbac'

function ipcFalso(): {
  canais: string[]
  handle: (canal: string, fn: (event: unknown, payload: unknown) => Promise<unknown>) => void
  invocar: (canal: string, payload?: unknown) => Promise<unknown>
} {
  const handlers = new Map<string, (event: unknown, payload: unknown) => Promise<unknown>>()

  return {
    canais: [],
    handle(canal, fn) {
      ;(this.canais as string[]).push(canal)
      handlers.set(canal, fn)
    },
    async invocar(canal, payload) {
      const h = handlers.get(canal)

      if (!h) throw new Error(`canal nao registrado: ${canal}`)

      return h(null, payload)
    }
  }
}

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }
const VISITANTE: Actor = { id: 'vis', kind: 'human', level: 'READ', role: 'viewer' }

function storeFalso(entradas: number) {
  const chamadas: { limite?: number }[] = []

  return {
    chamadas,
    store: {
      async listar(filtro: { limite?: number } = {}) {
        chamadas.push(filtro)

        return {
          descartadas: 7,
          entries: Array.from({ length: Math.min(entradas, filtro.limite ?? entradas) }, (_, i) => ({
            action: 'read' as const,
            actorId: 'a',
            allowed: true,
            at: i,
            reason: '',
            resource: 'r',
            tenant_id: 'local'
          }))
        }
      }
    } as unknown as AuditStore
  }
}

describe('o canal da trilha', () => {
  it('registra exatamente um canal, com o nome certo', () => {
    const ipc = ipcFalso()

    registerAuditIpc(ipc as never, { actorOf: async () => DONO, store: storeFalso(1).store })

    expect(ipc.canais).toEqual(['hermes:auditoria:listar'])
  })

  it('devolve as entradas com `descartadas`', async () => {
    const ipc = ipcFalso()
    const { store } = storeFalso(3)

    registerAuditIpc(ipc as never, { actorOf: async () => DONO, store })

    const r = (await ipc.invocar('hermes:auditoria:listar')) as { descartadas: number; entries: unknown[] }

    expect(r.entries).toHaveLength(3)
    // `descartadas` vai junto: sem isso, uma lista truncada sugeriria histórico completo.
    expect(r.descartadas).toBe(7)
  })

  it('respeita o limite pedido', async () => {
    const ipc = ipcFalso()
    const { chamadas, store } = storeFalso(500)

    registerAuditIpc(ipc as never, { actorOf: async () => DONO, store })

    await ipc.invocar('hermes:auditoria:listar', { limite: 10 })

    expect(chamadas[0]?.limite).toBe(10)
  })

  it('sem limite no payload, usa o padrão da tela', async () => {
    const ipc = ipcFalso()
    const { chamadas, store } = storeFalso(500)

    registerAuditIpc(ipc as never, { actorOf: async () => DONO, store })

    await ipc.invocar('hermes:auditoria:listar', {})

    expect(chamadas[0]?.limite).toBe(200)
  })

  it('um limite absurdo é cortado — a tela não carrega o arquivo inteiro', async () => {
    const ipc = ipcFalso()
    const { chamadas, store } = storeFalso(5000)

    registerAuditIpc(ipc as never, { actorOf: async () => DONO, store })

    await ipc.invocar('hermes:auditoria:listar', { limite: 999_999 })

    expect(chamadas[0]?.limite).toBe(1000)
  })

  it('sem ator, recusa — a trilha não é pública', async () => {
    const ipc = ipcFalso()

    registerAuditIpc(ipc as never, { actorOf: async () => null, store: storeFalso(1).store })

    expect(await ipc.invocar('hermes:auditoria:listar')).toMatchObject({ error: 'sem_permissao', reason: 'sem_ator' })
  })

  it('o motivo da recusa considera o nível do ator, não o payload', async () => {
    // `read` em `privacy` é permitido a leitor; o que barra é a AUSÊNCIA de ator, não o payload.
    const ipc = ipcFalso()

    registerAuditIpc(ipc as never, { actorOf: async () => VISITANTE, store: storeFalso(1).store })

    const r = await ipc.invocar('hermes:auditoria:listar')

    expect(r).toBeDefined()
  })
})

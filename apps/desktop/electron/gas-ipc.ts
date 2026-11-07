// Vasilhame em comodato exposto ao renderer por IPC.
//
// PERMISSÃO
//
// `list`/`saldo`/`doCliente` são `read`: saber quantos cascos a revenda tem, e quais estão com um
// cliente, é informação operacional — quem atende no balcão precisa dela para responder "o senhor tem
// quantos botijões nossos?".
//
// `cadastrar`, `entregar`, `devolver` e `perder` são `execute`: mudam patrimônio. Entregar move um
// casco para a casa de alguém; perder tira do ativo de vez. Um bot não faz isso.
//
// O recurso é `'gas'` — um escopo que um bot pode ter ou não (`rbac.ts` § escopos). Um bot com escopo
// em `'vendas'` não movimenta casco por acidente.

import type { IpcMainInvokeEvent } from 'electron'

import type { GasSaldo, Vasilhame } from './gas-store'
import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'

export interface GasStoreLike {
  cadastrar: (input: unknown) => Promise<{ error: string } | { saldo: GasSaldo; vasilhame: Vasilhame }>
  devolver: (id: string) => Promise<{ error: string } | { saldo: GasSaldo; vasilhame: Vasilhame }>
  doCliente: (customerId: string, tenantId?: string) => Promise<Vasilhame[]>
  entregar: (
    id: string,
    customerId: string
  ) => Promise<{ error: string } | { saldo: GasSaldo; vasilhame: Vasilhame }>
  list: (tenantId?: string) => Promise<Vasilhame[]>
  perder: (id: string, motivo: string) => Promise<{ error: string } | { saldo: GasSaldo; vasilhame: Vasilhame }>
  saldo: (tenantId?: string) => Promise<GasSaldo>
}

export interface GasIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

const RECURSO = 'gas'

function texto(valor: unknown, padrao = ''): string {
  return typeof valor === 'string' ? valor : padrao
}

export function registerGasIpc(ipcMain: IpcRegistrar, store: GasStoreLike, deps: GasIpcDeps): void {
  ipcMain.handle(
    'hermes:gas:list',
    async (): Promise<Denied | { saldo: GasSaldo; vasilhames: Vasilhame[] }> =>
      exigirAtor(deps.actorOf, 'read', RECURSO, async () => ({
        saldo: await store.saldo(),
        vasilhames: await store.list(),
      }))
  )

  ipcMain.handle(
    'hermes:gas:doCliente',
    async (_event: IpcMainInvokeEvent, customerId: unknown): Promise<Denied | { vasilhames: Vasilhame[] }> =>
      exigirAtor(deps.actorOf, 'read', RECURSO, async () => ({
        vasilhames: await store.doCliente(texto(customerId)),
      }))
  )

  ipcMain.handle(
    'hermes:gas:cadastrar',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', RECURSO, async () => store.cadastrar(payload))
  )

  ipcMain.handle(
    'hermes:gas:entregar',
    async (_event: IpcMainInvokeEvent, id: unknown, customerId: unknown) =>
      exigirAtor(deps.actorOf, 'execute', RECURSO, async () =>
        store.entregar(texto(id), texto(customerId))
      )
  )

  ipcMain.handle(
    'hermes:gas:devolver',
    async (_event: IpcMainInvokeEvent, id: unknown) =>
      exigirAtor(deps.actorOf, 'execute', RECURSO, async () => store.devolver(texto(id)))
  )

  ipcMain.handle(
    'hermes:gas:perder',
    async (_event: IpcMainInvokeEvent, id: unknown, motivo: unknown) =>
      exigirAtor(deps.actorOf, 'execute', RECURSO, async () => store.perder(texto(id), texto(motivo)))
  )
}

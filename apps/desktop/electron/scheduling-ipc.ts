// Agenda exposta ao renderer.
//
// O conflito de horário é decidido no processo principal, com o livro inteiro em mãos. A tela nunca
// decide se um horário está livre — ela mostra o que o main recusou, junto do compromisso que ocupa o
// horário.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { Appointment, SchedulingStore } from './scheduling-store'

export type BookResult =
  | { appointment: Appointment; appointments: Appointment[] }
  | { conflict: Appointment; error: 'conflito_de_agenda' }
  | { error: string }

export interface SchedulingStoreLike {
  book: (input: unknown) => Promise<BookResult>
  cancel: (id: string, tenantId?: string, reason?: string) => Promise<{ appointments: Appointment[] } | { error: string }>
  confirm: (id: string, tenantId?: string) => Promise<{ appointments: Appointment[] } | { error: string }>
  day: (tenantId: string, dayStart: number, dayEnd: number, resourceId?: string) => Promise<Appointment[]>
  list: (tenantId?: string) => Promise<Appointment[]>
}

function numero(value: unknown): number {
  const n = Number(value)

  return Number.isFinite(n) ? n : 0
}

export interface SchedulingIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerSchedulingIpc(
  ipcMain: IpcRegistrar,
  store: SchedulingStoreLike,
  deps: SchedulingIpcDeps
): void {
  ipcMain.handle(
    'hermes:scheduling:list',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<Denied | { appointments: Appointment[] }> =>
      exigirAtor(deps.actorOf, 'read', 'scheduling', async () => ({
        appointments: await store.list(serverTenant(tenantId))
      }))
  )

  ipcMain.handle(
    'hermes:scheduling:day',
    async (
      _event: IpcMainInvokeEvent,
      tenantId: unknown,
      from: unknown,
      to: unknown,
      resourceId: unknown
    ): Promise<Denied | { appointments: Appointment[] }> =>
      exigirAtor(deps.actorOf, 'read', 'scheduling', async () => ({
        appointments: await store.day(
          serverTenant(tenantId) ?? 'local',
          numero(from),
          numero(to),
          typeof resourceId === 'string' && resourceId.trim() ? resourceId.trim() : undefined
        )
      }))
  )

  ipcMain.handle(
    'hermes:scheduling:book',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<Denied | BookResult> =>
      exigirAtor(deps.actorOf, 'execute', 'scheduling', async () => store.book(payload))
  )

  ipcMain.handle(
    'hermes:scheduling:cancel',
    async (
      _event: IpcMainInvokeEvent,
      id: unknown,
      tenantId: unknown,
      reason: unknown
    ): Promise<Denied | { appointments: Appointment[] } | { error: string }> =>
      exigirAtor(deps.actorOf, 'execute', 'scheduling', async () =>
        store.cancel(typeof id === 'string' ? id : '', serverTenant(tenantId), typeof reason === 'string' ? reason : '')
      )
  )

  ipcMain.handle(
    'hermes:scheduling:confirm',
    async (
      _event: IpcMainInvokeEvent,
      id: unknown,
      tenantId: unknown
    ): Promise<Denied | { appointments: Appointment[] } | { error: string }> =>
      exigirAtor(deps.actorOf, 'execute', 'scheduling', async () =>
        store.confirm(typeof id === 'string' ? id : '', serverTenant(tenantId))
      )
  )
}

/** Reexporta o tipo do store para quem monta o IPC. */
export type { SchedulingStore }
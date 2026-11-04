// Agenda exposta ao renderer.
//
// O conflito de horário é decidido no processo principal, com o livro inteiro em mãos. A tela nunca
// decide se um horário está livre — ela mostra o que o main recusou, junto do compromisso que ocupa o
// horário.

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

function tenant(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numero(value: unknown): number {
  const n = Number(value)

  return Number.isFinite(n) ? n : 0
}

export function registerSchedulingIpc(ipcMain: Pick<IpcMain, 'handle'>, store: SchedulingStoreLike): void {
  ipcMain.handle(
    'hermes:scheduling:list',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ appointments: Appointment[] }> => ({
      appointments: await store.list(tenant(tenantId))
    })
  )

  ipcMain.handle(
    'hermes:scheduling:day',
    async (
      _event: IpcMainInvokeEvent,
      tenantId: unknown,
      from: unknown,
      to: unknown,
      resourceId: unknown
    ): Promise<{ appointments: Appointment[] }> => ({
      appointments: await store.day(
        tenant(tenantId) ?? 'local',
        numero(from),
        numero(to),
        typeof resourceId === 'string' && resourceId.trim() ? resourceId.trim() : undefined
      )
    })
  )

  ipcMain.handle(
    'hermes:scheduling:book',
    (_event: IpcMainInvokeEvent, payload: unknown): Promise<BookResult> => store.book(payload)
  )

  ipcMain.handle(
    'hermes:scheduling:cancel',
    (_event: IpcMainInvokeEvent, id: unknown, tenantId: unknown, reason: unknown): Promise<{ appointments: Appointment[] } | { error: string }> =>
      store.cancel(typeof id === 'string' ? id : '', tenant(tenantId), typeof reason === 'string' ? reason : '')
  )

  ipcMain.handle(
    'hermes:scheduling:confirm',
    (_event: IpcMainInvokeEvent, id: unknown, tenantId: unknown): Promise<{ appointments: Appointment[] } | { error: string }> =>
      store.confirm(typeof id === 'string' ? id : '', tenant(tenantId))
  )
}

/** Reexporta o tipo do store para quem monta o IPC. */
export type { SchedulingStore }

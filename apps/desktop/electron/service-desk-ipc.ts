// Atendimento pelo IPC, com os indicadores calculados no backend.
//
// `hermes:desk:indicators` existe porque atraso e satisfação são **derivados do relógio e das
// avaliações**, não campos guardados. Calcular isso na tela faria cada aba ter um número diferente
// dependendo de quando carregou.

import type { IpcMainInvokeEvent } from 'electron'

import type { IpcRegistrar } from './ipc-types'
import {
  ABERTO_STATUSES,
  indicators,
  isOverdue,
  needsHumanReview,
  slaRemainingMinutes,
  type DeskIndicators,
  type Ticket,
  type TicketStatus
} from './service-desk-store'

export interface ServiceDeskLike {
  list: (tenantId?: string) => Promise<Ticket[]>
  open: (input: unknown) => Promise<{ error: string } | { ticket: Ticket; tickets: Ticket[] }>
  rate: (id: string, satisfaction: number) => Promise<{ error: string } | { review: boolean; tickets: Ticket[] }>
  setStatus: (id: string, status: TicketStatus) => Promise<{ error: string } | { tickets: Ticket[] }>
}

/** O que a tela mostra por ticket: os campos derivados vêm prontos para ela não recalcular. */
export interface TicketView extends Ticket {
  atrasado: boolean
  precisaRevisao: boolean
  sla_minutos: number
}

export function toView(ticket: Ticket, now: number): TicketView {
  return {
    ...ticket,
    atrasado: isOverdue(ticket, now),
    precisaRevisao: needsHumanReview(ticket.satisfaction),
    sla_minutos: slaRemainingMinutes(ticket, now)
  }
}

/** Opcional: o dominio anuncia o fato para as automacoes depois de concluir a acao. */
export interface ServiceDeskEventSink {
  ticketOpened: (ticket: { id: string; tenant_id: string; number: number; priority: string }) => Promise<void>
}

export function registerServiceDeskIpc(
  ipcMain: IpcRegistrar,
  store: ServiceDeskLike,
  onEvent?: ServiceDeskEventSink
): void {
  ipcMain.handle(
    'hermes:desk:tickets',
    async (): Promise<{ aberto_statuses: readonly TicketStatus[]; tickets: TicketView[] }> => {
      const agora = Date.now()

      return { aberto_statuses: ABERTO_STATUSES, tickets: (await store.list()).map(t => toView(t, agora)) }
    }
  )

  ipcMain.handle('hermes:desk:indicators', async (): Promise<DeskIndicators> => indicators(await store.list(), Date.now()))

  ipcMain.handle('hermes:desk:open', async (_event: IpcMainInvokeEvent, payload: unknown) => {
    const r = await store.open(payload)

    // Depois de gravar, nunca antes: se o atendimento nao abriu, nao ha fato a anunciar.
    if (!('error' in r) && onEvent) {
      try {
        await onEvent.ticketOpened({
          id: r.ticket.id,
          number: r.ticket.number,
          priority: r.ticket.priority,
          tenant_id: r.ticket.tenant_id
        })
      } catch {
        // A automacao falhar nao desfaz o atendimento aberto.
      }
    }

    return r
  })

  ipcMain.handle(
    'hermes:desk:setStatus',
    (_event: IpcMainInvokeEvent, id: unknown, status: unknown) =>
      store.setStatus(typeof id === 'string' ? id : '', (typeof status === 'string' ? status : 'aberto') as TicketStatus)
  )

  ipcMain.handle(
    'hermes:desk:rate',
    (_event: IpcMainInvokeEvent, id: unknown, satisfaction: unknown) =>
      store.rate(typeof id === 'string' ? id : '', typeof satisfaction === 'number' ? satisfaction : 0)
  )
}

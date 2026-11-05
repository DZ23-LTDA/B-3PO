// Atendimento pelo IPC, com os indicadores calculados no backend.
//
// `hermes:desk:indicators` existe porque atraso e satisfação são **derivados do relógio e das
// avaliações**, não campos guardados. Calcular isso na tela faria cada aba ter um número diferente
// dependendo de quando carregou.

import type { IpcMainInvokeEvent } from 'electron'

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
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
  /**
   * r147 do GOAL V2: o resumo ganhou contact_phone e opened_at.
   *
   * **O ticket JÁ TINHA os dois** — o resumo não os levava, e por isso o consumidor não podia ligar o
   * chamado a ninguém. É a mesma correção que a r135 fez no evento da venda: **o fato existia, o aviso
   * não o carregava.**
   */
  ticketOpened: (ticket: {
    id: string
    tenant_id: string
    number: number
    priority: string
    contact_phone?: null | string
    opened_at?: number
  }) => Promise<void>
}

export function registerServiceDeskIpc(
  ipcMain: IpcRegistrar,
  store: ServiceDeskLike,
  deps: { actorOf: () => Promise<Actor | null> },
  onEvent?: ServiceDeskEventSink
): void {
  ipcMain.handle('hermes:desk:tickets', async (): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'read', 'service-desk', async () => {
      const agora = Date.now()

      return { aberto_statuses: ABERTO_STATUSES, tickets: (await store.list()).map(t => toView(t, agora)) }
    })
  )

  ipcMain.handle('hermes:desk:indicators', async (): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'read', 'service-desk', async () => indicators(await store.list(), Date.now()))
  )

  /**
   * Abre atendimento — EXECUTE.
   *
   * O ticket nasce com SLA correndo e aparece na fila de alguem. Abrir e compromisso de atendimento.
   */
  ipcMain.handle('hermes:desk:open', async (_event: IpcMainInvokeEvent, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'service-desk', async () => {
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
  )

  /** Muda o status do ticket — EXECUTE: echado encerra o SLA e o atendimento. */
  ipcMain.handle(
    'hermes:desk:setStatus',
    async (_event: IpcMainInvokeEvent, id: unknown, status: unknown): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'execute', 'service-desk', async () =>
        store.setStatus(typeof id === 'string' ? id : '', (typeof status === 'string' ? status : 'aberto') as TicketStatus)
      )
  )

  /** Avalia a satisfação — EXECUTE: a nota entra no indicador e pode disparar revisão humana. */
  ipcMain.handle(
    'hermes:desk:rate',
    async (_event: IpcMainInvokeEvent, id: unknown, satisfaction: unknown): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'execute', 'service-desk', async () =>
        store.rate(typeof id === 'string' ? id : '', typeof satisfaction === 'number' ? satisfaction : 0)
      )
  )
}

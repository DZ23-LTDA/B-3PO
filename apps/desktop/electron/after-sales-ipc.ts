// IPC do pos-venda.
//
// Quatro canais. O que da a este modulo o direito de existir e o `indicators`: sem ele a tela mostraria
// uma lista de acompanhamentos e esconderia o numero que importa - quantas vendas faturadas estao sem
// nenhum acompanhamento.
//
// r7 do GOAL V2: os quatro canais passam pela guarda.
//
// ESTE ARQUIVO E O CASO MAIS INSTRUTIVO DO INVENTARIO. `AfterSalesDeps` JA declarava `actorOf` — a
// dependencia estava na assinatura, o resolvedor era passado na montagem, e NENHUM dos quatro handlers
// chamava `exigirAtor`. O efeito e pior que nao ter guarda: o codigo PARECE protegido, porque quem le a
// interface ve `actorOf` e assume que ele e usado.
//
// E por isso que o ratchet da r14 procura `exigirAtor` no texto e nao `actorOf`: a presenca do resolvedor
// nao prova que ele e consultado.

import {
  AfterSalesStore,
  FOLLOW_UP_KINDS,
  indicators,
  isOverdue,
  type FollowUp,
  type FollowUpKind,
  type FollowUpStatus
} from './after-sales-store'
import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'

export interface AfterSalesDeps {
  actorOf: () => Promise<Actor | null>
  afterSales: AfterSalesStore
  sales: { list: (tenantId?: string) => Promise<{ id: string; status: string; tenant_id: string }[]> }
}

export interface FollowUpView extends FollowUp {
  atrasado: boolean
  /** Prazo em horas, para a tela nao formatar data sozinha. */
  prazo_horas: number
}

/** O atraso e calculado AQUI, pelo relogio do processo principal - nao pelo do renderer. */
export function toView(followUp: FollowUp, now: number): FollowUpView {
  return {
    ...followUp,
    atrasado: isOverdue(followUp, now),
    prazo_horas: Math.round((followUp.due_at - now) / 3_600_000)
  }
}

export function registerAfterSalesIpc(ipcMain: IpcRegistrar, deps: AfterSalesDeps): void {
  ipcMain.handle(
    'hermes:aftersales:list',
    async (): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'read', 'after-sales', async () => {
        const now = Date.now()
        const lista = await deps.afterSales.list()

        return { followUps: lista.map(f => toView(f, now)) }
      })
  )

  ipcMain.handle(
    'hermes:aftersales:indicators',
    async (): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'read', 'after-sales', async () => {
        const now = Date.now()
        const [todos, vendas] = await Promise.all([deps.afterSales.listAll(), deps.sales.list()])

        // Precisa de TODOS, nao so dos pendentes: um follow-up ja feito conta como venda acompanhada.
        return { indicators: indicators(todos, vendas, now) }
      })
  )

  /**
   * Cria acompanhamento — EXECUTE.
   *
   * O follow-up e um compromisso de contato com o cliente: tem prazo e aparece na fila de alguem. Criar
   * nao e ler; e agendar trabalho e, no limite, prometer contato a um cliente.
   */
  ipcMain.handle('hermes:aftersales:create', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'after-sales', async () => {
      const raw = (payload ?? {}) as Record<string, unknown>

      if (!FOLLOW_UP_KINDS.includes(raw['kind'] as FollowUpKind)) {
        return { error: 'tipo_invalido' }
      }

      return deps.afterSales.create(raw)
    })
  )

  /**
   * Muda o status — EXECUTE.
   *
   * `descartado` encerra o acompanhamento: a venda deixa de contar como pendente e ninguem mais vai
   * contatar o cliente. E uma decisao sobre relacionamento, nao leitura.
   */
  ipcMain.handle('hermes:aftersales:setStatus', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'after-sales', async () => {
      const raw = (payload ?? {}) as Record<string, unknown>
      const id = typeof raw['id'] === 'string' ? raw['id'] : ''
      const status = raw['status'] as FollowUpStatus

      if (!id || !['pendente', 'feito', 'descartado'].includes(status)) {
        return { error: 'status_invalido' }
      }

      return deps.afterSales.setStatus(id, status)
    })
  )
}

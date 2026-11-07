// Financeiro exposto ao renderer.
//
// Mesmo desenho dos outros domínios: o main valida e grava, erro volta como valor, e os totais são
// calculados lá — a tela nunca soma nem decide o que está vencido.
//
// PERMISSÃO (r215)
//
// Este foi o primeiro canal de domínio a passar pela guarda. Antes dela, qualquer código no renderer lia e
// gravava o financeiro sem verificar nada — e sem deixar registro de quem fez.
//
// `actorOf` é OBRIGATÓRIO de propósito. Um parâmetro opcional com default "sem guarda" volta a ser o buraco
// que a rodada 214 mediu em 38 canais: quem monta o canal esquece, e nada falha.
//
// O ator vem do processo principal (`erp-ipc` resolve o dono da instalação). Um ator recebido do renderer
// seria a própria escalada de privilégio que o GOAL proíbe.

import type { IpcRegistrar } from './ipc-types'
import { totaisPorCentroDeCusto } from './finance-store'
import { withPermission } from './permission-guard'
import { limitadorDe } from './rate-limit'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { FinanceEntry, FinanceTotals } from './finance-store'

export interface FinanceStoreLike {
  append: (input: unknown) => Promise<{ entries: FinanceEntry[]; entry: FinanceEntry } | { error: string }>
  list: (tenantId?: string) => Promise<FinanceEntry[]>
  settle: (id: string, tenantId?: string, paidAt?: number) => Promise<{ entries: FinanceEntry[] } | { error: string }>
  totals: (tenantId?: string) => Promise<FinanceTotals>
}

export interface FinanceIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa — não cai em "anônimo com todos os poderes". */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerFinanceIpc(ipcMain: IpcRegistrar, store: FinanceStoreLike, deps: FinanceIpcDeps): void {
  /**
   * Resolve o ator e passa pela guarda.
   *
   * Sem ator a resposta é `sem_permissao`, não um erro de sistema: o chamador precisa saber que faltou
   * permissão, e não que o financeiro quebrou.
   */
  async function comGuarda<T>(
    action: 'execute' | 'read',
    resource: string,
    run: (ator: Actor) => Promise<T>
  ): Promise<Denied | T> {
    const ator = await deps.actorOf()

    if (!ator) {
      return { error: 'sem_permissao', reason: 'sem_ator' }
    }

    // r72 do GOAL V2: o `run` recebe o ator.
    //
    // Antes ele não recebia, e um canal que precisasse do id (para rate limiting, por exemplo) teria de
    // chamar `deps.actorOf()` de novo — e um ator que muda entre as duas chamadas daria duas chaves de
    // limite diferentes para a mesma pessoa.
    //
    // **A mudança é compatível**: `() => Promise<T>` continua valendo onde o ator não é usado, porque uma
    // função com menos parâmetros satisfaz uma com mais. Nenhum call site precisou mudar.
    return withPermission(ator, action, { resource }, () => run(ator))
  }

  ipcMain.handle(
    'hermes:finance:list',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<Denied | { entries: FinanceEntry[] }> =>
      comGuarda('read', 'finance', async () => ({ entries: await store.list(serverTenant(tenantId)) }))
  )

  ipcMain.handle(
    'hermes:finance:totals',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<Denied | { totals: FinanceTotals }> =>
      comGuarda('read', 'finance', async () => ({ totals: await store.totals(serverTenant(tenantId)) }))
  )

  ipcMain.handle(
    'hermes:finance:append',
    async (
      _event: IpcMainInvokeEvent,
      payload: unknown
    ): Promise<Denied | { entries: FinanceEntry[]; entry: FinanceEntry } | { error: string }> =>
      comGuarda('execute', 'finance', async () => store.append(payload))
  )

  ipcMain.handle(
    'hermes:finance:settle',
    async (
      _event: IpcMainInvokeEvent,
      id: unknown,
      tenantId: unknown
    ): Promise<Denied | { entries: FinanceEntry[] } | { error: string }> =>
      comGuarda('execute', 'finance', async ator => {
        // r72 do GOAL V2: rate limiting no canal que da BAIXA EM DINHEIRO. O ator vem da guarda,
        // nao de uma segunda chamada a actorOf - as duas poderiam divergir.
        const limite = limitadorDe('finance:settle').registrar(ator.id)

        if ('error' in limite) return { error: limite.error }

        return store.settle(typeof id === 'string' ? id : '', serverTenant(tenantId))
      })
  )

  // Totais por centro de custo. Derivados dos lancamentos - nenhum total e somado no renderer.
  ipcMain.handle(
    'hermes:finance:costCenters',
    async (_event: IpcMainInvokeEvent, tenantId: unknown) =>
      comGuarda('read', 'finance', async () => ({
        costCenters: totaisPorCentroDeCusto(await store.list(serverTenant(tenantId)))
      }))
  )
}

// T-12 — política tarifária exposta ao renderer por IPC.
//
// PERMISSÃO
//
// `list` e `calcular` são `read`: são leitura de configuração e de conta.
// `salvar` e `remover` são `execute`: definem **preço**. Um bot não define preço.
//
// Recurso `'tarifas'`, separado de `'medidores'`: medir consumo e precificar consumo são domínios
// diferentes, com donos diferentes (operação × financeiro). Juntar os dois faria quem lança leitura
// ganhar poder de tabela de preço.
import type { IpcMainInvokeEvent } from 'electron'

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import type { Conta, PoliticaTarifaria } from './tariff-store'

export interface TariffStoreLike {
  calcular: (tenantId: string, consumoMilli: number, quando: number) => Promise<Conta | null>
  list: (tenantId: string) => Promise<PoliticaTarifaria[]>
  remover: (id: string) => Promise<void>
  salvar: (politica: PoliticaTarifaria) => Promise<PoliticaTarifaria>
}

export interface TariffIpcDeps {
  actorOf: () => Promise<Actor | null>
  tenantOf: () => string
}

type Denied = { error: 'sem_permissao'; reason: string }

const RECURSO = 'tarifas'

export function registerTariffIpc(ipcMain: IpcRegistrar, store: TariffStoreLike, deps: TariffIpcDeps): void {
  ipcMain.handle(
    'hermes:tarifas:list',
    async (): Promise<Denied | { politicas: PoliticaTarifaria[] }> =>
      exigirAtor(deps.actorOf, 'read', RECURSO, async () => ({ politicas: await store.list(deps.tenantOf()) }))
  )

  // `calcular` devolve `null` quando **não há** política vigente. O renderer tem de mostrar
  // "não configurada", nunca um valor — é a decisão de não inventar preço chegando até a tela.
  ipcMain.handle(
    'hermes:tarifas:calcular',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<Denied | { conta: Conta | null }> =>
      exigirAtor(deps.actorOf, 'read', RECURSO, async () => {
        const entrada = (payload ?? {}) as { consumo_milli?: unknown; quando?: unknown }
        const consumo = Number(entrada.consumo_milli ?? 0)
        const quando = Number(entrada.quando ?? Date.now())

        if (!Number.isInteger(consumo) || consumo < 0) return { conta: null }

        return { conta: await store.calcular(deps.tenantOf(), consumo, quando) }
      })
  )

  ipcMain.handle(
    'hermes:tarifas:salvar',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<Denied | { error: string } | { politica: PoliticaTarifaria }> =>
      exigirAtor(deps.actorOf, 'execute', RECURSO, async () => {
        try {
          const politica = payload as PoliticaTarifaria

          return { politica: await store.salvar({ ...politica, tenant_id: deps.tenantOf() }) }
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'politica_invalida' }
        }
      })
  )

  ipcMain.handle(
    'hermes:tarifas:remover',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<Denied | { ok: true }> =>
      exigirAtor(deps.actorOf, 'execute', RECURSO, async () => {
        await store.remover(String((payload as { id?: unknown })?.id ?? ''))

        return { ok: true as const }
      })
  )
}

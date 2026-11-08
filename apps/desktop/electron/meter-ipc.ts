// Leitura periódica de medidor exposta ao renderer por IPC.
//
// PERMISSÃO
//
// `list` é `read`: consumo é informação operacional e de cobrança.
// `cadastrarMedidor` e `registrarLeitura` são `execute`: criam pontos de medição e **valores que viram
// dinheiro** — um bot não digita leitura.
//
// Recurso `'medidores'`, separado de `'gas'`: quem movimenta casco não necessariamente lança leitura.

import type { IpcMainInvokeEvent } from 'electron'

import type { Consumo, Leitura, Medidor } from './meter-store'
import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'

export interface MeterStoreLike {
  cadastrarMedidor: (input: unknown) => Promise<{ error: string } | { medidor: Medidor; medidores: Medidor[] }>
  list: () => Promise<{ consumos: Consumo[]; leituras: Leitura[]; medidores: Medidor[] }>
  registrarLeitura: (input: unknown) => Promise<{ error: string } | { consumo: Consumo; leitura: Leitura }>
}

export interface MeterIpcDeps {
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

const RECURSO = 'medidores'

export function registerMeterIpc(ipcMain: IpcRegistrar, store: MeterStoreLike, deps: MeterIpcDeps): void {
  ipcMain.handle(
    'hermes:medidores:list',
    async (): Promise<Denied | { consumos: Consumo[]; leituras: Leitura[]; medidores: Medidor[] }> =>
      exigirAtor(deps.actorOf, 'read', RECURSO, async () => store.list())
  )

  ipcMain.handle(
    'hermes:medidores:cadastrar',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', RECURSO, async () => store.cadastrarMedidor(payload))
  )

  ipcMain.handle(
    'hermes:medidores:leitura',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', RECURSO, async () => store.registrarLeitura(payload))
  )
}

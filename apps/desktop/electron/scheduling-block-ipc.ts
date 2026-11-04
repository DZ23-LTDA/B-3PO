// Canais de bloqueio de agenda (rodada 125).
//
// O store da r124 existe, testado, sem porta de entrada. Estes canais são a porta: listar, criar e remover.
//
// TENANT NUNCA VEM DO RENDERER
//
// `serverTenant` recebe o valor do renderer e o IGNORA — a instalação é uma empresa, e essa é a decisão da
// r92. Passar o tenant adiante aqui abriria a porta que o store fechou.

import { openSchedulingBlocks } from './scheduling-block-store'
import type { IpcRegistrar } from './ipc-types'

export function registerSchedulingBlockIpc(ipcMain: IpcRegistrar, userData: string): void {
  const store = openSchedulingBlocks(userData)

  ipcMain.handle('hermes:scheduling:block:list', async () => store.listar())

  ipcMain.handle('hermes:scheduling:block:create', async (_event: unknown, input: unknown) => {
    if (!input || typeof input !== 'object') return { error: 'entrada_invalida' }

    return store.criar(input as Parameters<typeof store.criar>[0])
  })

  ipcMain.handle('hermes:scheduling:block:remove', async (_event: unknown, id: unknown) => {
    if (typeof id !== 'string' || !id.trim()) return { error: 'id_obrigatorio' }

    return store.remover(id)
  })
}

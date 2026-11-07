// Canais de bloqueio de agenda (rodada 125).
//
// O store da r124 existe, testado, sem porta de entrada. Estes canais são a porta: listar, criar e remover.
//
// TENANT NUNCA VEM DO RENDERER
//
// `serverTenant` recebe o valor do renderer e o IGNORA — a instalação é uma empresa, e essa é a decisão
// r92. Passar o tenant adiante aqui abriria a porta que o store fechou.
//
// r8 do GOAL V2: os três canais passam pela guarda.
//
// Por que o bloqueio é execução: um bloqueio de agenda IMPEDE que um horário seja vendido. Criar um
// bloqueio falso tira horário de venda; remover um bloqueio real vende um horário que o profissional não
// tem. Os dois mudam o que o negócio pode vender.

import { openSchedulingBlocks } from './scheduling-block-store'
import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'

export interface SchedulingBlockDeps {
  /**
   * Ator resolvido no processo principal. `null` recusa.
   *
   * Obrigatório: bloquear a agenda é ato operacional com efeito direto na receita.
   */
  actorOf: () => Promise<Actor | null>
  /** Diretório de dados. O store é aberto aqui dentro, como antes. */
  userData: string
}

export function registerSchedulingBlockIpc(ipcMain: IpcRegistrar, deps: SchedulingBlockDeps): void {
  const store = openSchedulingBlocks(deps.userData)

  ipcMain.handle('hermes:scheduling:block:list', async (): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'read', 'scheduling', async () => store.listar())
  )

  ipcMain.handle('hermes:scheduling:block:create', async (_event: unknown, input: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'scheduling', async () => {
      if (!input || typeof input !== 'object') return { error: 'entrada_invalida' }

      return store.criar(input as Parameters<typeof store.criar>[0])
    })
  )

  ipcMain.handle('hermes:scheduling:block:remove', async (_event: unknown, id: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'scheduling', async () => {
      if (typeof id !== 'string' || !id.trim()) return { error: 'id_obrigatorio' }

      return store.remover(id)
    })
  )
}

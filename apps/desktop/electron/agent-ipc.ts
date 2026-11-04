// IPC dos agentes (rodada 146).
//
// O QUE ISTO LIGA
//
// Cinco rodadas construiram o freio - limites, roster, execucoes, aprovacao, expiracao - e nenhuma linha do
// renderer conseguia ver nada disso. Um freio que ninguem le e indistinguivel de um freio que nao existe.
//
// O QUE ESTE MODULO NAO FAZ
//
// Nao decide. Ele le os stores e repassa o que eles ja decidiram. `iniciar` e `aprovar` NAO ganham um caminho
// alternativo por aqui: o limite continua sendo aplicado dentro do store, e nao nesta camada.
//
// SEM TENANT DO RENDERER
//
// Nenhum canal recebe `tenant_id` do renderer. Foi a decisao da r92 e vale aqui pelo mesmo motivo: um campo que
// o renderer escolhe e um campo que o renderer pode errar - ou forjar.

import type { IpcRegistrar } from './ipc-types'

import { openApprovalStore } from './agent-approval-store'
import { openExecutionStore } from './agent-execution-store'
import { AGENTES, LIMITES_POR_AGENTE } from './agent-roster-view'

export function registerAgentIpc(ipcMain: IpcRegistrar, userData: string): void {
  const execucoes = openExecutionStore(userData)
  const aprovacoes = openApprovalStore(userData)

  ipcMain.handle('hermes:agent:roster', () => ({
    agentes: AGENTES.map(a => ({
      capacidades: a.capacidades.map(c => ({ descricao: c.descricao, dominio: c.dominio, nivel: c.nivel })),
      id: a.id,
      le: [...a.le],
      limites: LIMITES_POR_AGENTE[a.id] ?? null,
      missao: a.missao,
      nome: a.nome,
      nuncaSozinho: [...(a.nuncaSozinho ?? [])]
    }))
  }))

  ipcMain.handle('hermes:agent:executions', (_evento, filtro?: { owner?: string; task_id?: string }) =>
    execucoes.listar(filtro)
  )

  ipcMain.handle('hermes:agent:executions:cancel', (_evento, id: string) => execucoes.cancelar(id))

  ipcMain.handle('hermes:agent:approvals', (_evento, status?: string) => aprovacoes.listar(status))

  ipcMain.handle(
    'hermes:agent:approvals:decide',
    (_evento, input: { decidir: 'aprovar' | 'recusar'; id: string; quem: string }) => {
      // `quem` vem do renderer porque o produto ainda nao tem login proprio. Quando tiver, este e o campo que
      // passa a vir da sessao - e a checagem de "ninguem aprova o proprio pedido" continua no store.
      if (!input?.quem?.trim()) return { error: 'quem_obrigatorio' }

      return input.decidir === 'recusar'
        ? aprovacoes.recusar(input.id, input.quem)
        : aprovacoes.aprovar(input.id, input.quem)
    }
  )
}

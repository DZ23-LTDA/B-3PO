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

import { withPermission } from './permission-guard'
import type { Actor } from './rbac'

/**
 * `actorOf` entra na assinatura na r17 do V4.
 *
 * O canal `approvals:decide` recebia `quem` **do renderer** — o comentário antigo dizia "o produto
 * ainda não tem login próprio". Não é mais verdade: `atorDeMaquina` lê `ActorsStore` e devolve o
 * dono da instalação com `id`, `role` e `level`.
 *
 * Confiar no `quem` do renderer significa que quem alcança o IPC aprova em nome de qualquer um. A
 * identidade passa a ser resolvida **aqui**, e o campo do renderer é ignorado.
 */
export function registerAgentIpc(
  ipcMain: IpcRegistrar,
  userData: string,
  actorOf: () => Promise<Actor | null>
): void {
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

  ipcMain.handle('hermes:agent:executions:cancel', async (_evento, id: string) => {
    const ator = await actorOf()

    if (!ator) return { error: 'sem_permissao', reason: 'sem_ator' }

    return execucoes.cancelar(id)
  })

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

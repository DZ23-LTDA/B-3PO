// IPC das automacoes.
//
// A tela precisa mostrar QUAIS acoes existem. Em vez de a UI manter uma lista paralela (que envelhece
// na primeira ferramenta nova), o canal `tools` devolve o catalogo real do processo principal.
//
// r5 do GOAL V2: os seis canais passam pela guarda.
//
// Por que automacao e nivel 1: uma regra ativa EXECUTA acoes em nome do usuario sem ninguem olhando. Criar
// ou ativar uma regra nao e configuracao de tela — e delegar poder de acao a um disparo automatico. Um
// canal aberto aqui deixa qualquer renderer montar uma regra que dispara `execute` no financeiro.

import type { AgentTool } from './agent-tools'
import type { AutomationTrigger } from './automation-store'
import { AUTOMATION_TRIGGERS, AutomationStore } from './automation-store'
import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'

export interface AutomationDeps {
  automations: AutomationStore

  /**
   * Ator resolvido no processo principal. `null` recusa.
   *
   * Obrigatório: sem ele, `create` e `setActive` deixam alguém armar um disparo automático de ações
   * de outro domínio sem que exista um responsável.
   */
  actorOf: () => Promise<Actor | null>

  /** Varredura manual: o usuario pode pedir "verificar agora" em vez de esperar o intervalo. */
  sweep?: () => Promise<unknown>
  /** O catalogo real: a mesma lista que o agente e o executor enxergam. */
  tools: readonly AgentTool[]
}

export interface ToolOption {
  action: string
  description: string
  domain: string
  name: string
}

export function registerAutomationIpc(ipcMain: IpcRegistrar, deps: AutomationDeps): void {
  ipcMain.handle('hermes:automations:list', async (): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'read', 'automation', async () => ({ rules: await deps.automations.list() }))
  )

  ipcMain.handle('hermes:automations:triggers', async (): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'read', 'automation', async () => ({ triggers: [...AUTOMATION_TRIGGERS] }))
  )

  ipcMain.handle(
    'hermes:automations:tools',
    async (): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'read', 'automation', async () => ({
        // So o que EXECUTA aparece: uma automacao que so consulta nao muda nada e nao deveria ser
        // oferecida como acao. O filtro usa a mesma propriedade que o RBAC usa.
        tools: deps.tools
          .filter(t => t.action !== 'read')
          .map(t => ({ action: t.action, description: t.description, domain: t.domain, name: t.name }))
      }))
  )

  /**
   * Varredura manual — EXECUTE, não read.
   *
   * "Verificar agora" dispara as regras ativas imediatamente. É a mesma ação de um tick do agendador:
   * o chamador está pedindo que ações aconteçam, não consultando estado.
   */
  ipcMain.handle('hermes:automations:sweep', async (): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'automation', async () => {
      if (!deps.sweep) return { error: 'varredura_indisponivel' }

      return { result: await deps.sweep() }
    })
  )

  /**
   * Cria a regra — EXECUTE, não read.
   *
   * A regra carrega um `action` que o executor vai disparar sozinho. Criar é armar.
   */
  ipcMain.handle('hermes:automations:create', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'automation', async () => {
      const raw = (payload ?? {}) as Record<string, unknown>

      // O gatilho chega como string; validar aqui evita gravar algo que o executor nunca vai disparar.
      if (!AUTOMATION_TRIGGERS.includes(raw['trigger'] as AutomationTrigger)) {
        return { error: 'gatilho_invalido' }
      }

      return deps.automations.create(raw)
    })
  )

  /**
   * Liga/desliga a regra — EXECUTE, não read.
   *
   * Ativar uma regra parada é *armar*; desativar é *desarmar*. Os dois mudam o que o sistema vai fazer
   * sozinho, e por isso não são leitura.
   */
  ipcMain.handle('hermes:automations:setActive', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'automation', async () => {
      const raw = (payload ?? {}) as Record<string, unknown>
      const id = typeof raw['id'] === 'string' ? raw['id'] : ''

      if (!id || typeof raw['active'] !== 'boolean') {
        return { error: 'estado_invalido' }
      }

      return deps.automations.setActive(id, raw['active'])
    })
  )
}

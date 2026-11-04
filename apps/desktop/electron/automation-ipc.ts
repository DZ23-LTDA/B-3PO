// IPC das automacoes.
//
// A tela precisa mostrar QUAIS acoes existem. Em vez de a UI manter uma lista paralela (que envelhece
// na primeira ferramenta nova), o canal `tools` devolve o catalogo real do processo principal.

import type { AgentTool } from './agent-tools'
import type { AutomationTrigger } from './automation-store'
import { AUTOMATION_TRIGGERS, AutomationStore } from './automation-store'
import type { IpcRegistrar } from './ipc-types'

export interface AutomationDeps {
  automations: AutomationStore
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
  ipcMain.handle('hermes:automations:list', async () => {
    return { rules: await deps.automations.list() }
  })

  ipcMain.handle('hermes:automations:triggers', async () => {
    return { triggers: [...AUTOMATION_TRIGGERS] }
  })

  ipcMain.handle('hermes:automations:tools', async (): Promise<{ tools: ToolOption[] }> => {
    // So o que EXECUTA aparece: uma automacao que so consulta nao muda nada e nao deveria ser
    // oferecida como acao. O filtro usa a mesma propriedade que o RBAC usa.
    return {
      tools: deps.tools
        .filter(t => t.action !== 'read')
        .map(t => ({ action: t.action, description: t.description, domain: t.domain, name: t.name }))
    }
  })

  ipcMain.handle('hermes:automations:create', async (_event, payload: unknown) => {
    const raw = (payload ?? {}) as Record<string, unknown>

    // O gatilho chega como string; validar aqui evita gravar algo que o executor nunca vai disparar.
    if (!AUTOMATION_TRIGGERS.includes(raw['trigger'] as AutomationTrigger)) {
      return { error: 'gatilho_invalido' }
    }

    return deps.automations.create(raw)
  })

  ipcMain.handle('hermes:automations:setActive', async (_event, payload: unknown) => {
    const raw = (payload ?? {}) as Record<string, unknown>
    const id = typeof raw['id'] === 'string' ? raw['id'] : ''

    if (!id || typeof raw['active'] !== 'boolean') {
      return { error: 'estado_invalido' }
    }

    return deps.automations.setActive(id, raw['active'])
  })
}

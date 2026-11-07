// O canal de leitura da trilha de auditoria (r36 do GOAL V2).
//
// A r35 criou o ledger em disco. Sem este canal, a trilha existiria **para quem abrisse o JSON no
// disco** — o padrão da r2 que já se repetiu nas rodadas 3–8 e 25–28: **a capacidade sem porta**.
//
// POR QUE `read` E NÃO `execute`
//
// Ler auditoria é consulta. Quem pode apagar a trilha é uma pergunta diferente — e a resposta é
// "ninguém": o store é append-only e não tem método de remoção. Um canal de exclusão não existe porque
// uma auditoria que pode ser apagada não é auditoria.
//
// POR QUE `privacy` E NÃO `admin`
//
// A trilha registra **quem tentou o quê sobre dados de quem**. Ela pertence ao domínio de privacidade,
// que é onde o titular e o controlador olham. Um `admin` lendo a trilha de `finance` veria decisões de
// um domínio que ele talvez não governe.

import type { IpcRegistrar } from './ipc-types'
import type { AuditStore } from './audit-store'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'

export interface AuditIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa — a trilha não é pública. */
  actorOf: () => Promise<Actor | null>
  store: AuditStore
}

/** Quantas entradas a tela carrega de uma vez. O arquivo guarda 5.000. */
const LIMITE_PADRAO = 200

export function registerAuditIpc(ipcMain: IpcRegistrar, deps: AuditIpcDeps): void {
  /**
   * Lista as decisões, mais recentes primeiro.
   *
   * `descartadas` vai junto de propósito: se o ledger truncou, quem lê precisa saber quantas saíram.
   * Uma lista que começa em "a mais antiga que restou" sem dizer que houve perda daria a impressão de
   * histórico completo.
   */
  ipcMain.handle('hermes:auditoria:listar', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'read', 'privacy', async () => {
      const raw = (payload ?? {}) as Record<string, unknown>
      const limite = typeof raw['limite'] === 'number' && raw['limite'] > 0 ? Math.min(raw['limite'], 1000) : LIMITE_PADRAO

      return deps.store.listar({ limite, tenant_id: serverTenant(raw['tenant_id']) })
    })
  )
}

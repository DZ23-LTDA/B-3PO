// Os canais do trabalho pontual (r85 do GOAL V2).
//
// A regra (r83) e o disco (r84) existem. Este é o caminho até quem usa.
//
// `descartarVencidos` É `execute`, E ISSO É A DECISÃO DESTE ARQUIVO
//
// Limpar vencidos **muda o status de várias linhas** — é ação, não leitura. Um canal que fizesse isso no
// `listar` transformaria uma consulta numa escrita, e a regra do produto é que **quem lê não muda nada**.
//
// E ele **devolve quantos saíram**: uma ação que não diz o que fez obriga a pessoa a conferir na mão.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'
import type { TrabalhoPontual } from './work-item'
import type { WorkItemStore } from './work-item-store'

export interface WorkItemIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa — a lista de trabalho não é pública. */
  actorOf: () => Promise<Actor | null>
  store: WorkItemStore
}

type Recusa = { error: 'sem_permissao'; reason: string }

type Resultado<T> = Recusa | T

export function registerWorkItemIpc(ipcMain: IpcRegistrar, deps: WorkItemIpcDeps): void {
  /** Tudo, incluindo entregues e descartados. */
  ipcMain.handle(
    'hermes:trabalhos:listar',
    async (_event: unknown, tenantId: unknown): Promise<Resultado<{ trabalhos: TrabalhoPontual[] }>> =>
      exigirAtor(deps.actorOf, 'read', 'projects', async () => ({
        trabalhos: await deps.store.listar(serverTenant(tenantId))
      }))
  )

  /**
   * Só o que ainda é trabalho.
   *
   * **Vencidos ficam de fora** — e quem quiser vê-los usa `todos`, que é outra pergunta. Duas perguntas,
   * dois nomes, porque uma resposta só faria a tela mentir para um dos dois usos.
   */
  ipcMain.handle(
    'hermes:trabalhos:abertos',
    async (_event: unknown, tenantId: unknown): Promise<Resultado<{ trabalhos: TrabalhoPontual[] }>> =>
      exigirAtor(deps.actorOf, 'read', 'projects', async () => ({
        trabalhos: await deps.store.abertos(serverTenant(tenantId))
      }))
  )

  ipcMain.handle(
    'hermes:trabalhos:vencidos',
    async (_event: unknown, tenantId: unknown): Promise<Resultado<{ trabalhos: TrabalhoPontual[] }>> =>
      exigirAtor(deps.actorOf, 'read', 'projects', async () => ({
        trabalhos: await deps.store.vencidos(serverTenant(tenantId))
      }))
  )

  ipcMain.handle(
    'hermes:trabalhos:criar',
    async (
      _event: unknown,
      payload: unknown
    ): Promise<Resultado<{ error: string } | { trabalho: TrabalhoPontual; trabalhos: TrabalhoPontual[] }>> =>
      exigirAtor(deps.actorOf, 'execute', 'projects', async () =>
        deps.store.criar(payload, serverTenant(undefined))
      )
  )

  ipcMain.handle(
    'hermes:trabalhos:mudar',
    async (
      _event: unknown,
      payload: unknown
    ): Promise<Resultado<{ error: string } | { trabalho: TrabalhoPontual; trabalhos: TrabalhoPontual[] }>> =>
      exigirAtor(deps.actorOf, 'execute', 'projects', async () => deps.store.mudar(payload))
  )

  /**
   * A faxina como AÇÃO — nunca como efeito de uma leitura.
   *
   * `execute`, e não `read`: **quem só consulta não pode reorganizar a lista de trabalho dos outros.**
   */
  ipcMain.handle(
    'hermes:trabalhos:descartarVencidos',
    async (
      _event: unknown,
      tenantId: unknown
    ): Promise<Resultado<{ descartados: number; trabalhos: TrabalhoPontual[] }>> =>
      exigirAtor(deps.actorOf, 'execute', 'projects', async () =>
        deps.store.descartarVencidos(serverTenant(tenantId))
      )
  )
}

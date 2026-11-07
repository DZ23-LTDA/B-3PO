// Os canais do projeto (r78 do GOAL V2).
//
// O projeto tem regra (r76) e disco (r77). Este é o caminho até quem usa — e é o que faz o "plano
// persistente" do §12 chegar à tela.
//
// POR QUE `read` E `execute` SÃO SEPARADOS
//
// Consultar o que está em andamento é `read`: saber não é agir. Criar e mudar de status é `execute`.
// Separar os dois é o que permite um perfil **só de consulta**.
//
// O QUE VEM DO RESOLVEDOR, E NÃO DO PAYLOAD
//
// **`equipe`** — quem trabalha no projeto — é aceita no payload, porque é **informação sobre o trabalho**,
// não identidade de quem age. Quem age é `deps.actorOf()`, e não se negocia: se viesse do renderer, bastaria
// editar o JSON para agir como o dono.
//
// O `status` também passa pelo canal, mas **não é autoridade**: `mudarProjeto` recusa as transições
// inválidas, e é lá que mora a regra — não aqui.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { ProjectStore } from './project-store'
import type { Projeto } from './project'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'

export interface ProjetoIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa — projeto não é público. */
  actorOf: () => Promise<Actor | null>
  store: ProjectStore
}

type Recusa = { error: 'sem_permissao'; reason: string }

type Resultado<T> = Recusa | T

export function registerProjectIpc(ipcMain: IpcRegistrar, deps: ProjetoIpcDeps): void {
  /** A lista do tenant. */
  ipcMain.handle(
    'hermes:projetos:listar',
    async (_event: unknown, tenantId: unknown): Promise<Resultado<{ projetos: Projeto[] }>> =>
      exigirAtor(deps.actorOf, 'read', 'projects', async () => ({
        projetos: await deps.store.listar(serverTenant(tenantId))
      }))
  )

  /** Os que estão em andamento — rascunho não conta, porque ninguém começou. */
  ipcMain.handle(
    'hermes:projetos:ativos',
    async (_event: unknown, tenantId: unknown): Promise<Resultado<{ projetos: Projeto[] }>> =>
      exigirAtor(deps.actorOf, 'read', 'projects', async () => ({
        projetos: await deps.store.ativos(serverTenant(tenantId))
      }))
  )

  ipcMain.handle(
    'hermes:projetos:criar',
    async (_event: unknown, payload: unknown): Promise<Resultado<{ projeto: Projeto; projetos: Projeto[] } | { error: string }>> =>
      exigirAtor(deps.actorOf, 'execute', 'projects', async () => deps.store.criar(payload, serverTenant(undefined)))
  )

  ipcMain.handle(
    'hermes:projetos:mudar',
    async (_event: unknown, payload: unknown): Promise<Resultado<{ projeto: Projeto; projetos: Projeto[] } | { error: string }>> =>
      exigirAtor(deps.actorOf, 'execute', 'projects', async () => deps.store.mudar(payload))
  )

  /**
   * Pode começar? — a pergunta que o painel faz antes de mostrar "iniciar".
   *
   * As tarefas vêm **do payload** porque o store não conhece a `sofia-store`. Isso é aceitável aqui e
   * **não seria** para uma decisão de segurança: `podeIniciar` só responde sobre o **grafo** que o chamador
   * entregou, e a resposta não muda dado nenhum.
   */
  ipcMain.handle(
    'hermes:projetos:podeIniciar',
    async (_event: unknown, payload: unknown): Promise<Resultado<unknown>> =>
      exigirAtor(deps.actorOf, 'read', 'projects', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>
        const id = typeof raw['id'] === 'string' ? raw['id'] : ''
        const tarefas = Array.isArray(raw['tarefas']) ? (raw['tarefas'] as Parameters<ProjectStore['podeIniciar']>[1]) : []

        return deps.store.podeIniciar(id, tarefas)
      })
  )
}

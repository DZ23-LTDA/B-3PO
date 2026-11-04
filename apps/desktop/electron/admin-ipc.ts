// Administração de atores, atrás da guarda de permissão.
//
// Este é o canal que fecha o ciclo: quem concede permissão precisa ser um humano autorizado, e a
// concessão passa pela mesma decisão (`manage_actor`) que qualquer outra ação.
//
// O ator é resolvido no processo principal. O renderer **não** envia quem ele é — se enviasse, bastaria
// dizer "sou owner" para virar owner.

import type { IpcRegistrar } from './ipc-types'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import { primaryOwner, type ActorsStore, type StoredActor } from './actors-store'
import { withPermission, type GuardOptions } from './permission-guard'
import { canGrantLevel, type Action, type Actor, type Level } from './rbac'

export interface AdminDeps {
  actors: Pick<ActorsStore, 'deactivate' | 'ensureOwner' | 'list' | 'upsert'>
  /** Quem está agindo agora. Resolvido aqui, nunca recebido do renderer. */
  actorOf: () => Promise<Actor | null>
  onAudit?: GuardOptions['onAudit']
}

async function resolve(deps: AdminDeps): Promise<Actor> {
  const atual = await deps.actorOf()

  if (atual) {
    return atual
  }

  // Sem sessão de usuário: cai no dono. Um sistema recém-instalado precisa de um dono para funcionar,
  // e `ensureOwner` só cria quando não existe nenhum.
  await deps.actors.ensureOwner()

  const dono = primaryOwner(await deps.actors.list())

  return (
    dono ?? {
      id: 'anonimo',
      kind: 'human',
      level: null,
      role: 'viewer'
    }
  )
}

function guarded<T>(deps: AdminDeps, action: Action, run: (actor: Actor) => Promise<T>) {
  return async (): Promise<T | { error: 'sem_permissao'; reason: string }> => {
    const actor = await resolve(deps)

    return withPermission(actor, action, { onAudit: deps.onAudit, resource: 'admin' }, () => run(actor))
  }
}

export function registerAdminIpc(ipcMain: IpcRegistrar, deps: AdminDeps): void {
  ipcMain.handle(
    'hermes:admin:actors',
    guarded(deps, 'read', async () => ({ actors: await deps.actors.list() }))
  )

  ipcMain.handle(
    'hermes:admin:whoami',
    // O ator carrega o nome quando vem do store; o fallback anonimo nao tem. O tipo declara os
    // dois casos para a tela poder mostrar o nome sem conversao.
    // casos para a tela poder mostrar o nome sem s.
    async (): Promise<{ actor: Actor & { name?: string } }> => ({ actor: await resolve(deps) })
  )

  ipcMain.handle(
    'hermes:admin:saveActor',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<unknown> => {
      const actor = await resolve(deps)

      return withPermission(
        actor,
        'manage_actor',
        { onAudit: deps.onAudit, resource: 'admin' },
        async () => {
          const bruto = (payload ?? {}) as Record<string, unknown>
          const nivel = bruto['level']
          const alvo: Actor = {
            id: typeof bruto['id'] === 'string' ? bruto['id'] : '',
            kind: bruto['kind'] === 'bot' ? 'bot' : 'human',
            level: null,
            role: bruto['role'] === 'owner' ? 'owner' : bruto['role'] === 'manager' ? 'manager' : bruto['role'] === 'operator' ? 'operator' : 'viewer',
            scopes: Array.isArray(bruto['scopes']) ? (bruto['scopes'] as string[]) : []
          }

          // Conceder nível passa por canGrantLevel: bot não concede, e ninguém concede acima do próprio.
          if (typeof nivel === 'string') {
            const decisao = canGrantLevel(actor, alvo, nivel as Level)

            if (!decisao.allowed) {
              return { error: 'sem_permissao', reason: decisao.reason }
            }
          }

          return deps.actors.upsert(payload)
        }
      )
    }
  )

  ipcMain.handle(
    'hermes:admin:deactivate',
    async (_event: IpcMainInvokeEvent, id: unknown): Promise<unknown> => {
      const actor = await resolve(deps)

      return withPermission(actor, 'manage_actor', { onAudit: deps.onAudit, resource: 'admin' }, async () =>
        deps.actors.deactivate(typeof id === 'string' ? id : '')
      )
    }
  )
}

export type { StoredActor }

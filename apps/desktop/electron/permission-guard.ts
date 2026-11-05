// Guarda de permissão para handlers de IPC.
//
// Sem isto, `rbac.ts` é uma política que ninguém consulta — permissão em potencial, não em vigor.
//
// O desenho: o handler de verdade só é executado **depois** da decisão, e a negativa devolve
// `{ error: 'sem_permissao', reason }` em vez de lançar. Assim o renderer recebe o mesmo formato de
// erro dos outros canais e o motivo fica visível em vez de virar uma exceção genérica.
//
// A auditoria é registrada em toda chamada, permitida ou negada: auditoria que só guarda o que passou
// não serve para investigar o que foi tentado.

import { audit, can, type Action, type Actor, type AuditEntry, type Decision } from './rbac'

export interface Denied {
  error: 'sem_permissao'
  reason: string
}

export interface GuardOptions {
  /** Registra a decisão. O default só acumula em memória, para teste. */
  onAudit?: (entry: AuditEntry) => void
  /** Relógio injetável, para o teste não depender de tempo real. */
  now?: () => number
  resource: string
}

export type Guarded<T> = Denied | T

/**
 * Executa `handler` somente se o ator puder `action` em `resource`.
 *
 * O ator é resolvido **no processo principal**, não recebido do renderer. Um ator vindo do renderer
 * seria a própria escalada de privilégio que o GOAL proíbe.
 */
export async function withPermission<T>(
  actor: Actor,
  action: Action,
  options: GuardOptions,
  handler: () => Promise<T>
): Promise<Guarded<T>> {
  const decision: Decision = can(actor, action, options.resource)

  options.onAudit?.(audit(actor, action, options.resource, decision, (options.now ?? Date.now)()))

  if (!decision.allowed) {
    return { error: 'sem_permissao', reason: decision.reason }
  }

  return handler()
}

/**
 * Envolve um handler de IPC.
 *
 * `actorOf` é chamado a cada invocação, não uma vez só: o ator pode mudar (login, troca de perfil) e
 * uma referência capturada no boot aplicaria permissão velha para sempre.
 */
export function guardedHandler<Args extends unknown[], T>(
  actorOf: () => Actor,
  action: Action,
  options: GuardOptions,
  handler: (...args: Args) => Promise<T>
): (...args: Args) => Promise<Guarded<T>> {
  return async (...args: Args) => withPermission(actorOf(), action, options, () => handler(...args))
}
/**
 * Passa pela guarda com ator possivelmente ausente.
 *
 * `guardedHandler` assume `Actor` e usa `withPermission(actorOf(), ...)` — o que ja e um bug latente: se
 * `actorOf` devolver `null`, o `can()` explode com "cannot read properties". Esta funcao e o caminho para os
 * canais de dominio, onde o ator pode nao existir (instalacao sem dono, perfil ainda nao montado).
 *
 * Sem ator a resposta e `sem_permissao` + `sem_ator`, nao um erro de sistema: o chamador precisa saber que
 * faltou permissao, e nao que o dominio quebrou.
 *
 * A recusa NAO carrega o dado. Uma recusa que devolve o conteudo nao recusou nada.
 */
export async function exigirAtor<T>(
  actorOf: () => Promise<Actor | null>,
  action: Action,
  resource: string,
  run: () => Promise<T>,
  options: { onAudit?: (entry: AuditEntry) => void; now?: () => number } = {}
): Promise<Guarded<T>> {
  const ator = await actorOf()

  if (!ator) {
    return { error: 'sem_permissao', reason: 'sem_ator' }
  }

  return withPermission(ator, action, { ...options, resource }, run)
}
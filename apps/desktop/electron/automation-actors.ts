// Resolucao do ator das automacoes, com o alias `owner`.
//
// POR QUE ISTO EXISTE
//
// A tela de automacoes cria a regra com `actor_id: 'owner'` porque o id real do dono e gerado
// (`actor_<timestamp>_<sufixo>`) e nao e legivel para quem configura. O despachante precisa traduzir
// esse rotulo para o ator de verdade.
//
// Sem a traducao, a regra aparece ativa na tela e falha com `ator_ausente` em TODA execucao. Foi o que
// a validacao no binario pegou na rodada 68 — e o teste unitario nao pegava porque cada peca
// funcionava isolada.
//
// Esta funcao saiu do `erp-ipc` para poder ser testada: a montagem no processo principal nao tem teste,
// e uma correcao sem teste regride.

import type { Actor } from './rbac'

/** Rotulo que a interface usa para "quem esta configurando isto". */
export const OWNER_ALIAS = 'owner'

export interface ActorRecord extends Actor {
  active: boolean
}

/**
 * Lista de atores como o despachante a enxerga.
 *
 * Se o dono primario existe, um registro com id `owner` apontando para ele e acrescentado. Se ja existe
 * um ator com id literal `owner`, nada e feito — o dado real manda.
 *
 * Devolve lista vazia quando nao ha dono: o despachante entao falha com `ator_ausente`, que e o
 * comportamento correto — melhor falhar visivel do que inventar um ator.
 */
export function withOwnerAlias(actors: readonly ActorRecord[], owner: Actor | null): ActorRecord[] {
  const lista = [...actors]

  if (!owner) return lista
  if (lista.some(a => a.id === OWNER_ALIAS)) return lista

  return [...lista, { ...owner, active: true, id: OWNER_ALIAS }]
}

/** Busca o ator que a regra nomeia, aplicando o alias. `null` quando nao ha correspondencia ativa. */
export function resolveRuleActor(actors: readonly ActorRecord[], actorId: string): Actor | null {
  const achado = actors.find(a => a.id === actorId && a.active)

  if (!achado) return null

  return { id: achado.id, kind: achado.kind, level: achado.level, role: achado.role, scopes: achado.scopes }
}

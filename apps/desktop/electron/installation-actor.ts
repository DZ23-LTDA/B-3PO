// Quem assina um canal de dominio quando nao ha sessao de usuario.
//
// POR QUE ESTE MODULO EXISTE
//
// `erp-ipc` já tinha `actorOf` (ensureOwner + primaryOwner). `main.ts` monta o CRM e **não tinha** — então o
// canal de contatos não teria de onde tirar o ator sem duplicar a lógica.
//
// Copiar a resolução em cada ponto de montagem seria duas verdades sobre quem é o dono. Uma delas ficaria
// desatualizada no dia em que o produto tivesse login.
//
// ENTÃO: UMA INSTÂNCIA POR DIRETÓRIO
//
// O store é JSON atômico; duas instâncias sobre o mesmo arquivo leem bem, mas `ensureOwner` concorrente pode
// criar dois donos. O cache por `userDataDir` garante uma instância por instalação, que é a unidade de
// significado do tenant (`server-tenant.ts`).
//
// O QUE ELE NÃO FAZ
//
// Não decide permissão. Diz **quem** é; `rbac.ts` diz **se pode**.

import { ActorsStore, actorsStorePath, primaryOwner } from './actors-store'
import type { Actor } from './rbac'

const porDiretorio = new Map<string, () => Promise<Actor | null>>()

/**
 * Resolve o dono da instalação, criando-o se ainda não existir.
 *
 * Devolve `null` apenas se, depois de `ensureOwner`, não houver dono ativo — situação que só acontece com um
 * arquivo de atores corrompido. Nesse caso a guarda recusa, que é o comportamento certo: sem dono, ninguém
 * assina.
 */
export function installationActorOf(userDataDir: string): () => Promise<Actor | null> {
  const existente = porDiretorio.get(userDataDir)

  if (existente) return existente

  const store = new ActorsStore(actorsStorePath(userDataDir))

  const resolver = async (): Promise<Actor | null> => {
    await store.ensureOwner()

    return primaryOwner(await store.list())
  }

  porDiretorio.set(userDataDir, resolver)

  return resolver
}

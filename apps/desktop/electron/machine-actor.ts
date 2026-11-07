// Resolvedor do ator de máquina (r9 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// `main.ts` está no teto de linhas e só pode encolher (ratchet FILE_LINES). O resolvedor de ator que a
// fronteira de máquina precisa mora aqui, num sibling, e o `main.ts` só o chama.
//
// POR QUE NÃO REUSA O `actorOf` DO ERP
//
// `registerGitIpc` roda na linha ~17058 do `main.ts`, e `mountErpIpc` na ~17506 — o ERP é montado
// DEPOIS. Compartilhar o resolvedor exigiria reordenar a montagem, o que mexeria em mais coisa do que a
// fronteira precisa. Ler o mesmo store aqui é barato (JSON pequeno) e não cria estado paralelo: a fonte
// da verdade continua sendo `actors-store`.

import { ActorsStore, actorsStorePath, primaryOwner } from './actors-store'
import type { Actor } from './rbac'

/**
 * O dono da instalação, para a fronteira de máquina.
 *
 * `ensureOwner` antes de resolver: num perfil novo não existe dono, e sem dono o git ficaria inutilizável
 * na primeira abertura. O primeiro dono é criado sozinho — isso não é escalada, é o estado inicial que a
 * interface pressupõe.
 *
 * Devolve `null` quando não há dono — e a fronteira recusa, que é o comportamento correto.
 */
export async function atorDeMaquina(userData: string): Promise<Actor | null> {
  const store = new ActorsStore(actorsStorePath(userData))

  await store.ensureOwner()

  return primaryOwner(await store.list())
}

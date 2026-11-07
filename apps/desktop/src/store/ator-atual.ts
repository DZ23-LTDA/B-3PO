/**
 * O ator desta janela, em um store (r274).
 *
 * POR QUE UM STORE PARA UM DADO QUE JÁ EXISTE
 *
 * `whoami()` é **assíncrono** e devolve `null` até a ponte responder. O contexto do produto
 * (`api/contexto-do-produto`) precisa do ator **de forma síncrona**, no instante em que o
 * `prompt.submit` é montado — e um `await` ali atrasaria o envio da mensagem por uma ida ao
 * backend que não tem nada a ver com o turno.
 *
 * Este store é a ponte: **um lugar que busca uma vez e guarda**, para o caminho quente ler. O
 * valor `null` continua significando "ainda não sei" — e é por isso que o contexto não envia
 * nada nesse estado, em vez de afirmar que a pessoa não tem escopo.
 */

import { atom } from 'nanostores'

import type { ActorRow } from '@/api/admin'

/** `null` = ainda não resolvido (a ponte não respondeu). Nunca confundir com "sem permissão". */
export const $atorAtual = atom<ActorRow | null>(null)

export function setAtorAtual(ator: ActorRow | null): void {
  $atorAtual.set(ator)
}

/**
 * A delegação que espera por uma sessão (r43 do V5).
 *
 * POR QUE ESTE STORE EXISTE
 *
 * `hermes:sofia:delegar` cria a execução em `pendente` e devolve o pedido. A sessão que vai executá-lo
 * nasce no fluxo de chat, **fora** da tela de Sofia — o cliente canônico (`session.create`, RPC) vive
 * nos hooks de sessão, e reimplementá-lo no main seria reescrever o que o goal manda reutilizar.
 *
 * O que faltava era **onde guardar o vínculo entre os dois momentos**: delegar numa tela, abrir a
 * conversa noutra, e ligar as duas coisas depois.
 *
 * POR QUE O VÍNCULO É EXPLÍCITO E NÃO AUTOMÁTICO
 *
 * Seria fácil ligar a primeira sessão que aparecesse. Seria **falso**: a sessão aberta pode não ter
 * recebido o pedido, e a execução passaria a afirmar que começou um trabalho que ninguém começou.
 * O vínculo acontece quando a pessoa diz qual conversa é a execução — e o main **verifica** que ela
 * existe antes de gravar (r38).
 */
import { atom } from 'nanostores'

export interface DelegacaoPendente {
  execucao_id: string
  /** O pedido montado do plano, para a pessoa colar na conversa que vai executá-lo. */
  prompt: string
  tarefa_id: string
}

/**
 * A delegação à espera de vínculo. `null` quando não há nenhuma.
 *
 * Um por vez: delegar outra tarefa substitui a anterior, porque a tela mostra **uma** ação de
 * vincular e não há como dizer qual das duas ela se refere.
 */
export const $delegacaoPendente = atom<DelegacaoPendente | null>(null)

export function registrarDelegacaoPendente(delegacao: DelegacaoPendente): void {
  $delegacaoPendente.set(delegacao)
}

export function limparDelegacaoPendente(): void {
  $delegacaoPendente.set(null)
}

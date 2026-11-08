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
  /**
   * `true` quando a pessoa escolheu **executar** o pedido, nao apenas vincula-lo.
   *
   * r2 da V6. Delegar cria o trabalho; transportar coloca o pedido no composer; **executar** envia a
   * mensagem, que e' o que cria a sessao. As tres coisas sao diferentes e a terceira custa inferencia —
   * por isso ela so' acontece quando alguem clica, nunca sozinha.
   */
  executar?: boolean
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

/**
 * O texto que o composer deve **enviar** agora (r2 da V6).
 *
 * Separado do `$delegacaoPendente` de proposito: pintar o rascunho e enviar sao momentos diferentes, e
 * quem pinta (`useComposerDraft`) nao tem o `onSubmit`. Quem tem e' `useMiddlewareSubmit`, que observa
 * este atom. Assim o envio nao vira um segundo caminho de submissao — e' o mesmo `onSubmit` do Enter.
 *
 * `null` = nada a enviar.
 */
export const $delegacaoParaEnviar = atom<string | null>(null)

/**
 * A execucao que esta' rodando e ainda nao foi vinculada (r3 da V6).
 *
 * `sessaoAnterior` existe para NAO vincular na sessao errada: quem dispara a execucao pode ja' estar
 * numa conversa, e essa conversa nao e' a que vai executar o trabalho. O vinculo so' acontece quando
 * `$activeSessionId` muda para um valor **diferente** do que havia no clique.
 */
export interface ExecucaoEmAndamento {
  execucao_id: string
  sessaoAnterior: null | string
}

export const $delegacaoEmExecucao = atom<ExecucaoEmAndamento | null>(null)

export function registrarExecucaoEmAndamento(execucao: ExecucaoEmAndamento): void {
  $delegacaoEmExecucao.set(execucao)
}

export function limparExecucaoEmAndamento(): void {
  $delegacaoEmExecucao.set(null)
}

export function pedirEnvioDaDelegacao(texto: string): void {
  $delegacaoParaEnviar.set(texto)
}

export function limparEnvioDaDelegacao(): void {
  $delegacaoParaEnviar.set(null)
}

export function registrarDelegacaoPendente(delegacao: DelegacaoPendente): void {
  $delegacaoPendente.set(delegacao)
}

export function limparDelegacaoPendente(): void {
  $delegacaoPendente.set(null)
}

/**
 * O pedido delegado em Sofia chega ao composer (r78 do V5).
 *
 * POR QUE ESTE HOOK EXISTE
 *
 * A r43 criou `$delegacaoPendente`; a r46 tentou transportar com um botao que escrevia no store de texto
 * e o composer reidratava o rascunho por escopo por cima. A costura certa e' `loadIntoComposer` — a API
 * do proprio `useComposerDraft` para escrita programatica (`paintDraft`).
 *
 * O efeito mora aqui, e nao no corpo de `ChatBar`, porque `ChatBar` ja esta acima do alvo de
 * `FUNC_LINES` e a regra do repo e' que funcao acima do alvo so pode encolher. Extrair mantem a regra
 * e o comportamento.
 *
 * ORDEM IMPORTA
 *
 * Roda depois da hidratacao de escopo: consome o pendente uma unica vez e limpa, para o texto nao
 * voltar se o composer remontar. O atom e' so em memoria — recarregar a pagina o zera, e por isso a
 * navegacao precisa ser client-side.
 *
 * VERIFICADO no app (r78), depois de liberar os slots de concorrencia:
 *   store  -> { tem: true, prompt: "PEDIDO-R78 que deve chegar ao composer" }
 *   rota   -> #/   composer: "PEDIDO-R78 que deve chegar ao composerObjetivo do plano: ..."
 */
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { chamarSofia } from '@/api/sofia'
import {
  $delegacaoEmExecucao,
  $delegacaoPendente,
  limparDelegacaoPendente,
  limparExecucaoEmAndamento,
  pedirEnvioDaDelegacao
} from '@/store/delegacao-pendente'
import { $activeSessionId } from '@/store/session'

export function useDelegacaoPendenteNoComposer(
  loadIntoComposer: (text: string, attachments: never[]) => void
): void {
  const delegacaoPendente = useStore($delegacaoPendente)

  useEffect(() => {
    if (!delegacaoPendente) {
      return
    }

    if (delegacaoPendente.prompt.trim().length === 0) {
      limparDelegacaoPendente()
      return
    }

    loadIntoComposer(delegacaoPendente.prompt, [])

    // r2 da V6: pintar e enviar sao momentos diferentes. Quem pinta e' este hook; quem envia e'
    // `useMiddlewareSubmit`, que tem o `onSubmit` do Enter. O sinal leva o texto, nao um comando.
    if (delegacaoPendente.executar) {
      pedirEnvioDaDelegacao(delegacaoPendente.prompt)
    }

    limparDelegacaoPendente()
  }, [delegacaoPendente, loadIntoComposer])

  /*
   * r3 da V6 — fechar o ciclo: vincular a execucao a sessao que nasceu.
   *
   * A sessao so' existe **depois** do envio, e o id chega de forma assincrona. Este efeito espera
   * `$activeSessionId` virar um valor **diferente** do que existia no clique: assim um trabalho
   * delegado nunca e' vinculado a uma conversa que a pessoa ja' tinha aberta.
   *
   * Falha em silencio de proposito: o vinculo e' conveniencia de estado, e um erro dele nao deve
   * derrubar a conversa que acabou de comecar. O estado continua `pendente` e a pessoa pode vincular
   * pela tela de Sofia.
   */
  const emAndamento = useStore($delegacaoEmExecucao)
  const sessaoAtiva = useStore($activeSessionId)

  useEffect(() => {
    if (!emAndamento || !sessaoAtiva || sessaoAtiva === emAndamento.sessaoAnterior) {
      return
    }

    limparExecucaoEmAndamento()
    void chamarSofia('execucaoVinculada', {
      execucao_id: emAndamento.execucao_id,
      session_id: sessaoAtiva
    }).catch(() => undefined)
  }, [emAndamento, sessaoAtiva])
}

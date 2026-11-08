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

import { $delegacaoPendente, limparDelegacaoPendente } from '@/store/delegacao-pendente'

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
    limparDelegacaoPendente()
  }, [delegacaoPendente, loadIntoComposer])
}

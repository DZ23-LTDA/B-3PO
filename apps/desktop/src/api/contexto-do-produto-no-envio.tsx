/**
 * Liga o contexto do produto ao envio de `prompt.submit` (r274).
 *
 * **Este é o fio.** Três peças existiam separadas e provadas, e nenhuma sabia das outras:
 *
 * ```
 * lib/contexto-da-sofia.ts     monta o contexto (puro, 10 testes)
 * api/contexto-do-produto.ts   o ponto de encontro (instalável)
 * api/client.ts                envia no prompt.submit (r274)
 * ```
 *
 * O que faltava era **quem instala o provider**. É este arquivo, e ele é montado uma vez pelo app.
 *
 * POR QUE UM COMPONENTE, E NÃO UMA CHAMADA NO BOOT
 *
 * O provider lê TRÊS fontes vivas (`$ambiente`, `$projectScope`, `$atorAtual`), e o valor precisa
 * ser o do instante do envio — não o do boot. **Uma função que lê os stores a cada chamada resolve
 * isso; um valor capturado no boot envelheceria no primeiro clique do seletor.**
 *
 * E o `whoami` roda aqui, uma vez: ele é a única peça assíncrona, e resolvê-la no boot é o que
 * permite o caminho quente ser síncrono.
 */

import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { instalarContextoDoProduto } from '@/api/contexto-do-produto'
import { whoami } from '@/api/admin'
import { contextoDaSofia, descreverContexto } from '@/lib/contexto-da-sofia'
import { $ambiente } from '@/store/ambiente'
import { $atorAtual, setAtorAtual } from '@/store/ator-atual'
import { $projectScope } from '@/store/project-scope'

/** Instala o provider e mantém o ator fresco. Montado uma vez, no shell. */
export function ContextoDoProdutoNoEnvio() {
  // Os três são lidos aqui só para o componente re-renderizar com o ator — o provider lê os
  // stores por conta própria, a cada envio.
  useStore($ambiente)
  useStore($projectScope)
  useStore($atorAtual)

  useEffect(() => {
    let vivo = true

    void whoami()
      .then(resposta => {
        if (vivo) setAtorAtual(resposta)
      })
      .catch(() => {
        // Silencioso: sem ator o contexto não envia nada, que é o estado honesto.
      })

    return () => {
      vivo = false
    }
  }, [])

  useEffect(
    () =>
      instalarContextoDoProduto(() => {
        const contexto = contextoDaSofia({
          ambiente: $ambiente.get(),
          ator: $atorAtual.get(),
          projeto: $projectScope.get()
        })

        // `desconhecido` devolve `null` — a função `paramsComContexto` já tem essa regra, e
        // repeti-la aqui evita que um leitor futuro ache que o provider decide diferente.
        return contexto.acesso === 'desconhecido' ? null : descreverContexto(contexto)
      }),
    []
  )

  return null
}

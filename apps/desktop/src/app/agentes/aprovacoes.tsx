// Fila de aprovação de agentes (rodada 148).
//
// O QUE ESTA TELA RESOLVE
//
// A r144 criou o pedido de aprovação e a r145 o guardou com prazo. Sem esta fila, um agente do tipo
// "prepara para aprovação" produz pedidos que **ninguém vê** — e o trabalho dele vira nada.
//
// O QUE A TELA NÃO DEIXA ACONTECER
//
// 1. **Aprovar o próprio pedido.** O store recusa, e a tela não mostra o botão quando o autor é quem está
//    olhando — mostrar um botão que vai falhar ensina o operador a desconfiar da tela, não do pedido.
// 2. **Botão sem ponte.** Sem a ponte, o painel inteiro se esconde. Foi a decisão da r127 e vale aqui.
// 3. **Mentir sobre o prazo.** O pedido que venceu aparece como vencido, não como pendente.

import { useCallback, useEffect, useState } from 'react'

import {
  agentsAvailable,
  erroDeAprovacao,
  listarAprovacoes,
  decidirAprovacao,
  type AprovacaoListada
} from '@/api/agents'
import { rotuloDoNivel } from '@/lib/agent-levels'
import { Button } from '@/components/ui/button'

/**
 * Quem está decidindo.
 *
 * O produto ainda não tem login próprio; até ter, o campo é preenchido aqui. É o único lugar onde uma
 * identidade vem do renderer, e o store continua checando se ela bate com o autor do pedido.
 */
const QUEM_DECIDE = 'proprietário'

export function AprovacoesPendentes() {
  const [disponivel] = useState(() => agentsAvailable())
  const [lista, setLista] = useState<AprovacaoListada[] | null>(null)
  const [erro, setErro] = useState<null | string>(null)
  const [ocupado, setOcupado] = useState<null | string>(null)

  const carregar = useCallback(async () => {
    setLista(await listarAprovacoes('pendente'))
  }, [])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const decidir = useCallback(
    async (id: string, escolha: 'aprovar' | 'recusar') => {
      setErro(null)
      setOcupado(id)

      const r = await decidirAprovacao({ decidir: escolha, id, quem: QUEM_DECIDE })

      setOcupado(null)

      if (r.error) {
        setErro(erroDeAprovacao(r.error))
        await carregar()

        return
      }

      await carregar()
    },
    [carregar]
  )

  // Sem ponte: o painel não existe. Um painel vazio com "nada pendente" seria uma afirmação falsa.
  if (!disponivel) return null

  return (
    <section className="rounded-lg border border-border p-4" data-aprovacoes={lista?.length ?? 0}>
      <h2 className="text-sm font-medium">Aprovações pendentes</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Ações que um agente quer executar e que exigem uma pessoa decidindo. Pedidos vencem em 24 horas.
      </p>

      {erro && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {erro}
        </p>
      )}

      {lista === null && <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>}

      {lista !== null && lista.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">Nenhuma aprovação esperando.</p>
      )}

      {lista !== null && lista.length > 0 && (
        <ul className="mt-3 space-y-2">
          {lista.map(pedido => {
            // O próprio autor não vê os botões: mostrar um botão que o store vai recusar ensina o operador a
            // desconfiar da tela.
            const ehAutor = pedido.solicitado_por === QUEM_DECIDE

            return (
              <li className="rounded border border-border p-3 text-xs" data-acao={pedido.acao} key={pedido.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{pedido.acao}</span>
                  <span className="text-muted-foreground">
                    {pedido.solicitado_por} · {rotuloDoNivel(pedido.nivel_pedido)}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{pedido.motivo}</p>
                {ehAutor ? (
                  <p className="mt-2 text-muted-foreground">Você pediu; outra pessoa precisa decidir.</p>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <Button
                      disabled={ocupado === pedido.id}
                      onClick={() => void decidir(pedido.id, 'aprovar')}
                      size="sm"
                    >
                      Aprovar
                    </Button>
                    <Button
                      disabled={ocupado === pedido.id}
                      onClick={() => void decidir(pedido.id, 'recusar')}
                      size="sm"
                      variant="outline"
                    >
                      Recusar
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

import { useCallback, useEffect, useState } from 'react'

import {
  criarEntrega,
  entregaErroText,
  entregasEmAberto,
  listarEntregas,
  logisticaDisponivel,
  STATUS_LABEL,
  transitarEntrega,
  type EntregaRow,
  type EntregaStatus
} from '@/api/logistica'
import { listSales, type SaleRow } from '@/api/sales'
import { Button } from '@/components/ui/button'

/**
 * Entregas.
 *
 * A ÚLTIMA ETAPA DO VERTICAL (r60 do GOAL V2).
 *
 * A r55 mediu que 8 dos 9 domínios do §17 existiam e **logística não** — e o candidato a vertical que o
 * GOAL nomeia (distribuidora de gás) é, antes de tudo, uma operação de entrega. O produto registrava a
 * venda e o dinheiro, e não sabia se a mercadoria saiu.
 *
 * TELA PRÓPRIA, E NÃO UMA SEÇÃO EM VENDAS
 *
 * A r59 tentou duas vezes inserir isto em `sales/index.tsx` e corrompeu o arquivo — ele tem **mais de um**
 * `return (`. Uma tela nova é mais trabalho e **não tem essa ambiguidade**; e a entrega é operação
 * suficientemente distinta para merecer o próprio lugar no menu.
 */
export function EntregasView() {
  const [entregas, setEntregas] = useState<EntregaRow[]>([])
  const [vendas, setVendas] = useState<SaleRow[]>([])
  const [orderId, setOrderId] = useState('')
  const [destino, setDestino] = useState('')
  const [recebedor, setRecebedor] = useState<Record<string, string>>({})
  const [falha, setFalha] = useState('')

  const disponivel = logisticaDisponivel()

  const carregar = useCallback(async () => {
    setEntregas(await listarEntregas())
    // As vendas só servem para escolher a qual pedido a entrega pertence. Se o canal de vendas não
    // responder, a tela ainda funciona com o id digitado — e por isso o `catch` devolve lista vazia em
    // vez de derrubar a tela inteira.
    setVendas(await listSales().catch(() => []))
  }, [])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const criar = async () => {
    setFalha('')

    if (!orderId) {
      setFalha(entregaErroText('order_obrigatorio'))

      return
    }

    if (!destino.trim()) {
      setFalha(entregaErroText('destino_obrigatorio'))

      return
    }

    const r = await criarEntrega({ destino, orderId })

    if ('error' in r) {
      setFalha(entregaErroText(r.error))
    } else {
      setEntregas(r.entregas)
      setDestino('')
      setOrderId('')
    }
  }

  const mudar = async (id: string, status: EntregaStatus) => {
    setFalha('')

    const r = await transitarEntrega(id, status, recebedor[id])

    if ('error' in r) setFalha(entregaErroText(r.error))
    else setEntregas(r.entregas)
  }

  if (!disponivel) {
    return (
      <main aria-label="Entregas" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">Entregas</h1>
        </header>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Logística indisponível neste ambiente.
        </p>
      </main>
    )
  }

  const emAberto = entregasEmAberto(entregas)

  return (
    <main aria-label="Entregas" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">Entregas</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          O que saiu, o que chegou e o que voltou. Uma entrega entregue ou recusada não volta.
        </p>
      </header>

      <section className="rounded-lg border border-(--ui-border) p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Nova entrega</h2>
          <span className="text-xs text-(--ui-text-tertiary)">{emAberto.length} em aberto</span>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-(--ui-text-tertiary)">Venda</span>
            <select
  aria-label="Venda desta entrega"
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
              onChange={event => setOrderId(event.target.value)}
              value={orderId}
            >
              <option value="">—</option>
              {vendas.map(v => (
                <option key={v.id} value={v.id}>
                  #{v.number ?? v.id}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-(--ui-text-tertiary)">Destino</span>
            <input
  aria-label="Endereço de destino"
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
              onChange={event => setDestino(event.target.value)}
              placeholder="endereço ou ponto de referência"
              value={destino}
            />
          </label>
        </div>

        <div className="mt-2">
          <Button onClick={() => void criar()} variant="ghost">
            Registrar entrega
          </Button>
        </div>

        {falha ? <p className="mt-2 text-xs text-(--ui-warning)">{falha}</p> : null}
      </section>

      {entregas.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Nenhuma entrega registrada ainda.
        </p>
      ) : (
        <section className="rounded-lg border border-(--ui-border) p-4">
          <ul className="flex flex-col gap-2 text-xs">
            {entregas.map(e => (
              <li className="flex flex-wrap items-center justify-between gap-2" key={e.id}>
                <span className="text-foreground">
                  {e.destino} · {STATUS_LABEL[e.status]}
                  {e.entregador ? ` · ${e.entregador}` : ''}
                  {e.comprovante ? ` · recebeu ${e.comprovante.recebedor}` : ''}
                  {/*
                    r162 do GOAL V2: a recusa AVISA que abriu um chamado.

                    A r142 liga a recusa ao atendimento — e esta tela nao dizia nada. Quem despacha via
                    "recusada" e seguia para a proxima entrega, sem saber que **o cliente virou um ticket na fila
                    do atendimento** e que alguem vai ligar.

                    Dizer isso aqui evita a ligacao duplicada: o operador da logistica NAO precisa abrir o proprio
                    ticket, porque um ja existe.
                  */}
                  {e.status === 'recusada' ? ' · abriu chamado no atendimento' : ''}
                </span>
                <span className="flex items-center gap-1">
                  {e.status === 'pendente' ? (
                    <button
                      className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
                      onClick={() => void mudar(e.id, 'em_rota')}
                      type="button"
                    >
                      Saiu
                    </button>
                  ) : null}
                  {e.status === 'em_rota' ? (
                    <>
                      {/* O recebedor é digitado AQUI e não assumido do operador: quem recebeu pode não ser
                          quem está no sistema, e o comprovante existe para ser prova. */}
                      <input
                        className="w-24 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-0.5 text-foreground outline-none focus:border-(--ui-accent)"
                        onChange={event => setRecebedor({ ...recebedor, [e.id]: event.target.value })}
                        placeholder="quem recebeu"
                        value={recebedor[e.id] ?? ''}
                      />
                      <button
                        className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
                        onClick={() => void mudar(e.id, 'entregue')}
                        type="button"
                      >
                        Entregue
                      </button>
                      <button
                        className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
                        onClick={() => void mudar(e.id, 'recusada')}
                        type="button"
                      >
                        Recusada
                      </button>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

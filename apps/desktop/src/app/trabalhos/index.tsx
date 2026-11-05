import { useCallback, useEffect, useState } from 'react'

import {
  criarTrabalho,
  descartarTrabalho,
  descartarVencidos,
  entregarTrabalho,
  listarTrabalhos,
  prazoLabel,
  quandoLabel,
  STATUS_LABEL,
  TIPO_LABEL,
  trabalhoErroText,
  TRABALHO_TIPOS,
  trabalhosDisponivel,
  trabalhosVencidos,
  type TrabalhoRow,
  type TrabalhoTipo
} from '@/api/trabalhos'
import { Button } from '@/components/ui/button'

/**
 * Trabalhos pontuais.
 *
 * O TERCEIRO TIPO DO §12 (r87 do GOAL V2).
 *
 * Organização é a empresa; projeto é o que tem prazo e critério; **trabalho pontual é o que acaba**. A
 * diferença está no prazo: **um trabalho não entregue vence**, e vencer não é falha — é o sinal de que
 * alguém precisa decidir se ele ainda faz sentido.
 *
 * A FAXINA É UM BOTÃO, NÃO UM EFEITO
 *
 * Abrir esta tela **não descarta nada**. O botão "limpar vencidos" diz **quantos** quer sair antes de agir —
 * e a ação é do dono, não da tela.
 */
export function TrabalhosView() {
  const [trabalhos, setTrabalhos] = useState<TrabalhoRow[]>([])
  const [pedido, setPedido] = useState('')
  const [tipo, setTipo] = useState<TrabalhoTipo>('pesquisa')
  const [entregaDe, setEntregaDe] = useState<Record<string, { onde: string; resumo: string }>>({})
  const [falha, setFalha] = useState('')
  const [aviso, setAviso] = useState('')

  const disponivel = trabalhosDisponivel()

  const carregar = useCallback(async () => {
    setTrabalhos(await listarTrabalhos())
  }, [])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const criar = async () => {
    setFalha('')
    setAviso('')

    const r = await criarTrabalho({ pedido, tipo })

    if ('error' in r) {
      setFalha(trabalhoErroText(r.error))
    } else {
      setTrabalhos(r.trabalhos)
      setPedido('')
    }
  }

  const entregar = async (t: TrabalhoRow) => {
    setFalha('')
    setAviso('')

    const e = entregaDe[t.id] ?? { onde: '', resumo: '' }
    const r = await entregarTrabalho(t.id, e.onde, e.resumo)

    if ('error' in r) setFalha(trabalhoErroText(r.error))
    else setTrabalhos(r.trabalhos)
  }

  const descartar = async (t: TrabalhoRow) => {
    setFalha('')
    setAviso('')

    const r = await descartarTrabalho(t.id)

    if ('error' in r) setFalha(trabalhoErroText(r.error))
    else setTrabalhos(r.trabalhos)
  }

  const limpar = async () => {
    setFalha('')

    const r = await descartarVencidos()

    setTrabalhos(r.trabalhos)
    // Diz QUANTOS saíram: uma ação que não conta o que fez obriga a conferir na mão.
    setAviso(r.descartados === 0 ? 'Nada venceu.' : `${r.descartados} trabalho(s) vencido(s) descartado(s).`)
  }

  if (!disponivel) {
    return (
      <main aria-label="Trabalhos pontuais" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">Trabalhos</h1>
        </header>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Trabalhos indisponíveis neste ambiente.
        </p>
      </main>
    )
  }

  const vencidos = trabalhosVencidosDe(trabalhos)
  const abertos = trabalhos.filter(t => t.status === 'pedido' && !vencidos.some(v => v.id === t.id))

  return (
    <main aria-label="Trabalhos pontuais" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">Trabalhos</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          O que começa e termina. Não é projeto: não vira estrutura, e o que não for entregue vence.
        </p>
      </header>

      <section className="rounded-lg border border-(--ui-border) p-4">
        <h2 className="text-sm font-medium text-foreground">Pedir um trabalho</h2>

        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <label className="flex flex-col gap-1 sm:col-span-3">
            <span className="text-(--ui-text-tertiary)">O que precisa ser feito</span>
            <input
  aria-label="O que precisa ser feito"
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
              onChange={event => setPedido(event.target.value)}
              placeholder="pesquisar os preços dos três concorrentes"
              value={pedido}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-(--ui-text-tertiary)">Tipo</span>
            <select
  aria-label="Tipo de trabalho"
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
              onChange={event => setTipo(event.target.value as TrabalhoTipo)}
              value={tipo}
            >
              {TRABALHO_TIPOS.map(t => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-2">
          <Button onClick={() => void criar()} variant="ghost">
            Pedir
          </Button>
        </div>

        {falha ? <p className="mt-2 text-xs text-(--ui-warning)">{falha}</p> : null}
        {aviso ? <p className="mt-2 text-xs text-(--ui-text-tertiary)">{aviso}</p> : null}
      </section>

      {vencidos.length > 0 ? (
        <section className="rounded-lg border border-(--ui-warning) p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-foreground">
              {vencidos.length} trabalho(s) venceram. Eles não contam mais como trabalho.
            </span>
            {/* A faxina é um BOTÃO: abrir a tela não descarta nada. */}
            <Button onClick={() => void limpar()} variant="ghost">
              Limpar vencidos
            </Button>
          </div>
        </section>
      ) : null}

      {abertos.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Nenhum trabalho em aberto.
        </p>
      ) : (
        <section className="rounded-lg border border-(--ui-border) p-4">
          <ul className="flex flex-col gap-3 text-xs">
            {abertos.map(t => (
              <li className="flex flex-col gap-1" key={t.id}>
                <span className="text-foreground">
                  {TIPO_LABEL[t.tipo]} · {t.pedido} · {prazoLabel(t)}
                </span>
                <span className="text-(--ui-text-tertiary)">pedido em {quandoLabel(t.created_at)}</span>

                <span className="flex flex-wrap items-center gap-1">
                  {/* O formulário de entrega só aparece no item — entregar é por trabalho, não em lote. */}
                  <input
                    className="w-40 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-0.5 text-foreground outline-none focus:border-(--ui-accent)"
                    onChange={event =>
                      setEntregaDe({ ...entregaDe, [t.id]: { onde: event.target.value, resumo: entregaDe[t.id]?.resumo ?? '' } })
                    }
                    placeholder="onde está"
                    value={entregaDe[t.id]?.onde ?? ''}
                  />
                  <input
                    className="w-40 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-0.5 text-foreground outline-none focus:border-(--ui-accent)"
                    onChange={event =>
                      setEntregaDe({ ...entregaDe, [t.id]: { onde: entregaDe[t.id]?.onde ?? '', resumo: event.target.value } })
                    }
                    placeholder="o que é"
                    value={entregaDe[t.id]?.resumo ?? ''}
                  />
                  <button
                    className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
                    onClick={() => void entregar(t)}
                    type="button"
                  >
                    Entregar
                  </button>
                  <button
                    className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
                    onClick={() => void descartar(t)}
                    type="button"
                  >
                    Descartar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trabalhos.some(t => t.status === 'entregue') ? (
        <section className="rounded-lg border border-(--ui-border) p-4">
          <h2 className="text-sm font-medium text-foreground">Entregues</h2>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-(--ui-text-tertiary)">
            {trabalhos
              .filter(t => t.status === 'entregue')
              .map(t => (
                <li key={t.id}>
                  {t.pedido} · {t.entrega?.resumo} (<span className="font-mono">{t.entrega?.onde}</span>)
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-(--ui-text-tertiary)">
        {STATUS_LABEL.pedido} · {STATUS_LABEL.entregue} · {STATUS_LABEL.descartado}
      </p>
    </main>
  )
}

/**
 * Os vencidos, calculados localmente **para a tela decidir o que mostrar**.
 *
 * A **autoridade** continua sendo o processo principal (`trabalhosVencidos`, que é quem a faxina usa): aqui
 * só se decide a seção, e um cálculo a mais na tela não muda o dado.
 */
function trabalhosVencidosDe(lista: readonly TrabalhoRow[]): TrabalhoRow[] {
  const agora = Date.now()

  return lista.filter(t => t.status === 'pedido' && t.expira_em <= agora)
}

/** Reexportado para a tela poder ser testada sem montar o bridge. */
export { listarTrabalhos }

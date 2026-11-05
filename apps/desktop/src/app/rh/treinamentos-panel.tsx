/**
 * Treinamentos na tela de RH (rodada 204).
 *
 * A r187 implementou a regra, a r191 o canal, a r202 o wrapper. Faltava a tela — o ultimo item do §19 sem
 * superficie depois do desligamento (r203).
 *
 * POR QUE NAO HA TREINAMENTOS DE EXEMPLO
 *
 * Nao existe store de treinamento ainda. Preencher a tela com "NR-35 · vencido" fabricaria um dado que ninguem
 * cadastrou, e o §26 proibe apresentar modulo falso. O usuario adiciona o que tem; a tela calcula sobre isso.
 *
 * A DATA DE CONCLUSAO E RELATIVA, NAO ABSOLUTA
 *
 * "concluido ha 400 dias" e mais facil de digitar que uma data, e o calculo usa a mesma referencia de hoje.
 * O painel passa `Date.now()` uma vez por conferencia: dois cliques no mesmo dia concordam.
 */

import { useState } from 'react'

import { treinamentosImpeditivos } from '@/api/hr'

import { Button } from '@/components/ui/button'

export interface TreinamentosPanelProps {
  copy: {
    add: string
    daysAgo: string
    empty: string
    hint: string
    impeditive: string
    none: string
    required: string
    title: string
    validity: string
  }
}

type Linha = {
  concluido_em: number | null
  id: string
  obrigatorio: boolean
  validade_dias: number | null
}

const DIA_MS = 24 * 60 * 60 * 1000

export function TreinamentosPanel({ copy }: TreinamentosPanelProps) {
  const [form, setForm] = useState({ dias: '', id: '', obrigatorio: true, validade: '' })
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [impeditivos, setImpeditivos] = useState<{ id: string; situacao: string }[]>([])
  const [error, setError] = useState('')

  const adicionar = () => {
    const id = form.id.trim()
    const dias = Number(form.dias.trim())
    const validade = form.validade.trim() ? Number(form.validade.trim()) : null

    if (!id || !Number.isFinite(dias) || dias < 0) {
      setError('Informe o nome e ha quantos dias foi concluido.')

      return
    }

    setError('')
    setLinhas([
      ...linhas,
      {
        concluido_em: Date.now() - dias * DIA_MS,
        id,
        obrigatorio: form.obrigatorio,
        validade_dias: validade !== null && Number.isFinite(validade) && validade > 0 ? validade : null
      }
    ])
    setForm({ dias: '', id: '', obrigatorio: true, validade: '' })
    setImpeditivos([])
  }

  const conferir = async () => {
    setError('')

    try {
      setImpeditivos(await treinamentosImpeditivos(linhas, Date.now()))
    } catch {
      setError(copy.hint)
    }
  }

  return (
    <section className="grid gap-3 rounded-lg border border-(--ui-border) p-4">
      <h2 className="text-[length:var(--conversation-caption-font-size)] font-medium text-foreground">{copy.title}</h2>
      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">{copy.title}</span>
          <input
            className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
            onChange={event => setForm({ ...form, id: event.target.value })}
            value={form.id}
          />
        </label>

        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">{copy.validity}</span>
          <input
            className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
            inputMode="numeric"
            onChange={event => setForm({ ...form, validade: event.target.value })}
            value={form.validade}
          />
        </label>

        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">{copy.daysAgo}</span>
          <input
            className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
            inputMode="numeric"
            onChange={event => setForm({ ...form, dias: event.target.value })}
            value={form.dias}
          />
        </label>

        <label className="flex items-end gap-2 pb-1 text-[length:var(--conversation-caption-font-size)] text-foreground">
          <input
            checked={form.obrigatorio}
            onChange={event => setForm({ ...form, obrigatorio: event.target.checked })}
            type="checkbox"
          />
          {copy.required}
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={adicionar} variant="ghost">
          {copy.add}
        </Button>
        <Button disabled={linhas.length === 0} onClick={() => void conferir()}>
          {copy.title}
        </Button>
      </div>

      {error ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{error}</p>
      ) : null}

      {linhas.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          {linhas.map((l, i) => (
            <li className="flex items-center justify-between" key={`${l.id}-${i}`}>
              <span className="text-foreground">
                {l.id}
                {l.obrigatorio ? ` · ${copy.required}` : ''}
                {l.validade_dias === null ? '' : ` · ${l.validade_dias}d`}
              </span>
              <Button
                onClick={() => {
                  setLinhas(linhas.filter((_, j) => j !== i))
                  setImpeditivos([])
                }}
                variant="ghost"
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}

      {linhas.length > 0 && impeditivos.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.none}</p>
      ) : null}

      {impeditivos.length > 0 ? (
        <div className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <p className="text-foreground">{copy.impeditive}</p>
          <ul className="flex flex-col gap-1">
            {impeditivos.map(item => (
              <li className="text-(--ui-danger)" key={item.id}>
                {item.id} · {item.situacao}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

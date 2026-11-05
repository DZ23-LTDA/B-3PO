/**
 * Contagem fisica na tela de estoque (rodada 205).
 *
 * A r186 implementou o planejamento e o canal; faltavam a API (feita nesta rodada) e a tela.
 *
 * O PRINCIPIO QUE APARECE NA INTERFACE
 *
 * A contagem NAO SOBRESCREVE o saldo: cada diferenca vira movimento. Por isso a tela mostra o que VAI acontecer
 * (entrada para sobra, saida para falta) antes de aplicar — o usuario ve o efeito no ledger antes de gravar.
 *
 * Contagem que ja bate nao gera movimento, e a tela diz isso explicitamente em vez de omitir.
 */

import { useState } from 'react'

import { registrarInventario, type ContagemRow } from '@/api/inventory'

import { Button } from '@/components/ui/button'

export interface InventarioPanelProps {
  /** Saldo atual por SKU, em milesimos. */
  balances: Record<string, number>
  copy: {
    apply: string
    empty: string
    hint: string
    ignored: string
    noDifference: string
    quantity: string
    result: string
    sku: string
    title: string
  }
}

const CAMPO =
  'rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)'

function mili(texto: string): number {
  const valor = Number(texto.trim().replace(',', '.'))

  return Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 1000) : Number.NaN
}

export function InventarioPanel({ balances, copy }: InventarioPanelProps) {
  const [form, setForm] = useState({ contado: '', sku: '' })
  const [linhas, setLinhas] = useState<ContagemRow[]>([])
  const [resultado, setResultado] = useState<null | { ajustes: number; ignoradas: string[]; sem_diferenca: string[] }>(
    null
  )
  const [error, setError] = useState('')

  const adicionar = () => {
    const sku = form.sku.trim()
    const contado = mili(form.contado)

    if (!sku || !Number.isFinite(contado)) {
      setError('Informe o SKU e a quantidade contada.')

      return
    }

    setError('')
    // Recontagem do mesmo SKU substitui: o contador que recontou quis corrigir o numero anterior.
    setLinhas([...linhas.filter(l => l.product_sku !== sku), { contado_milli: contado, product_sku: sku }])
    setForm({ contado: '', sku: '' })
    setResultado(null)
  }

  const aplicar = async () => {
    if (linhas.length === 0) return

    setError('')
    // Id unico por aplicacao: repetir a mesma contagem duas vezes gera refs diferentes e ajustaria duas vezes.
    const r = await registrarInventario(`inv-${Date.now()}`, linhas)

    if ('error' in r) {
      setError(r.error)

      return
    }

    setResultado(r)
    setLinhas([])
  }

  /** O efeito que a contagem teria hoje, antes de aplicar. */
  const efeito = (linha: ContagemRow): null | { diferenca: number; tipo: 'entrada' | 'saida' } => {
    const saldo = balances[linha.product_sku]

    if (typeof saldo !== 'number') return null

    const diferenca = linha.contado_milli - saldo

    if (diferenca === 0) return { diferenca: 0, tipo: 'entrada' }

    return { diferenca, tipo: diferenca > 0 ? 'entrada' : 'saida' }
  }

  return (
    <section className="grid gap-3 rounded-lg border border-(--ui-border) p-4">
      <h2 className="text-[length:var(--conversation-caption-font-size)] font-medium text-foreground">{copy.title}</h2>
      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">{copy.sku}</span>
          <input
            className={CAMPO}
            onChange={event => setForm({ ...form, sku: event.target.value })}
            value={form.sku}
          />
        </label>
        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">{copy.quantity}</span>
          <input
            className={CAMPO}
            inputMode="decimal"
            onChange={event => setForm({ ...form, contado: event.target.value })}
            value={form.contado}
          />
        </label>
        <div className="flex items-end">
          <Button onClick={adicionar} variant="ghost">
            {copy.quantity}
          </Button>
        </div>
      </div>

      {linhas.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          {linhas.map(l => {
            const e = efeito(l)

            return (
              <li className="flex items-center justify-between" key={l.product_sku}>
                <span className="text-foreground">
                  {l.product_sku} · {(l.contado_milli / 1000).toFixed(0)}
                  {e === null
                    ? ` · ${copy.ignored}`
                    : e.diferenca === 0
                      ? ` · ${copy.noDifference}`
                      : ` · ${e.tipo === 'entrada' ? '+' : ''}${(e.diferenca / 1000).toFixed(0)}`}
                </span>
                <Button onClick={() => setLinhas(linhas.filter(x => x.product_sku !== l.product_sku))} variant="ghost">
                  ×
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={linhas.length === 0} onClick={() => void aplicar()}>
          {copy.apply}
        </Button>
      </div>

      {error ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{error}</p>
      ) : null}

      {resultado ? (
        <div className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <p className="text-foreground">
            {copy.result}: {resultado.ajustes}
          </p>
          {resultado.sem_diferenca.length > 0 ? (
            <p className="text-(--ui-text-tertiary)">
              {copy.noDifference}: {resultado.sem_diferenca.join(', ')}
            </p>
          ) : null}
          {resultado.ignoradas.length > 0 ? (
            <p className="text-(--ui-text-tertiary)">
              {copy.ignored}: {resultado.ignoradas.join(', ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

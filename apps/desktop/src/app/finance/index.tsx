import { useCallback, useEffect, useState } from 'react'

import {
  addEntry,
  amountValue,
  dueFromInput,
  dueLabel,
  financeAvailable,
  isOverdue,
  listEntries,
  loadCostCenters,
  loadTotals,
  settleEntry,
  type FinanceEntryRow,
  type FinanceTotalsRow
} from '@/api/finance'
import { priceLabel } from '@/api/catalog'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

/**
 * Tela financeira.
 *
 * Os totais vêm do processo principal, derivados dos lançamentos. A tela não soma nada — se somasse,
 * haveria dois números possíveis para a mesma pergunta.
 *
 * "Vencido" é calculado contra o relógio agora, não é uma marca gravada: um lançamento que venceu
 * ontem precisa aparecer vencido hoje sem ninguém tocar nele.
 */
export function FinanceView() {
  const { t } = useI18n()
  const copy = t.settings.finance

  const [centros, setCentros] = useState<Record<string, { pago_cents: number; pendente_cents: number }>>({})
  const [entries, setEntries] = useState<null | FinanceEntryRow[]>(null)
  const [totals, setTotals] = useState<FinanceTotalsRow | null>(null)
  const [failure, setFailure] = useState<null | string>(null)
  const [kind, setKind] = useState('receber')
  const [centro, setCentro] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [saving, setSaving] = useState(false)

  const disponivel = financeAvailable()

  const carregar = useCallback(async () => {
    try {
      const [lista, totais, porCentro] = await Promise.all([listEntries(), loadTotals(), loadCostCenters()])

      setCentros(porCentro)
      setEntries(lista)
      setTotals(totais)
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setEntries([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const erroDe = (chave: string): string => {
    const mapa: Record<string, string> = {
      amount_required: copy.invalidAmount,
      due_at_required: copy.invalidDue,
      lancamento_ja_pago: copy.alreadyPaid,
      lancamento_pago_imutavel: copy.alreadyPaid,
      ref_duplicado: copy.duplicateRef
    }

    return mapa[chave] ?? chave
  }

  async function lancar() {
    const centavos = amountValue(valor)
    const vence = dueFromInput(vencimento)

    if (centavos <= 0) {
      setFailure(copy.invalidAmount)
      return
    }

    if (vence <= 0) {
      setFailure(copy.invalidDue)
      return
    }

    setSaving(true)

    try {
      // `''` = nao alocado. O store trata assim e a tela nao inventa um centro.
      const r = await addEntry({
        amount_cents: centavos,
        cost_center: centro.trim(),
        description: descricao.trim(),
        due_at: vence,
        kind
      })

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setCentro('')
        setDescricao('')
        setValor('')
        setVencimento('')
        await carregar()
      }
    } catch {
      setFailure(copy.loadFailed)
    } finally {
      setSaving(false)
    }
  }

  const cartao = (rotulo: string, valor: number, destaque = false) => (
    <div className="rounded-lg border border-(--ui-border) px-3 py-2">
      <div className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{rotulo}</div>
      <div className={destaque ? 'text-foreground font-semibold text-(--ui-danger)' : 'font-semibold text-foreground'}>
        {priceLabel(valor)}
      </div>
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

      {!disponivel ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.unavailable}</p>
      ) : (
        <>
          {totals ? (
            <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {cartao(copy.openReceivable, totals.openReceivableCents)}
              {cartao(copy.openPayable, totals.openPayableCents)}
              {cartao(copy.overdue, totals.overdueCents, totals.overdueCents > 0)}
              {cartao(copy.paidReceivable, totals.paidReceivableCents)}
              {cartao(copy.paidPayable, totals.paidPayableCents)}
            </section>
          ) : null}

          <section className="grid gap-2 rounded-lg border border-(--ui-border) p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.kind}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setKind(event.target.value)}
                value={kind}
              >
                <option value="receber">{copy.kinds.receber}</option>
                <option value="pagar">{copy.kinds.pagar}</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.description}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setDescricao(event.target.value)}
                value={descricao}
              />
            </label>

            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.amount}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                inputMode="decimal"
                onChange={event => setValor(event.target.value)}
                value={valor}
              />
            </label>

            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.due}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setVencimento(event.target.value)}
                type="date"
                value={vencimento}
              />
            </label>

            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.costCenter}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setCentro(event.target.value)}
                value={centro}
              />
            </label>

            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <Button disabled={saving} onClick={() => void lancar()}>
                {copy.add}
              </Button>
            </div>
          </section>

          {failure ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
          ) : null}

          {entries === null ? (
            <Loader />
          ) : entries.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
          ) : (
            <table className="w-full border-collapse text-left text-[length:var(--conversation-caption-font-size)]">
              <thead>
                <tr className="text-(--ui-text-tertiary)">
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.kind}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.description}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.due}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.amount}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.status}</th>
                  <th className="border-b border-(--ui-border) py-1 font-medium" />
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id}>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                      {copy.kinds[entry.kind] ?? entry.kind}
                    </td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">{entry.description || '—'}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2">
                      <span className={isOverdue(entry) ? 'text-(--ui-danger)' : 'text-(--ui-text-secondary)'}>
                        {dueLabel(entry.due_at)}
                      </span>
                    </td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">{priceLabel(entry.amount_cents)}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                      {copy.statuses[entry.status] ?? entry.status}
                    </td>
                    <td className="border-b border-(--ui-border) py-1">
                      <div className="flex justify-end">
                        {entry.status === 'aberto' ? (
                          <Button onClick={() => void settleEntry(entry.id).then(carregar)} variant="ghost">
                            {copy.settle}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Centros de custo: derivados dos lancamentos, nao somados aqui. `''` aparece como nao alocado. */}
          {Object.keys(centros).length > 0 ? (
            <section className="flex flex-col gap-1">
              <h2 className="text-[length:var(--conversation-caption-font-size)] font-medium text-foreground">
                {copy.costCenters}
              </h2>
              <table className="w-full border-collapse text-left text-[length:var(--conversation-caption-font-size)]">
                <thead>
                  <tr className="text-(--ui-text-tertiary)">
                    <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.costCenter}</th>
                    <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.paid}</th>
                    <th className="border-b border-(--ui-border) py-1 font-medium">{copy.open}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(centros)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([centro, total]) => (
                      <tr key={centro || '(vazio)'}>
                        <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">
                          {centro || copy.noCostCenter}
                        </td>
                        <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                          {priceLabel(total.pago_cents)}
                        </td>
                        <td className="border-b border-(--ui-border) py-1 text-(--ui-text-secondary)">
                          {priceLabel(total.pendente_cents)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

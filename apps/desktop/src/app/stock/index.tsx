import { useCallback, useEffect, useMemo, useState } from 'react'

import { listProducts, type ProductRow } from '@/api/catalog'
import {
  appendMovement,
  inventoryAvailable,
  isLowStock,
  isZeroStock,
  listMovements,
  loadBalances,
  MOVEMENT_KINDS,
  quantityLabel,
  type MovementKind,
  type MovementRow
} from '@/api/inventory'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

import { InventarioPanel } from './inventario-panel'

import {
  emptyStockDraft,
  filterStock,
  stockDraftToPayload,
  stockRows,
  validateStockDraft,
  type StockDraft
} from './stock-form'

/**
 * Tela de estoque.
 *
 * Mostra o saldo por produto e registra movimentações. O saldo **não** é calculado aqui: vem do
 * processo principal, que o deriva das movimentações. A tela só o exibe e formata.
 *
 * Movimentação não se apaga — corrigir é lançar o inverso. Por isso a tela não tem botão de excluir
 * lançamento: ter um sugeriria que o histórico pode ser reescrito.
 */
export function StockView() {
  const { t } = useI18n()
  const copy = t.settings.stock

  const [products, setProducts] = useState<null | ProductRow[]>(null)
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [movements, setMovements] = useState<MovementRow[]>([])
  const [failure, setFailure] = useState<null | string>(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<StockDraft>(emptyStockDraft())
  const [saving, setSaving] = useState(false)

  const disponivel = inventoryAvailable()

  const carregar = useCallback(async () => {
    try {
      const [lista, saldos, historico] = await Promise.all([listProducts(), loadBalances(), listMovements()])

      setProducts(lista)
      setBalances(saldos)
      setMovements(historico)
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setProducts([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const rows = useMemo(() => filterStock(stockRows(products ?? [], balances), query), [balances, products, query])

  const erroDe = (chave: string): string => {
    const mapa: Record<string, string> = {
      quantity_negative: copy.invalidNegative,
      quantity_required: copy.invalidQuantity,
      reason_required: copy.reasonRequired,
      ref_duplicado: copy.duplicateRef,
      saldo_insuficiente: copy.insufficientBalance,
      sku_required: copy.pickProduct
    }

    return mapa[chave] ?? chave
  }

  async function registrar() {
    const problema = validateStockDraft(draft)

    if (problema) {
      setFailure(erroDe(problema))
      return
    }

    setSaving(true)

    try {
      const resultado = await appendMovement(stockDraftToPayload(draft))

      if ('error' in resultado) {
        setFailure(erroDe(resultado.error))
      } else {
        setBalances(await loadBalances())
        setMovements(await listMovements())
        setDraft(emptyStockDraft(draft.productSku))
        setFailure(null)
      }
    } catch {
      setFailure(copy.loadFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

      {!disponivel ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.unavailable}</p>
      ) : (
        <>
          <section className="grid gap-2 rounded-lg border border-(--ui-border) p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.product}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setDraft({ ...draft, productSku: event.target.value })}
                value={draft.productSku}
              >
                <option value="">{copy.pickProduct}</option>
                {(products ?? []).map(product => (
                  <option key={product.id} value={product.sku}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.kind}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setDraft({ ...draft, kind: event.target.value as MovementKind })}
                value={draft.kind}
              >
                {MOVEMENT_KINDS.map(kind => (
                  <option key={kind} value={kind}>
                    {copy.kinds[kind]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.quantity}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                inputMode="decimal"
                onChange={event => setDraft({ ...draft, quantity: event.target.value })}
                value={draft.quantity}
              />
            </label>

            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.reason}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setDraft({ ...draft, reason: event.target.value })}
                value={draft.reason}
              />
            </label>

            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <Button disabled={saving} onClick={() => void registrar()}>
                {copy.register}
              </Button>
            </div>
          </section>

          {failure ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
          ) : null}

          <div className="flex items-center gap-2">
            <input
              className="w-full max-w-sm rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
              onChange={event => setQuery(event.target.value)}
              placeholder={copy.search}
              value={query}
              // r230: `placeholder` NAO e nome acessivel - ele desaparece ao digitar, e um leitor de tela
              // anunciava "campo de edicao" sem dizer de que. `aria-label` usa o mesmo texto do placeholder,
              // entao a tela nao muda e o campo passa a ter nome (WCAG 1.3.1 / 4.1.2).
              aria-label={copy.search}
            />
            <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
              {copy.count(rows.length)}
            </span>
          </div>

          {products === null ? (
            <Loader />
          ) : rows.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
              {(products ?? []).length === 0 ? copy.noProducts : copy.noMatch}
            </p>
          ) : (
            <table className="w-full border-collapse text-left text-[length:var(--conversation-caption-font-size)]">
              <thead>
                <tr className="text-(--ui-text-tertiary)">
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.name}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.sku}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.balance}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.sku}>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">{row.name}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">{row.sku}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2">
                      <span className={isLowStock(row.balanceMilli) ? 'text-(--ui-danger)' : 'text-foreground'}>
                        {quantityLabel(row.balanceMilli)} {copy.unitsOf[row.unit] ?? row.unit}
                      </span>
                      {/*
                        r164 do GOAL V2: ZERADO e BAIXO sao coisas diferentes.

                        `isLowStock` cobre zero (`0 < 5000`), entao a tela dizia "baixo" para um produto que acabou
                        — e um produto zerado **nao pode ser vendido**, enquanto um baixo **pode**. Alem disso, o
                        `inventory-ipc` **anuncia `stockRanOut`** no zero, e e esse o fato que as automacoes
                        consomem.

                        A frase do zerado nomeia a consequencia ("repor agora"), e nao so o estado — mesmo criterio
                        das recusas do §17: dizer o que fazer, nao so o que houve.
                      */}
                      {isZeroStock(row.balanceMilli) ? (
                        <span className="ml-2 text-(--ui-danger)">zerado — repor agora · automação avisada</span>
                      ) : isLowStock(row.balanceMilli) ? (
                        <span className="ml-2 text-(--ui-text-tertiary)">{copy.low}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <InventarioPanel
            balances={balances}
            copy={{
              apply: copy.inventoryApply,
              empty: copy.inventoryEmpty,
              hint: copy.inventoryHint,
              ignored: copy.inventoryIgnored,
              noDifference: copy.inventoryNoDifference,
              quantity: copy.inventoryQuantity,
              result: copy.inventoryResult,
              sku: copy.inventorySku,
              title: copy.inventoryTitle
            }}
          />

          <section className="flex flex-col gap-1">
            <h2 className="text-[length:var(--conversation-caption-font-size)] font-medium text-foreground">{copy.recent}</h2>
            {movements.length === 0 ? (
              <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.noMovements}</p>
            ) : (
              <ul className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-secondary)">
                {[...movements]
                  .reverse()
                  .slice(0, 10)
                  .map(movement => (
                    <li key={movement.id}>
                      {copy.kinds[movement.kind]} · {movement.product_sku} · {quantityLabel(movement.quantity_milli)}
                      {movement.reason ? ` · ${movement.reason}` : ''}
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'

import { catalogAvailable, listProducts, priceLabel, removeProduct, saveProduct, type ProductRow } from '@/api/catalog'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

import {
  draftFrom,
  draftToPayload,
  emptyDraft,
  filterProducts,
  validateDraft,
  type ProductDraft
} from './product-form'

/**
 * Tela de produtos.
 *
 * O dado vive no disco do usuário (processo principal); esta tela lista, cadastra, edita e remove. Sem
 * bridge — a versão web — ela explica por que não há produtos, em vez de mostrar uma lista vazia que
 * parece "nenhum produto cadastrado".
 *
 * O total não é calculado aqui: preço e custo vão em centavos para o processo principal, que valida de
 * novo. Esta tela só antecipa o erro óbvio para o usuário não perder a digitação.
 */
export function ProductsView() {
  const { t } = useI18n()
  const copy = t.settings.products

  const [products, setProducts] = useState<null | ProductRow[]>(null)
  const [failure, setFailure] = useState<null | string>(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft())
  const [editingId, setEditingId] = useState<null | string>(null)
  const [saving, setSaving] = useState(false)

  const disponivel = catalogAvailable()

  const carregar = useCallback(async () => {
    try {
      setProducts(await listProducts())
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setProducts([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) {
      void carregar()
    }
  }, [carregar, disponivel])

  const visible = useMemo(() => filterProducts(products ?? [], query), [products, query])

  const erroDe = (chave: string): string => {
    const mapa: Record<string, string> = {
      cost_invalid: copy.invalidCost,
      name_required: copy.invalidName,
      price_invalid: copy.invalidPrice,
      sku_duplicado: copy.duplicateSku,
      sku_required: copy.invalidSku
    }

    // Código sem tradução aparece cru: esconder o erro do backend deixaria a tela sem explicação.
    return mapa[chave] ?? chave
  }

  async function enviar() {
    const problema = validateDraft(draft)

    if (problema) {
      setFailure(erroDe(problema))
      return
    }

    setSaving(true)

    try {
      const resultado = await saveProduct(draftToPayload(draft, editingId ?? undefined))

      if ('error' in resultado) {
        setFailure(erroDe(resultado.error))
      } else {
        setProducts(resultado.products)
        setDraft(emptyDraft())
        setEditingId(null)
        setFailure(null)
      }
    } catch {
      setFailure(copy.loadFailed)
    } finally {
      setSaving(false)
    }
  }

  async function remover(product: ProductRow) {
    setProducts(await removeProduct(product.id))

    if (editingId === product.id) {
      setDraft(emptyDraft())
      setEditingId(null)
    }
  }

  function editar(product: ProductRow) {
    setDraft(draftFrom(product))
    setEditingId(product.id)
    setFailure(null)
  }

  const campo = (rotulo: string, valor: string, aoMudar: (v: string) => void, extra?: { inputMode?: 'decimal' }) => (
    <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
      <span className="text-(--ui-text-tertiary)">{rotulo}</span>
      <input
        className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
        inputMode={extra?.inputMode}
        onChange={event => aoMudar(event.target.value)}
        value={valor}
      />
    </label>
  )

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
            {campo(copy.name, draft.name, v => setDraft({ ...draft, name: v }))}
            {campo(copy.sku, draft.sku, v => setDraft({ ...draft, sku: v }))}
            {campo(copy.price, draft.price, v => setDraft({ ...draft, price: v }), { inputMode: 'decimal' })}
            {campo(copy.cost, draft.cost, v => setDraft({ ...draft, cost: v }), { inputMode: 'decimal' })}
            {campo(copy.category, draft.category, v => setDraft({ ...draft, category: v }))}
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.unit}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setDraft({ ...draft, unit: event.target.value })}
                value={draft.unit}
              >
                {Object.entries(copy.units).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button disabled={saving} onClick={() => void enviar()}>
                {editingId ? copy.saveEdit : copy.save}
              </Button>
              {editingId ? (
                <Button
                  onClick={() => {
                    setDraft(emptyDraft())
                    setEditingId(null)
                    setFailure(null)
                  }}
                  variant="ghost"
                >
                  {copy.cancel}
                </Button>
              ) : null}
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
            />
            <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
              {copy.count(visible.length)}
            </span>
          </div>

          {products === null ? (
            <Loader />
          ) : visible.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
              {products.length === 0 ? copy.empty : copy.noMatch}
            </p>
          ) : (
            <table className="w-full border-collapse text-left text-[length:var(--conversation-caption-font-size)]">
              <thead>
                <tr className="text-(--ui-text-tertiary)">
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.name}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.sku}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.price}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.stock}</th>
                  <th className="border-b border-(--ui-border) py-1 font-medium" />
                </tr>
              </thead>
              <tbody>
                {visible.map(product => (
                  <tr key={product.id}>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">{product.name}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">{product.sku}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">{priceLabel(product.price_cents)}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                      {copy.units[product.unit as keyof typeof copy.units] ?? product.unit}
                    </td>
                    <td className="border-b border-(--ui-border) py-1">
                      <div className="flex justify-end gap-1">
                        <Button onClick={() => editar(product)} variant="ghost">
                          {copy.edit}
                        </Button>
                        <Button onClick={() => void remover(product)} variant="ghost">
                          {copy.remove}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </main>
  )
}

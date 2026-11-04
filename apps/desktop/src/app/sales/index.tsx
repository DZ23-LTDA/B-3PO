import { useCallback, useEffect, useMemo, useState } from 'react'

import { listProducts, priceLabel, type ProductRow } from '@/api/catalog'
import { loadBalances, quantityLabel } from '@/api/inventory'
import {
  cancelSale,
  draftPrice,
  draftQuantity,
  draftTotal,
  listSales,
  salePayload,
  salesAvailable,
  saveSale,
  SALE_STATUS_LABEL,
  type DraftItem,
  type SaleRow
} from '@/api/sales'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

/**
 * Tela de vendas.
 *
 * Monta um pedido com itens do catálogo e fatura. O total mostrado durante a montagem é uma estimativa
 * local — o total que vale é o que o processo principal calcula e grava. A tela nunca envia total.
 *
 * Faturar atravessa três domínios: a venda, a baixa no estoque e a receita. Quando falta saldo, o
 * processo principal recusa **antes** de gravar qualquer coisa, e é isso que a mensagem na tela reflete.
 */
export function SalesView() {
  const { t } = useI18n()
  const copy = t.settings.sales

  const [products, setProducts] = useState<ProductRow[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [sales, setSales] = useState<null | SaleRow[]>(null)
  const [itens, setItens] = useState<{ productSku: string; quantityMilli: number; unitPriceCents: number }[]>([])
  const [draft, setDraft] = useState<DraftItem>({ productSku: '', quantity: '1', unitPrice: '' })
  const [failure, setFailure] = useState<null | string>(null)
  const [saving, setSaving] = useState(false)

  const disponivel = salesAvailable()

  const carregar = useCallback(async () => {
    try {
      const [listaProdutos, saldos, listaVendas] = await Promise.all([listProducts(), loadBalances(), listSales()])

      setProducts(listaProdutos)
      setBalances(saldos)
      setSales(listaVendas)
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setSales([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const estimativa = useMemo(() => draftTotal(itens), [itens])

  const erroDe = (chave: string, sku?: string): string => {
    const mapa: Record<string, string> = {
      items_required: copy.itemsRequired,
      item_quantity_required: copy.invalidQuantity,
      item_sem_identidade: copy.pickProduct,
      saldo_insuficiente: sku ? `${copy.insufficientStock} (${sku})` : copy.insufficientStock,
      venda_faturada_imutavel: copy.alreadyIssued
    }

    return mapa[chave] ?? chave
  }

  function adicionar() {
    const quantidade = draftQuantity(draft.quantity)
    const preco = draftPrice(draft.unitPrice)

    if (!draft.productSku) {
      setFailure(copy.pickProduct)
      return
    }

    if (quantidade <= 0) {
      setFailure(copy.invalidQuantity)
      return
    }

    setItens([...itens, { productSku: draft.productSku, quantityMilli: quantidade, unitPriceCents: preco }])
    setDraft({ productSku: draft.productSku, quantity: '1', unitPrice: '' })
    setFailure(null)
  }

  async function emitir(faturar: boolean) {
    if (itens.length === 0) {
      setFailure(copy.itemsRequired)
      return
    }

    setSaving(true)

    try {
      const resultado = await saveSale(salePayload(itens), faturar)

      if ('error' in resultado) {
        setFailure(erroDe(resultado.error))
      } else {
        setSales(resultado.sales)
        setItens([])
        setBalances(await loadBalances())
        setFailure(null)
      }
    } catch {
      setFailure(copy.loadFailed)
    } finally {
      setSaving(false)
    }
  }

  function escolherProduto(sku: string) {
    const produto = products.find(p => p.sku === sku)

    setDraft({
      productSku: sku,
      quantity: '1',
      unitPrice: produto ? (produto.price_cents / 100).toFixed(2).replace('.', ',') : ''
    })
  }

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
          <section className="grid gap-2 rounded-lg border border-(--ui-border) p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.product}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => escolherProduto(event.target.value)}
                value={draft.productSku}
              >
                <option value="">{copy.pickProduct}</option>
                {products
                  .filter(product => product.active)
                  .map(product => (
                    <option key={product.id} value={product.sku}>
                      {product.name} · {quantityLabel(balances[product.sku] ?? 0)} em estoque
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
              <span className="text-(--ui-text-tertiary)">{copy.unitPrice}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                inputMode="decimal"
                onChange={event => setDraft({ ...draft, unitPrice: event.target.value })}
                value={draft.unitPrice}
              />
            </label>

            <div className="flex items-end">
              <Button onClick={adicionar} variant="ghost">
                {copy.addItem}
              </Button>
            </div>
          </section>

          {itens.length > 0 ? (
            <section className="flex flex-col gap-2 rounded-lg border border-(--ui-border) p-4">
              <ul className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
                {itens.map((item, index) => (
                  <li className="flex items-center justify-between gap-2" key={`${item.productSku}-${index}`}>
                    <span className="text-foreground">
                      {item.productSku} · {quantityLabel(item.quantityMilli)} × {priceLabel(item.unitPriceCents)}
                    </span>
                    <Button
                      onClick={() => setItens(itens.filter((_, i) => i !== index))}
                      variant="ghost"
                    >
                      {copy.removeItem}
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                  {copy.estimate}: {priceLabel(estimativa)}
                </span>
                <div className="flex gap-2">
                  <Button disabled={saving} onClick={() => void emitir(false)} variant="ghost">
                    {copy.saveDraft}
                  </Button>
                  <Button disabled={saving} onClick={() => void emitir(true)}>
                    {copy.issue}
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {failure ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
          ) : null}

          {sales === null ? (
            <Loader />
          ) : sales.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
          ) : (
            <table className="w-full border-collapse text-left text-[length:var(--conversation-caption-font-size)]">
              <thead>
                <tr className="text-(--ui-text-tertiary)">
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.number}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.status}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.items}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.total}</th>
                  <th className="border-b border-(--ui-border) py-1 font-medium" />
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">#{sale.number}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                      {copy.statuses[sale.status] ?? SALE_STATUS_LABEL[sale.status] ?? sale.status}
                    </td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">{sale.items.length}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">{priceLabel(sale.total_cents)}</td>
                    <td className="border-b border-(--ui-border) py-1">
                      <div className="flex justify-end">
                        {sale.status === 'orcamento' || sale.status === 'pedido' ? (
                          <Button onClick={() => void cancelSale(sale.id).then(carregar)} variant="ghost">
                            {copy.cancel}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}

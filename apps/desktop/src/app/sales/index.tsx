import { useCallback, useEffect, useMemo, useState } from 'react'
import { cancelarNota, emitirNota, fiscalAvailable, fiscalErrorText, listFiscal, type FiscalRow } from '@/api/fiscal'

import { listProducts, priceLabel, type ProductRow } from '@/api/catalog'
import { loadBalances, quantityLabel } from '@/api/inventory'
import {
  cancelSale,
  draftPrice,
  draftQuantity,
  draftTotal,
  listSales,
  PAYMENT_METHODS,
  salePayload,
  salesAvailable,
  saveSale,
  SALE_STATUS_LABEL,
  type DraftItem,
  type SaleRow
} from '@/api/sales'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'

import { FiscalStatusBanner } from './fiscal-status'
import { CancelInvoiceInput } from './cancel-invoice'
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
  const fiscalDisponivel = fiscalAvailable()
  const [notas, setNotas] = useState<FiscalRow[]>([])
  const [emitindo, setEmitindo] = useState('')
  const [cancelando, setCancelando] = useState('')
  const [pagamento, setPagamento] = useState('')
  const [falhaFiscal, setFalhaFiscal] = useState('')

  const carregar = useCallback(async () => {
    setFalhaFiscal('')
    if (fiscalDisponivel) setNotas(await listFiscal().catch(() => []))
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

  function danfeDe(saleId: string): FiscalRow | null {
    return notas.find(n => n.ref === 'venda:' + saleId && n.status === 'autorizado' && n.url_danfe) ?? null
  }

  /** Existe nota autorizada, com ou sem DANFE. Cancelar nao depende de ter url para imprimir. */
  function notaAutorizada(saleId: string): boolean {
    return notas.some(n => n.ref === 'venda:' + saleId && n.status === 'autorizado')
  }

  /** Emitir nao fatura: so a venda faturada tem nota. O backend recusa o resto. */
  async function emitirNotaDaVenda(saleId: string): Promise<void> {
    setEmitindo(saleId)
    setFalhaFiscal('')
    try {
      const r = await emitirNota(saleId)

      if ('error' in r) {
        setFalhaFiscal(fiscalErrorText(r.error))
      } else {
        setNotas(await listFiscal())
      }
    } finally {
      setEmitindo('')
    }
  }

  async function cancelarNotaDaVenda(saleId: string, motivo: string): Promise<void> {
    setEmitindo(saleId)
    setFalhaFiscal('')
    try {
      const r = await cancelarNota(saleId, motivo)

      if ('error' in r) {
        setFalhaFiscal(fiscalErrorText(r.error))
      } else {
        setNotas(await listFiscal())
      }
    } finally {
      setEmitindo('')
    }
  }

  async function abrirDanfe(saleId: string): Promise<void> {
    const nota = danfeDe(saleId)

    if (nota?.url_danfe) window.open(nota.url_danfe, '_blank', 'noopener,noreferrer')
  }

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

    /*
     * r76 — faturamento de R$ 0,00.
     *
     * O processo principal NAO lanca conta a receber quando `total_cents <= 0`
     * (`receivableForSale` devolve null), e isso esta certo: conta a receber de zero e lixo. O que
     * faltava era a tela DIZER isso — a venda saia sem aviso, e o usuario descobria depois que nao
     * havia nada em "A receber". O aviso e explicito sobre a consequencia, nao sobre o numero.
     */
    if (faturar && estimativa === 0 && !window.confirm(copy.courtesyNotice)) {
      return
    }

    setSaving(true)

    try {
      const resultado = await saveSale(salePayload(itens, '', pagamento || undefined), faturar)

      if ('error' in resultado) {
        setFailure(erroDe(resultado.error))
      } else {
        setSales(resultado.sales)
        setItens([])
        setPagamento('')
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

      <FiscalStatusBanner />

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
              <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
                <span className="text-(--ui-text-tertiary)">{copy.paymentMethod}</span>
                <select
                  className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                  onChange={evento => setPagamento(evento.target.value)}
                  value={pagamento}
                >
                  <option value="">{copy.paymentNone}</option>
                  {PAYMENT_METHODS.map(forma => (
                    <option key={forma} value={forma}>
                      {forma}
                    </option>
                  ))}
                </select>
              </label>
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
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">
                  {priceLabel(sale.total_cents)}
                  {/* r76: faturada com total zero nao gera conta a receber — a linha diz o porque. */}
                  {sale.status === 'faturado' && sale.total_cents === 0 ? (
                    <span className="ml-2 text-(--ui-text-tertiary)">({copy.courtesy})</span>
                  ) : null}
                </td>
                    <td className="border-b border-(--ui-border) py-1">
                      <div className="flex justify-end gap-1">
                        {sale.status === 'orcamento' || sale.status === 'pedido' ? (
                          <Button onClick={() => void cancelSale(sale.id).then(carregar)} variant="ghost">
                            {copy.cancel}
                          </Button>
                        ) : null}
                        {sale.status === 'faturado' && fiscalDisponivel ? (
                          <>
                            <Button
                              disabled={emitindo === sale.id}
                              onClick={() => void emitirNotaDaVenda(sale.id)}
                              variant="ghost"
                            >
                              {emitindo === sale.id ? copy.emitting : copy.emitInvoice}
                            </Button>
                            {danfeDe(sale.id) ? (
                              <Button onClick={() => void abrirDanfe(sale.id)} variant="ghost">
                                {copy.printInvoice}
                              </Button>
                            ) : null}
                            {notaAutorizada(sale.id) && cancelando === sale.id ? (
                              <CancelInvoiceInput
                                busy={emitindo === sale.id}
                                onCancel={() => setCancelando('')}
                                onConfirm={motivo => void cancelarNotaDaVenda(sale.id, motivo)}
                              />
                            ) : notaAutorizada(sale.id) ? (
                              <Button onClick={() => setCancelando(sale.id)} variant="ghost">
                                {copy.cancelInvoice}
                              </Button>
                            ) : null}
                          </>
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
    </main>
  )
}
import { useCallback, useEffect, useState } from 'react'

import { listProducts, priceLabel, type ProductRow } from '@/api/catalog'
import { loadBalances, quantityLabel } from '@/api/inventory'
import {
  costValue,
  listOrders,
  listSuppliers,
  orderPayload,
  purchasesAvailable,
  quantityValue,
  saveOrder,
  saveSupplier,
  type PurchaseOrderRow,
  type SupplierRow
} from '@/api/purchases'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

import { CotacaoPanel } from './cotacao-panel'

/**
 * Tela de compras.
 *
 * Dois blocos: fornecedor e pedido. Receber um pedido entra mercadoria no estoque — a tela recarrega os
 * saldos depois, porque o efeito acontece em outro domínio.
 *
 * O total nunca é enviado: o processo principal recalcula dos itens.
 */
export function ComprasView() {
  const { t } = useI18n()
  const copy = t.settings.compras

  const [suppliers, setSuppliers] = useState<null | SupplierRow[]>(null)
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [failure, setFailure] = useState<null | string>(null)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [sku, setSku] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [custo, setCusto] = useState('')
  const [itens, setItens] = useState<{ productSku: string; quantityMilli: number; unitCostCents: number }[]>([])
  const [saving, setSaving] = useState(false)

  const disponivel = purchasesAvailable()

  const carregar = useCallback(async () => {
    try {
      const [listaFornecedores, listaPedidos, listaProdutos, saldos] = await Promise.all([
        listSuppliers(),
        listOrders(),
        listProducts(),
        loadBalances()
      ])

      setSuppliers(listaFornecedores)
      setOrders(listaPedidos)
      setProducts(listaProdutos)
      setBalances(saldos)
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setSuppliers([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const erroDe = (chave: string): string => {
    const mapa: Record<string, string> = {
      fornecedor_duplicado: copy.duplicateSupplier,
      item_quantity_required: copy.invalidQuantity,
      item_sem_sku: copy.pickProduct,
      items_required: copy.itemsRequired,
      name_required: copy.supplierNameRequired,
      pedido_recebido_imutavel: copy.alreadyReceived,
      supplier_required: copy.supplierRequired
    }

    return mapa[chave] ?? chave
  }

  async function cadastrarFornecedor() {
    if (!nome.trim()) {
      setFailure(copy.supplierNameRequired)
      return
    }

    setSaving(true)

    try {
      const r = await saveSupplier({ cnpj, name: nome.trim() })

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setSuppliers(r.suppliers)
        setNome('')
        setCnpj('')
        setFailure(null)
      }
    } finally {
      setSaving(false)
    }
  }

  function adicionarItem() {
    const q = quantityValue(quantidade)
    const c = costValue(custo)

    if (!sku) {
      setFailure(copy.pickProduct)
      return
    }

    if (q <= 0) {
      setFailure(copy.invalidQuantity)
      return
    }

    setItens([...itens, { productSku: sku, quantityMilli: q, unitCostCents: c }])
    setQuantidade('')
    setCusto('')
    setFailure(null)
  }

  async function emitir(receber: boolean) {
    if (!fornecedor) {
      setFailure(copy.supplierRequired)
      return
    }

    if (itens.length === 0) {
      setFailure(copy.itemsRequired)
      return
    }

    setSaving(true)

    try {
      const r = await saveOrder(orderPayload(fornecedor, itens), receber)

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setOrders(r.orders)
        setItens([])
        // Receber mexeu no estoque: recarrega para a tela não mostrar saldo velho.
        setBalances(await loadBalances())
        setFailure(null)
      }
    } finally {
      setSaving(false)
    }
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
              <span className="text-(--ui-text-tertiary)">{copy.supplierName}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setNome(event.target.value)}
                value={nome}
              />
            </label>
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.cnpj}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setCnpj(event.target.value)}
                value={cnpj}
              />
            </label>
            <div className="flex items-end">
              <Button disabled={saving} onClick={() => void cadastrarFornecedor()} variant="ghost">
                {copy.addSupplier}
              </Button>
            </div>
          </section>

          <section className="grid gap-2 rounded-lg border border-(--ui-border) p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.supplier}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setFornecedor(event.target.value)}
                value={fornecedor}
              >
                <option value="">{copy.pickSupplier}</option>
                {(suppliers ?? []).map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.product}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setSku(event.target.value)}
                value={sku}
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
                onChange={event => setQuantidade(event.target.value)}
                value={quantidade}
              />
            </label>
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.unitCost}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                inputMode="decimal"
                onChange={event => setCusto(event.target.value)}
                value={custo}
              />
            </label>
            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <Button onClick={adicionarItem} variant="ghost">
                {copy.addItem}
              </Button>
            </div>
          </section>

          {itens.length > 0 ? (
            <section className="flex flex-col gap-2 rounded-lg border border-(--ui-border) p-4">
              <ul className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
                {itens.map((item, index) => (
                  <li className="flex items-center justify-between" key={`${item.productSku}-${index}`}>
                    <span className="text-foreground">
                      {item.productSku} · {quantityLabel(item.quantityMilli)} × {priceLabel(item.unitCostCents)}
                    </span>
                    <Button onClick={() => setItens(itens.filter((_, i) => i !== index))} variant="ghost">
                      {copy.removeItem}
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button disabled={saving} onClick={() => void emitir(false)} variant="ghost">
                  {copy.saveOrder}
                </Button>
                <Button disabled={saving} onClick={() => void emitir(true)}>
                  {copy.receive}
                </Button>
              </div>
            </section>
          ) : null}

          {failure ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
          ) : null}

          {/* Cotacao: compara fornecedores para o volume do pedido. Nao salva e nao cria pedido — compara e
              mostra; transformar proposta em compromisso e a decisao seguinte, com aprovacao propria. */}
          <CotacaoPanel
            copy={{
              add: copy.addItem,
              compare: copy.compare,
              empty: copy.empty,
              price: copy.unitCost,
              quantity: copy.quantity,
              remove: copy.removeItem,
              result: copy.bestOffer,
              supplier: copy.supplier
            }}
            quantidade={quantityValue(quantidade)}
            supplierNames={Object.fromEntries((suppliers ?? []).map(s => [s.id, s.name]))}
          />

          {suppliers === null ? (
            <Loader />
          ) : orders.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
          ) : (
            <table className="w-full border-collapse text-left text-[length:var(--conversation-caption-font-size)]">
              <thead>
                <tr className="text-(--ui-text-tertiary)">
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.number}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.supplier}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.items}</th>
                  <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.total}</th>
                  <th className="border-b border-(--ui-border) py-1 font-medium">{copy.status}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">#{order.number}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                      {(suppliers ?? []).find(s => s.id === order.supplier_id)?.name ?? order.supplier_id}
                    </td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">{order.items.length}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">{priceLabel(order.total_cents)}</td>
                    <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                      {copy.statuses[order.status] ?? order.status}
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

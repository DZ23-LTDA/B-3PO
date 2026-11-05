import { useCallback, useEffect, useState } from 'react'

import { listProducts, priceLabel, type ProductRow } from '@/api/catalog'
import { listActors } from '@/api/admin'
import { loadBalances, quantityLabel } from '@/api/inventory'
import {
  costValue,
  listOrders,
  listSuppliers,
  orderPayload,
  listQuotations,
  purchasesAvailable,
  removeQuotation,
  saveQuotation,
  type CotacaoGravadaRow,
  quantityValue,
  saveOrder,
  saveSupplier,
  type PurchaseOrderRow,
  type SupplierRow,
  type LimiteRow,
  type SolicitacaoRow,
  APROVACAO_ERRO,
  aprovarPedido,
  atenderSolicitacao as atenderSolicitacaoApi,
  criarSolicitacao,
  definirLimite,
  lerLimite,
  limiteLabel,
  listarSolicitacoes,
  mudarSolicitacao,
  solicitacaoErroText,
  solicitacoesAbertas
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

  // r28 do GOAL V2: o limite e a aprovacao ganharam tela. O backend os tem desde r26/r27; sem estes
  // estados, a tela nao os alcanca — o padrao da r2, na quarta camada.
  const [limite, setLimite] = useState<LimiteRow | null>(null)
  const [limiteValor, setLimiteValor] = useState('')
  const [limiteAprovadores, setLimiteAprovadores] = useState('')
  const [aprovacaoErro, setAprovacaoErro] = useState('')
  const [cotacoesGravadas, setCotacoesGravadas] = useState<CotacaoGravadaRow[]>([])
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

  // r40 do GOAL V2: a conferência no recebimento — a última camada da etapa 7 do §26.
  //
  // Antes, receber assumia que chegou o que foi pedido: um pedido de 100 que chegava com 80 entrava com
  // 100 no estoque. O canal aceita `conferidos` desde a r39; aqui é onde alguém os digita.
  //
  // Vazio por SKU = "não contei este item", e o pedido vale. Diferente de "0", que é "não chegou nada".
  const [conferidos, setConferidos] = useState<Record<string, string>>({})

  // r43 do GOAL V2: a fila de solicitações — etapa 1 do §26.
  //
  // Antes dela, o fluxo começava na cotação: alguém já sabia o que queria e por quanto, e nada registrava
  // POR QUÊ. A solicitação é o único registro que responde "por que esta compra foi feita?".
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRow[]>([])
  const [solSku, setSolSku] = useState('')
  const [solQtd, setSolQtd] = useState('')
  const [solMotivo, setSolMotivo] = useState('')
  const [solErro, setSolErro] = useState('')
  // r46: o fornecedor escolhido por solicitacao. Sem ele, o pedido nao pode nascer.
  const [solFornecedor, setSolFornecedor] = useState<Record<string, string>>({})

  const disponivel = purchasesAvailable()

  const carregar = useCallback(async () => {
    try {
        const [listaFornecedores, listaPedidos, listaProdutos, saldos, listaCotacoes, limiteAtual, listaSolicitacoes] =
          await Promise.all([
        listSuppliers(),
        listOrders(),
        listProducts(),
        loadBalances(),
        // As propostas gravadas voltam com a tela: era o defeito da r194, fechado na r198 e ligado aqui.
        listQuotations(),
        lerLimite(),
        // r43: a fila de solicitacoes vem junto com a tela.
        listarSolicitacoes()
      ])

      setSuppliers(listaFornecedores)
      setOrders(listaPedidos)
      setProducts(listaProdutos)
      setBalances(saldos)
      setCotacoesGravadas(listaCotacoes)
      setLimite(limiteAtual)
      setSolicitacoes(listaSolicitacoes)
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
      // r40: ao RECEBER, o que foi conferido vai junto. Só as SKUs preenchidas entram — as em branco
      // significam "não contei", e o pedido vale para elas. Mandar todas como 0 zeraria o estoque de quem
      // preencheu uma linha só.
      const listaConferida = receber
        ? itens
            .filter(item => (conferidos[item.productSku] ?? '').trim() !== '')
            .map(item => ({
              // `quantityValue` JÁ devolve mili-unidades (multiplica por 1000 dentro). Multiplicar aqui de
              // novo daria um erro de 1000× que o typecheck não pega — os dois lados são `number`.
              quantity_milli: Math.max(0, quantityValue(conferidos[item.productSku] ?? '')),
              sku: item.productSku
            }))
        : []

      const payload = orderPayload(fornecedor, itens)

      if (listaConferida.length > 0) payload['conferidos'] = listaConferida

      const r = await saveOrder(payload, receber)

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setOrders(r.orders)
        setItens([])
        setConferidos({})
        // Receber mexeu no estoque: recarrega para a tela não mostrar saldo velho.
        setBalances(await loadBalances())
        setFailure(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const salvarSolicitacao = useCallback(async () => {
    setSolErro('')

    const q = quantityValue(solQtd)

    if (!solSku.trim()) { setSolErro(solicitacaoErroText('sku_obrigatorio')); return }
    if (q <= 0) { setSolErro(solicitacaoErroText('quantidade_invalida')); return }
    if (!solMotivo.trim()) { setSolErro(solicitacaoErroText('motivo_obrigatorio')); return }

    const r = await criarSolicitacao({ motivo: solMotivo, productSku: solSku, quantityMilli: q })

    if ('error' in r) {
      setSolErro(solicitacaoErroText(r.error))
    } else {
      setSolicitacoes(r.solicitacoes)
      setSolSku('')
      setSolQtd('')
      setSolMotivo('')
    }
  }, [solMotivo, solQtd, solSku])

  const atender = useCallback(async (id: string, status: 'atendida' | 'cancelada') => {
    setSolErro('')

    const r = await mudarSolicitacao(id, status)

    if ('error' in r) setSolErro(solicitacaoErroText(r.error))
    else setSolicitacoes(r.solicitacoes)
  }, [])

  /** r46: atender ESCOLHENDO o fornecedor - o caminho que cria o pedido de verdade. */
  const atenderComFornecedor = useCallback(async (id: string) => {
    setSolErro('')

    const fornecedor = solFornecedor[id] ?? ''

    if (!fornecedor) {
      setSolErro(solicitacaoErroText('fornecedor_obrigatorio'))

      return
    }

    const r = await atenderSolicitacaoApi(id, fornecedor)

    if ('error' in r) {
      setSolErro(solicitacaoErroText(r.error))
    } else {
      setSolicitacoes(r.solicitacoes)
      // O pedido nasceu: recarrega para a lista de pedidos nao ficar velha.
      setOrders(await listOrders())
    }
  }, [solFornecedor])

  const salvarLimite = useCallback(async () => {
    setAprovacaoErro('')

    const cents = limiteValor.trim() === '' ? null : Math.round(Number(limiteValor.replace(',', '.')) * 100)
    const aprovadores = limiteAprovadores.split(',').map(a => a.trim()).filter(Boolean)

    if (cents !== null && (!Number.isFinite(cents) || cents <= 0)) {
      setAprovacaoErro('Informe um valor maior que zero, ou deixe vazio para desligar o limite.')

      return
    }


    // r30 do GOAL V2: valida os aprovadores contra os atores que EXISTEM.
    //
    // Sem isto, digitar chefe quando ninguem tem esse id salva um limite que NUNCA APROVA — e o
    // erro so aparece quando alguem tenta aprovar, com o pedido ja barrado.
    if (aprovadores.length > 0) {
      const reais = new Set((await listActors()).map(a => a.id))
      const faltando = aprovadores.filter(id => !reais.has(id))

      if (faltando.length > 0) {
        setAprovacaoErro('Nao existe ator com este id: ' + faltando.join(', ') + '. Use os ids da tela de Atores.')

        return
      }
    }

    const r = await definirLimite(cents, aprovadores)

    if (r && typeof r === 'object' && 'error' in r) {
      setAprovacaoErro('Limite nao salvo: ' + String((r as { error: string }).error))
    } else {
      setLimite((r as { limite: LimiteRow }).limite)
      setLimiteValor('')
      setLimiteAprovadores('')
    }
  }, [limiteAprovadores, limiteValor])

  const aprovar = useCallback(
    async (pedidoId: string) => {
      setAprovacaoErro('')

      const r = await aprovarPedido(pedidoId)

      if (r && typeof r === 'object' && 'error' in r) {
        const codigo = String((r as { error: string }).error)

        setAprovacaoErro(APROVACAO_ERRO[codigo] ?? codigo)
      } else {
        void carregar()
      }
    },
    [carregar]
  )

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

        {/* r43 do GOAL V2: a fila de solicitacoes — etapa 1 do §26.
            Antes dela o fluxo comecava na cotacao: alguem ja sabia o que queria e por quanto, e nada
            registrava POR QUE. */}
        <section className="rounded-lg border border-(--ui-border) p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">Solicitacoes de compra</h2>
            <span className="text-xs text-(--ui-text-tertiary)">{solicitacoesAbertas(solicitacoes).length} aberta(s)</span>
          </div>
          <p className="mt-1 text-xs text-(--ui-text-tertiary)">
            O que falta comprar, e por que. Uma solicitacao atendida nao volta — reabrir faria a mesma
            necessidade pedir duas vezes.
          </p>

          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-(--ui-text-tertiary)">Produto</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setSolSku(event.target.value)}
                value={solSku}
              >
                <option value="">—</option>
                {products.map(p => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-(--ui-text-tertiary)">Quantidade</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                inputMode="decimal"
                onChange={event => setSolQtd(event.target.value)}
                value={solQtd}
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-(--ui-text-tertiary)">Por que (obrigatorio)</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setSolMotivo(event.target.value)}
                placeholder="ex.: acabou no deposito e ha venda marcada"
                value={solMotivo}
              />
            </label>
          </div>
          <div className="mt-2">
            <Button onClick={() => void salvarSolicitacao()} variant="ghost">
              Pedir
            </Button>
          </div>
          {solErro && <p className="mt-2 text-xs text-(--ui-warning)">{solErro}</p>}

          {solicitacoesAbertas(solicitacoes).length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 text-xs">
              {solicitacoesAbertas(solicitacoes).map(s => (
                <li className="flex items-center justify-between gap-2" key={s.id}>
                  <span className="text-foreground">
                    {s.product_sku} · {quantityLabel(s.quantity_milli)} — {s.motivo}
                  </span>
                  <span className="flex items-center gap-1">
                    {/* r46 do GOAL V2: o fornecedor é obrigatório porque um pedido sem fornecedor não é
                        um pedido, é uma intenção — e é a COTAÇÃO que o descobre. Sem esta escolha, o botão
                        chamava `mudarSolicitacao`, o status mudava e NENHUM pedido nascia. */}
                    <select
                      className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-1 py-0.5 text-xs text-foreground outline-none focus:border-(--ui-accent)"
                      onChange={event => setSolFornecedor({ ...solFornecedor, [s.id]: event.target.value })}
                      value={solFornecedor[s.id] ?? ''}
                    >
                      <option value="">fornecedor…</option>
                      {(suppliers ?? []).map(forn => (
                        <option key={forn.id} value={forn.id}>
                          {forn.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
                      disabled={!solFornecedor[s.id]}
                      onClick={() => void atenderComFornecedor(s.id)}
                      type="button"
                    >
                      Atender
                    </button>
                    <button
                      className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
                      onClick={() => void atender(s.id, 'cancelada')}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* r28 do GOAL V2: configuracao do limite. Antes dela, o limite so mudava editando codigo —
            e a r27 mediu que ele nem era passado na montagem, entao o controle estava inerte. */}
        <section className="rounded-lg border border-(--ui-border) p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">Limite de compra</h2>
            <span className="text-xs text-(--ui-text-tertiary)">{limiteLabel(limite?.cents ?? null)}</span>
          </div>
          <p className="mt-1 text-xs text-(--ui-text-tertiary)">
            Pedido acima do limite exige aprovacao de alguem da lista. Sem valor, o controle fica desligado.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-(--ui-text-tertiary)">Valor (R$)</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setLimiteValor(event.target.value)}
                placeholder="vazio = desligado"
                value={limiteValor}
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-(--ui-text-tertiary)">Aprovadores (ids separados por virgula)</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setLimiteAprovadores(event.target.value)}
                placeholder={limite?.aprovadores.join(', ') || 'ex.: dono, gerente'}
                value={limiteAprovadores}
              />
            </label>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Button onClick={() => void salvarLimite()} variant="ghost">
              Salvar limite
            </Button>
            {limite?.cents !== null && limite !== null && (
              <Button
                onClick={() => {
                  setLimiteValor('')
                  setLimiteAprovadores('')
                  void definirLimite(null, []).then(() => setLimite({ aprovadores: [], cents: null }))
                }}
                variant="ghost"
              >
                Desligar limite
              </Button>
            )}
          </div>
          {aprovacaoErro && <p className="mt-2 text-xs text-(--ui-warning)">{aprovacaoErro}</p>}
        </section>

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
                  <li className="flex items-center justify-between gap-2" key={`${item.productSku}-${index}`}>
                    <span className="text-foreground">
                      {item.productSku} · {quantityLabel(item.quantityMilli)} × {priceLabel(item.unitCostCents)}
                    </span>
                    {/* r40: o que CHEGOU, por item. Vazio = não contei (o pedido vale). "0" = não chegou
                        nada. A distinção é a razão de o campo ser texto e não número. */}
                    <label className="flex items-center gap-1">
                      <span className="text-(--ui-text-tertiary)">chegou</span>
                      <input
                        className="w-20 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-0.5 text-foreground outline-none focus:border-(--ui-accent)"
                        inputMode="decimal"
                        onChange={event => setConferidos({ ...conferidos, [item.productSku]: event.target.value })}
                        placeholder={quantityLabel(item.quantityMilli)}
                        value={conferidos[item.productSku] ?? ''}
                      />
                    </label>
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
              needQuantity: copy.needQuantity,
              noValidOffer: copy.noValidOffer,
              orderQuantity: copy.orderQuantity,
              prazo: copy.prazo,
              price: copy.unitCost,
              quantity: copy.quantity,
              remove: copy.removeItem,
              result: copy.bestOffer,
              supplier: copy.supplier
            }}
            gravadas={cotacoesGravadas.map(c => ({
              prazo_dias: c.prazo_dias,
              preco_unit_cents: c.preco_unit_cents,
              quantidade_disponivel: c.quantidade_disponivel,
              supplier_id: c.supplier_id
            }))}
            quantidade={quantityValue(quantidade)}
            supplierNames={Object.fromEntries((suppliers ?? []).map(s => [s.id, s.name]))}
            onGravar={proposta => {
              // Id derivado do fornecedor: recontar o mesmo fornecedor substitui, nao duplica (regra do store).
              void saveQuotation({
                id: `cot-${proposta.supplier_id}`,
                prazo_dias: proposta.prazo_dias,
                preco_unit_cents: proposta.preco_unit_cents,
                quantidade_disponivel: proposta.quantidade_disponivel,
                supplier_id: proposta.supplier_id
              }).then(r => {
                if ('cotacoes' in r) setCotacoesGravadas(r.cotacoes)
              })
            }}
            onRemover={supplierId => {
              void removeQuotation(`cot-${supplierId}`).then(setCotacoesGravadas)
            }}
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
                      <td className="border-b border-(--ui-border) py-1 pr-2">
                        {/* r28: o botao que faltava. So aparece quando o pedido e candidato a aprovacao */}
                        {order.status === 'pedido' && limite?.cents !== null && limite !== null && (
                          <button
                            className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
                            onClick={() => void aprovar(order.id)}
                            type="button"
                          >
                            Aprovar
                          </button>
                        )}
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

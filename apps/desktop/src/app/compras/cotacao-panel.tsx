/**
 * Comparacao de fornecedores na tela de compras (rodada 194, layout refeito na 196).
 *
 * Antes disso a cotacao existia e era testada em quatro camadas - regra (r188), canal (r190), preload (r192)
 * e wrapper (r193) - e o usuario nao alcancava nenhuma delas.
 *
 * O LAYOUT, E POR QUE ELE FOI REFAZER
 *
 * A r195 fotografou a tela e os campos apareciam EMPILHADOS, sem rotulo, com "Adicionar item" como texto solto.
 * A causa: `<Input>` do design system ocupa a linha inteira dentro de um `flex-wrap`, e sem `<label>` o usuario
 * nao sabe o que cada caixa e.
 *
 * O padrao correto e o da secao vizinha desta mesma tela: `grid` com colunas responsivas, cada campo num
 * `<label>` com o rotulo ACIMA. Reescrever com o padrao da casa e melhor que inventar um.
 *
 * O QUE ELE NAO FAZ
 *
 * Nao salva a cotacao e nao cria pedido. Uma cotacao e proposta; transforma-la em pedido e uma decisao
 * separada, com aprovacao propria (r182). O painel compara e mostra; quem compra decide.
 */

import { useEffect, useState } from 'react'

import { priceLabel } from '@/api/catalog'
import { escolherCotacao, type CotacaoEscolhida, type CotacaoRow } from '@/api/purchases'

import { Button } from '@/components/ui/button'

export interface CotacaoPanelProps {
  /** Quantidade que se quer comprar. Chega do formulario de pedido. */
  quantidade: number
  /** Rotulos vindos da tela, para o painel nao inventar texto proprio. */
  copy: {
    add: string
    compare: string
    empty: string
    needQuantity: string
    noValidOffer: string
    orderQuantity: string
    prazo: string
    price: string
    quantity: string
    remove: string
    result: string
    supplier: string
  }
  /** Propostas ja gravadas, carregadas ao montar. Ausente = tela nova. */
  gravadas?: CotacaoRow[]
  /** Grava a proposta. Ausente = so memoria (comportamento da r194). */
  onGravar?: (proposta: CotacaoRow) => void
  /** Remove a proposta gravada do fornecedor. */
  onRemover?: (supplierId: string) => void
  /** Nomes de fornecedor por id, para exibir o nome em vez do id cru. */
  supplierNames: Record<string, string>
}

type Proposta = CotacaoRow

const VAZIA = { prazo: '', preco: '', quantidade: '', supplier: '' }

/** Classe dos campos nativos: a mesma da secao de pedido desta tela. */
const CAMPO =
  'rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)'

function centavos(texto: string): number {
  // Aceita "12,50" e "12.50". Virgula e o separador que o usuario brasileiro digita.
  const limpo = texto.replace(/\./g, '').replace(',', '.').trim()
  const valor = Number(limpo)

  return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) : 0
}

function mili(texto: string): number {
  const valor = Number(texto.trim().replace(',', '.'))

  return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 1000) : 0
}

export function CotacaoPanel({ copy, gravadas, onGravar, onRemover, quantidade, supplierNames }: CotacaoPanelProps) {
  const [form, setForm] = useState(VAZIA)
  // O estado nasce das propostas gravadas: quem sai da tela e volta nao perde o trabalho (r198).
  const [propostas, setPropostas] = useState<Proposta[]>(() => gravadas ?? [])

  // `useState` com inicializador NAO reage a prop que chega depois. O `listQuotations` e async, entao o painel
  // monta com lista vazia e a proposta gravada so aparece se houver este efeito. A r201 mediu exatamente isso:
  // o canal gravava e a tela continuava vazia.
  useEffect(() => {
    if (gravadas) setPropostas(gravadas)
  }, [gravadas])
  const [resultado, setResultado] = useState<CotacaoEscolhida | { motivo: string } | null>(null)
  const [error, setError] = useState('')
  const [volume, setVolume] = useState('')

  // `escolherCotacao` trabalha em UNIDADES, nao em milesimos. O pedido guarda `quantity_milli`, entao divide.
  // Sem isso a r195 fotografou R$ 105.000,00 para uma compra de R$ 105,00 — mil vezes o valor certo.
  const volumeEfetivo = volume.trim() ? Math.floor(mili(volume) / 1000) : Math.floor(quantidade / 1000)

  const adicionar = () => {
    const preco = centavos(form.preco)
    const disponivel = Math.floor(mili(form.quantidade) / 1000)

    if (!form.supplier || preco <= 0 || disponivel <= 0) {
      setError('Informe fornecedor, preco e quantidade.')

      return
    }

    setError('')

    const nova: Proposta = {
      prazo_dias: form.prazo.trim() ? Number(form.prazo.trim()) : null,
      preco_unit_cents: preco,
      quantidade_disponivel: disponivel,
      supplier_id: form.supplier
    }

    setPropostas([...propostas, nova])
    // Gravar e efeito de fora: o painel nao sabe onde a proposta mora, so avisa que ela existe.
    onGravar?.(nova)
    // So o fornecedor e limpo: quem cota varios itens do mesmo fornecedor nao quer redigitar o resto.
    setForm({ ...VAZIA, supplier: form.supplier })
    setResultado(null)
  }

  const comparar = async () => {
    if (propostas.length === 0) return

    setError('')
    setResultado(await escolherCotacao(propostas, volumeEfetivo))
  }

  const escolhida = resultado && 'proposta' in resultado ? resultado.proposta : null
  const segunda = resultado && 'proposta' in resultado ? resultado.segunda : null
  const motivo = resultado && 'motivo' in resultado ? resultado.motivo : null

  return (
    <section className="grid gap-3 rounded-lg border border-(--ui-border) p-4">
      <h2 className="text-[length:var(--conversation-caption-font-size)] font-medium text-foreground">
        {copy.compare}
      </h2>

      {/* Cinco campos numa grade: os quatro da proposta e o volume, que e o denominador da comparacao. */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">{copy.orderQuantity}</span>
          <input
            className={CAMPO}
            inputMode="decimal"
            onChange={event => setVolume(event.target.value)}
            value={volume}
          />
        </label>

        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">{copy.supplier}</span>
          <select
            className={CAMPO}
            onChange={event => setForm({ ...form, supplier: event.target.value })}
            value={form.supplier}
          >
            <option value="">{copy.supplier}</option>
            {Object.entries(supplierNames).map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">{copy.price}</span>
          <input
            className={CAMPO}
            inputMode="decimal"
            onChange={event => setForm({ ...form, preco: event.target.value })}
            value={form.preco}
          />
        </label>

        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">{copy.quantity}</span>
          <input
            className={CAMPO}
            inputMode="decimal"
            onChange={event => setForm({ ...form, quantidade: event.target.value })}
            value={form.quantidade}
          />
        </label>

        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">{copy.prazo}</span>
          <input
            className={CAMPO}
            inputMode="numeric"
            onChange={event => setForm({ ...form, prazo: event.target.value })}
            value={form.prazo}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={adicionar} variant="ghost">
          {copy.add}
        </Button>
        <Button disabled={propostas.length === 0} onClick={() => void comparar()}>
          {copy.compare}
        </Button>
      </div>

      {error ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{error}</p>
      ) : null}

      {propostas.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          {propostas.map((p, index) => (
            <li className="flex items-center justify-between" key={`${p.supplier_id}-${index}`}>
              <span className="text-foreground">
                {supplierNames[p.supplier_id] ?? p.supplier_id} · {priceLabel(p.preco_unit_cents)} ×{' '}
                {p.quantidade_disponivel}
                {p.prazo_dias === null ? '' : ` · ${p.prazo_dias}d`}
              </span>
              <Button
                onClick={() => {
                  onRemover?.(p.supplier_id)
                  setPropostas(propostas.filter((_, i) => i !== index))
                  setResultado(null)
                }}
                variant="ghost"
              >
                {copy.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {motivo ? (
        // A tela NAO pode dizer "melhor oferta" quando nao ha oferta. Cada motivo pede uma acao diferente:
        // sem propostas = adicionar; sem proposta valida = propostas que atendam o volume; quantidade zero =
        // informar o volume. Dizer "melhor oferta" em qualquer desses casos seria um botao que mente.
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {motivo === 'sem_cotacoes' ? copy.empty : volumeEfetivo <= 0 ? copy.needQuantity : copy.noValidOffer}
        </p>
      ) : null}

      {escolhida ? (
        <div className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <p className="text-foreground">
            {copy.result}: {supplierNames[escolhida.supplier_id] ?? escolhida.supplier_id} ·{' '}
            {priceLabel(escolhida.preco_total_cents)}
          </p>
          {resultado && 'economia_contra_segunda_cents' in resultado && resultado.economia_contra_segunda_cents !== null ? (
            // A economia e o que justifica a escolha; sem ela, "escolhi o A" nao convence ninguem.
            <p className="text-(--ui-text-tertiary)">
              {segunda ? `${supplierNames[segunda.supplier_id] ?? segunda.supplier_id}: ` : ''}
              economiza {priceLabel(resultado.economia_contra_segunda_cents)} em relacao a proxima
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

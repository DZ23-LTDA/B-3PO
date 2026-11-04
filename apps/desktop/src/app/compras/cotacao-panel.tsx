/**
 * Comparacao de fornecedores na tela de compras (rodada 194).
 *
 * Antes desta rodada a cotacao existia e era testada em quatro camadas - regra (r188), canal (r190), preload
 * (r192) e wrapper (r193) - e o usuario nao alcancava nenhuma delas. Este painel e o elo que faltava.
 *
 * O QUE ELE NAO FAZ
 *
 * Nao salva a cotacao e nao cria pedido. Uma cotacao e proposta; transforma-la em pedido e uma decisao
 * separada, com aprovacao propria (r182). O painel compara e mostra; quem compra decide.
 */

import { useState } from 'react'

import { escolherCotacao, type CotacaoEscolhida, type CotacaoRow } from '@/api/purchases'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface CotacaoPanelProps {
  /** Quantidade que se quer comprar. Chega do formulario de pedido. */
  quantidade: number
  /** Rotulos vindos da tela, para o painel nao inventar texto proprio. */
  copy: {
    add: string
    compare: string
    empty: string
    price: string
    quantity: string
    remove: string
    result: string
    supplier: string
  }
  /** Nomes de fornecedor por id, para exibir o nome em vez do id cru. */
  supplierNames: Record<string, string>
}

type Proposta = CotacaoRow

const VAZIA = { prazo: '', preco: '', quantidade: '', supplier: '' }

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

export function CotacaoPanel({ copy, quantidade, supplierNames }: CotacaoPanelProps) {
  const [form, setForm] = useState(VAZIA)
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [resultado, setResultado] = useState<CotacaoEscolhida | { motivo: string } | null>(null)
  const [error, setError] = useState('')

  const adicionar = () => {
    const preco = centavos(form.preco)
    const disponivel = mili(form.quantidade)

    if (!form.supplier || preco <= 0 || disponivel <= 0) {
      setError('Informe fornecedor, preco e quantidade.')

      return
    }

    setError('')
    setPropostas([
      ...propostas,
      {
        prazo_dias: form.prazo.trim() ? Number(form.prazo.trim()) : null,
        preco_unit_cents: preco,
        quantidade_disponivel: disponivel,
        supplier_id: form.supplier
      }
    ])
    setForm(VAZIA)
    setResultado(null)
  }

  const comparar = async () => {
    if (propostas.length === 0) return

    setError('')
    setResultado(await escolherCotacao(propostas, quantidade))
  }

  const escolhida = resultado && 'proposta' in resultado ? resultado.proposta : null
  const segunda = resultado && 'proposta' in resultado ? resultado.segunda : null
  const motivo = resultado && 'motivo' in resultado ? resultado.motivo : null

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-(--ui-border) p-4">
      <h2 className="text-[length:var(--conversation-caption-font-size)] font-medium text-foreground">
        {copy.compare}
      </h2>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label={copy.supplier}
          className="rounded-md border border-(--ui-border) bg-transparent px-2 py-1 text-[length:var(--conversation-caption-font-size)]"
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

        <Input
          aria-label={copy.price}
          onChange={event => setForm({ ...form, preco: event.target.value })}
          placeholder={copy.price}
          value={form.preco}
        />
        <Input
          aria-label={copy.quantity}
          onChange={event => setForm({ ...form, quantidade: event.target.value })}
          placeholder={copy.quantity}
          value={form.quantidade}
        />
        <Input
          aria-label="Prazo em dias"
          onChange={event => setForm({ ...form, prazo: event.target.value })}
          placeholder="Prazo (dias)"
          value={form.prazo}
        />
        <Button onClick={adicionar} variant="ghost">
          {copy.add}
        </Button>
      </div>

      {propostas.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          {propostas.map((p, index) => (
            <li className="flex items-center justify-between" key={`${p.supplier_id}-${index}`}>
              <span className="text-foreground">
                {supplierNames[p.supplier_id] ?? p.supplier_id} · {(p.preco_unit_cents / 100).toFixed(2)} ×{' '}
                {(p.quantidade_disponivel / 1000).toFixed(0)}
                {p.prazo_dias === null ? '' : ` · ${p.prazo_dias}d`}
              </span>
              <Button
                onClick={() => {
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

      <div className="flex gap-2">
        <Button disabled={propostas.length === 0} onClick={() => void comparar()}>
          {copy.compare}
        </Button>
      </div>

      {error ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{error}</p>
      ) : null}

      {motivo ? (
        // `sem_cotacoes` e `sem_proposta_valida` sao acoes diferentes: a primeira pede mais propostas, a segunda
        // pede propostas que atendam o volume.
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {motivo === 'sem_cotacoes' ? copy.empty : copy.result}
        </p>
      ) : null}

      {escolhida ? (
        <div className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <p className="text-foreground">
            {copy.result}: {supplierNames[escolhida.supplier_id] ?? escolhida.supplier_id} ·{' '}
            {(escolhida.preco_total_cents / 100).toFixed(2)}
          </p>
          {resultado && 'economia_contra_segunda_cents' in resultado && resultado.economia_contra_segunda_cents !== null ? (
            // A economia e o que justifica a escolha; sem ela, "escolhi o A" nao convence ninguem.
            <p className="text-(--ui-text-tertiary)">
              {segunda ? `${supplierNames[segunda.supplier_id] ?? segunda.supplier_id}: ` : ''}
              economiza {(resultado.economia_contra_segunda_cents / 100).toFixed(2)} em relacao a proxima
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

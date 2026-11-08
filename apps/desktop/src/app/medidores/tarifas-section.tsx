import { useCallback, useEffect, useMemo, useState } from 'react'

import { formatarCentavos, tarifasBridge, type ContaRow, type PoliticaTarifaRow } from '@/api/tarifas'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

/**
 * T-12 — a política tarifária configurável, na tela.
 *
 * A decisão do dono é que o código **não invente preço**. Isso aparece aqui de três formas:
 *
 * 1. enquanto não houver política, a seção diz "não configurada" e explica que o consumo é medido
 *    mas não cobrado — **não** mostra uma conta de exemplo;
 * 2. o formulário começa **vazio** (nenhuma faixa pré-preenchida) e a moeda começa vazia;
 * 3. o erro do IPC é mostrado como veio (`politica_sem_faixa`, `faixa_1_fora_de_ordem`…), porque
 *    traduzir isso para "algo deu errado" esconderia justamente o que a validação protege.
 */

interface FaixaForm {
  ate_m3: string
  preco: string
}

const faixaVazia = (): FaixaForm => ({ ate_m3: '', preco: '' })

function centavosDeTexto(texto: string): number {
  const limpo = texto.replace(',', '.').trim()

  if (!limpo) return 0

  return Math.round(Number(limpo) * 100)
}

function milliDeM3(texto: string): number | null {
  const limpo = texto.replace(',', '.').trim()

  if (!limpo) return null

  const valor = Number(limpo)

  return Number.isFinite(valor) ? Math.round(valor * 1000) : null
}

export function TarifasSection() {
  const { t } = useI18n()
  const copy = t.settings.medidores.tarifas
  const bridge = useMemo(() => tarifasBridge(), [])

  const [politicas, setPoliticas] = useState<PoliticaTarifaRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [moeda, setMoeda] = useState('')
  const [faixas, setFaixas] = useState<FaixaForm[]>([faixaVazia()])
  const [minimo, setMinimo] = useState('')
  const [taxaFixa, setTaxaFixa] = useState('')
  const [esgoto, setEsgoto] = useState('')
  const [volume, setVolume] = useState('')
  const [conta, setConta] = useState<ContaRow | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!bridge) {
      setCarregando(false)

      return
    }

    const r = await bridge.list()

    setPoliticas(r.politicas ?? [])
    setCarregando(false)
  }, [bridge])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  if (!bridge) return null

  const salvar = async () => {
    setAviso(null)

    const r = await bridge.salvar({
      created_at: Date.now(),
      esgoto_percentual: esgoto.trim() ? Number(esgoto.replace(',', '.')) : null,
      faixas: faixas.map((f, i) => ({
        ate_milli: i === faixas.length - 1 ? null : milliDeM3(f.ate_m3),
        preco_centavos_por_m3: centavosDeTexto(f.preco)
      })),
      id: `pol-${Date.now()}`,
      minimo_milli: milliDeM3(minimo),
      moeda: moeda.trim(),
      taxa_fixa_centavos: taxaFixa.trim() ? centavosDeTexto(taxaFixa) : null,
      vigencia_fim: null,
      vigencia_inicio: Date.now()
    })

    if (r.error) {
      setAviso(r.error)

      return
    }

    setAviso(copy.salva)
    setMoeda('')
    setFaixas([faixaVazia()])
    setMinimo('')
    setTaxaFixa('')
    setEsgoto('')
    await recarregar()
  }

  const calcular = async () => {
    const consumo = milliDeM3(volume)

    if (consumo === null) return

    const r = await bridge.calcular({ consumo_milli: consumo })

    setConta(r.conta)
  }

  return (
    <section
      aria-label={copy.titulo}
      className="flex flex-col gap-3 rounded-lg border border-(--ui-border) p-4"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">{copy.titulo}</h2>
        <p className="text-xs text-(--ui-text-tertiary)">{copy.intro}</p>
      </header>

      {carregando ? (
        <p className="text-xs text-(--ui-text-tertiary)">{t.settings.medidores.carregando}</p>
      ) : politicas.length === 0 ? (
        <div className="rounded-md border border-dashed border-(--ui-border) p-3">
          <p className="text-xs font-medium text-foreground">{copy.naoConfigurada}</p>
          <p className="mt-1 text-xs text-(--ui-text-tertiary)">{copy.explicacao}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1 text-xs text-(--ui-text-tertiary)">
          {politicas.map(p => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span>
                {p.moeda} · {p.faixas.length} {copy.faixa.toLowerCase()} · {new Date(p.vigencia_inicio).toLocaleDateString()}
              </span>
              <button
                className="cursor-pointer rounded-sm px-1.5 py-0.5 text-(--ui-text-tertiary) hover:text-foreground"
                onClick={async () => {
                  await bridge.remover({ id: p.id })
                  setAviso(copy.removida)
                  await recarregar()
                }}
                type="button"
              >
                {copy.removerFaixa}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2">
        <label className="grid gap-1 text-xs">
          <span className="text-(--ui-text-secondary)">{copy.moeda}</span>
          <input
            className="rounded-md border border-(--ui-border) bg-transparent px-2 py-1 text-foreground"
            onChange={e => setMoeda(e.target.value)}
            placeholder="BRL"
            value={moeda}
          />
        </label>

        {faixas.map((faixa, i) => {
          const ultima = i === faixas.length - 1

          return (
            <div className="flex items-end gap-2" key={i}>
              <label className="grid flex-1 gap-1 text-xs">
                <span className="text-(--ui-text-secondary)">
                  {copy.faixa} {i + 1} · {ultima ? copy.semTeto : copy.ate}
                </span>
                <input
                  className="rounded-md border border-(--ui-border) bg-transparent px-2 py-1 text-foreground"
                  disabled={ultima}
                  onChange={e => setFaixas(a => a.map((f, k) => (k === i ? { ...f, ate_m3: e.target.value } : f)))}
                  value={ultima ? '' : faixa.ate_m3}
                />
              </label>
              <label className="grid flex-1 gap-1 text-xs">
                <span className="text-(--ui-text-secondary)">{copy.preco}</span>
                <input
                  className="rounded-md border border-(--ui-border) bg-transparent px-2 py-1 text-foreground"
                  onChange={e => setFaixas(a => a.map((f, k) => (k === i ? { ...f, preco: e.target.value } : f)))}
                  value={faixa.preco}
                />
              </label>
              {faixas.length > 1 && (
                <button
                  aria-label={`${copy.removerFaixa} ${i + 1}`}
                  className="cursor-pointer px-1 text-(--ui-text-tertiary) hover:text-foreground"
                  onClick={() => setFaixas(a => (a.length > 1 ? a.filter((_, k) => k !== i) : a))}
                  type="button"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}

        <button
          className="w-fit cursor-pointer rounded-md border border-(--ui-border) px-2 py-1 text-xs text-(--ui-text-secondary) hover:text-foreground"
          onClick={() => setFaixas(a => [...a, faixaVazia()])}
          type="button"
        >
          {copy.adicionarFaixa}
        </button>

        <div className="flex flex-wrap gap-2">
          <label className="grid gap-1 text-xs">
            <span className="text-(--ui-text-secondary)">
              {copy.minimo} ({copy.opcional})
            </span>
            <input
              className="w-24 rounded-md border border-(--ui-border) bg-transparent px-2 py-1 text-foreground"
              onChange={e => setMinimo(e.target.value)}
              value={minimo}
            />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-(--ui-text-secondary)">
              {copy.taxaFixa} ({copy.opcional})
            </span>
            <input
              className="w-24 rounded-md border border-(--ui-border) bg-transparent px-2 py-1 text-foreground"
              onChange={e => setTaxaFixa(e.target.value)}
              value={taxaFixa}
            />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-(--ui-text-secondary)">
              {copy.esgoto} ({copy.opcional})
            </span>
            <input
              className="w-20 rounded-md border border-(--ui-border) bg-transparent px-2 py-1 text-foreground"
              onChange={e => setEsgoto(e.target.value)}
              value={esgoto}
            />
          </label>
        </div>

        <Button className="w-fit" onClick={() => void salvar()}>
          {copy.salvar}
        </Button>
      </div>

      {aviso && <p className="text-xs text-(--ui-text-secondary)">{aviso}</p>}

      <div className="flex items-end gap-2 border-t border-(--ui-border) pt-3">
        <label className="grid gap-1 text-xs">
          <span className="text-(--ui-text-secondary)">{copy.consumoMedido} (m³)</span>
          <input
            className="w-28 rounded-md border border-(--ui-border) bg-transparent px-2 py-1 text-foreground"
            onChange={e => setVolume(e.target.value)}
            value={volume}
          />
        </label>
        <button
          className="cursor-pointer rounded-md border border-(--ui-border) px-2 py-1 text-xs text-(--ui-text-secondary) hover:text-foreground"
          onClick={() => void calcular()}
          type="button"
        >
          {copy.calcular}
        </button>
      </div>

      {conta ? (
        <dl className="grid gap-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-(--ui-text-tertiary)">{copy.contaAgua}</dt>
            <dd>{formatarCentavos(conta.agua_centavos, conta.moeda)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-(--ui-text-tertiary)">{copy.contaEsgoto}</dt>
            <dd>{formatarCentavos(conta.esgoto_centavos, conta.moeda)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-(--ui-text-tertiary)">{copy.contaTaxa}</dt>
            <dd>{formatarCentavos(conta.taxa_fixa_centavos, conta.moeda)}</dd>
          </div>
          <div className="flex justify-between font-medium text-foreground">
            <dt>{copy.contaTotal}</dt>
            <dd>{formatarCentavos(conta.total_centavos, conta.moeda)}</dd>
          </div>
          {conta.minimo_aplicado && <p className="text-(--ui-text-tertiary)">{copy.minimoAplicado}</p>}
        </dl>
      ) : (
        <p className="text-xs text-(--ui-text-tertiary)">{copy.naoConfigurada}</p>
      )}
    </section>
  )
}

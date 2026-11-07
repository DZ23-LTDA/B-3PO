/**
 * Vasilhames — a vertical de gás/água.
 *
 * A pergunta que esta tela responde é a que o estoque não sabe responder: **quantos cascos são meus, e
 * onde estão**. O estoque conta produto ("tenho 40 botijões cheios") e, depois da venda, conta um a
 * menos — mas o casco **continua sendo da revenda**, na casa do cliente, e precisa voltar.
 *
 * Por isso a tela abre com o saldo separado em três, não com a lista: em estoque (disponível), com o
 * cliente (a cobrar de volta) e perdido (baixa). Quem atende no balcão precisa do primeiro número para
 * vender e do segundo para cobrar a devolução.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  VASILHAME_KINDS,
  cadastrarVasilhame,
  devolverVasilhame,
  entregarVasilhame,
  gasAvailable,
  loadGas,
  perderVasilhame,
  type GasSaldoRow,
  type VasilhameKind,
  type VasilhameRow,
} from '@/api/gas'
import { listCrmContacts, type CrmContactRow } from '@/api/crm-contacts'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const VAZIO: GasSaldoRow = { em_comodato: 0, em_estoque: 0, perdidos: 0, por_tipo: {} }

function dataCurta(epoch: number): string {
  if (!epoch) return '—'

  return new Date(epoch).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function GasView() {
  const { t } = useI18n()
  const copy = t.settings.gas

  const [vasilhames, setVasilhames] = useState<VasilhameRow[] | null>(null)
  const [saldo, setSaldo] = useState<GasSaldoRow>(VAZIO)
  const [contatos, setContatos] = useState<CrmContactRow[]>([])
  const [failure, setFailure] = useState<string | null>(null)

  const [tipo, setTipo] = useState<VasilhameKind>('botijao_13')
  const [serie, setSerie] = useState('')
  const [clienteDoForm, setClienteDoForm] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const r = await loadGas()

      setVasilhames(r.vasilhames)
      setSaldo(r.saldo)
      setFailure(null)
    } catch {
      setVasilhames([])
      setFailure(copy.carregarFalhou)
    }
  }, [])

  useEffect(() => {
    void carregar()
    void listCrmContacts()
      .then((r: CrmContactRow[]) => setContatos(r ?? []))
      .catch(() => setContatos([]))
  }, [carregar])

  const disponivel = gasAvailable()

  const disponiveis = useMemo(
    () => (vasilhames ?? []).filter(v => v.status === 'estoque'),
    [vasilhames]
  )

  const emComodato = useMemo(
    () => (vasilhames ?? []).filter(v => v.status === 'comodato'),
    [vasilhames]
  )

  const perdidos = useMemo(() => (vasilhames ?? []).filter(v => v.status === 'perdido'), [vasilhames])

  const nomeDoCliente = useCallback(
    (id: string | null) => {
      if (!id) return '—'

      return contatos.find(c => c.phone === id)?.name ?? id
    },
    [contatos]
  )

  async function cadastrar() {
    if (salvando) return

    setSalvando(true)

    try {
      const r = await cadastrarVasilhame({
        customer_id: clienteDoForm || null,
        kind: tipo,
        serial: serie,
      })

      if ('error' in r) setFailure(copy.erro[r.error] ?? r.error)
      else {
        setSerie('')
        setClienteDoForm('')
        await carregar()
      }
    } finally {
      setSalvando(false)
    }
  }

  async function entregar(id: string) {
    const cliente = clienteDoForm

    if (!cliente) {
      setFailure(copy.escolhaCliente)

      return
    }

    const r = await entregarVasilhame(id, cliente)

    if ('error' in r) setFailure(copy.erro[r.error] ?? r.error)
    else await carregar()
  }

  async function devolver(id: string) {
    const r = await devolverVasilhame(id)

    if ('error' in r) setFailure(copy.erro[r.error] ?? r.error)
    else await carregar()
  }

  async function perder(id: string) {
    const motivo = window.prompt(copy.perderMotivo, copy.perderMotivoPadrao)

    if (motivo === null) return

    const r = await perderVasilhame(id, motivo)

    if ('error' in r) setFailure(copy.erro[r.error] ?? r.error)
    else await carregar()
  }

  if (!disponivel) {
    return (
      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        {copy.indisponivel}
      </p>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>

      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        {copy.intro}
      </p>

      <section
        aria-label={copy.saldoAria}
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        role="group"
      >
        {[
          { chave: 'estoque', label: copy.emEstoque, nota: copy.emEstoqueNota, valor: saldo.em_estoque },
          { chave: 'comodato', label: copy.emComodato, nota: copy.emComodatoNota, valor: saldo.em_comodato },
          { chave: 'perdido', label: copy.perdidos, nota: copy.perdidosNota, valor: saldo.perdidos },
        ].map(card => (
          <div className="rounded-lg border border-(--ui-border) bg-(--ui-bg-secondary) p-3" key={card.chave}>
            <div className="text-[0.75rem] text-(--ui-text-tertiary)">{card.label}</div>
            <div className="text-[1.5rem] font-semibold text-foreground">{card.valor}</div>
            <div className="text-[0.6875rem] text-(--ui-text-tertiary)">{card.nota}</div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-(--ui-border) p-4">
        <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {copy.entrada}
        </span>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] text-(--ui-text-tertiary)">{copy.tipo}</span>
            <select
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground"
              onChange={evento => setTipo(evento.target.value as VasilhameKind)}
              value={tipo}
            >
              {VASILHAME_KINDS.map(k => (
                <option key={k} value={k}>
                  {copy.tipos[k]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] text-(--ui-text-tertiary)">{copy.serieOpcional}</span>
            <input
              aria-label={copy.serieAria}
              className="w-32 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground"
              onChange={evento => setSerie(evento.target.value)}
              value={serie}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] text-(--ui-text-tertiary)">{copy.clienteParaEntregar}</span>
            <select
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground"
              onChange={evento => setClienteDoForm(evento.target.value)}
              value={clienteDoForm}
            >
              <option value="">—</option>
              {contatos.map(c => (
                <option key={c.phone} value={c.phone}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <Button disabled={salvando} onClick={() => void cadastrar()}>
            {copy.cadastrar}
          </Button>
        </div>

        {failure ? (
          <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
        ) : null}
      </section>

      {vasilhames === null ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {copy.carregando}
        </p>
      ) : vasilhames.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {copy.vazio}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {[
            { linhas: disponiveis, titulo: copy.emEstoque },
            { linhas: emComodato, titulo: copy.emComodato },
            { linhas: perdidos, titulo: copy.perdidos },
          ]
            .filter(grupo => grupo.linhas.length > 0)
            .map(grupo => (
              <section className="flex flex-col gap-1" key={grupo.titulo}>
                <h2 className="text-[length:var(--conversation-caption-font-size)] font-medium text-(--ui-text-secondary)">
                  {grupo.titulo} ({grupo.linhas.length})
                </h2>

                <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[length:var(--conversation-caption-font-size)]">
                  <thead>
                    <tr className="text-(--ui-text-tertiary)">
                      <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.colunas.tipo}</th>
                      <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.colunas.serie}</th>
                      <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.colunas.situacao}</th>
                      <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.colunas.cliente}</th>
                      <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.colunas.saiu}</th>
                      <th className="border-b border-(--ui-border) py-1 font-medium">
                        <span className="sr-only">{copy.colunas.acoes}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.linhas.map(v => (
                      <tr key={v.id}>
                        <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">
                          {copy.tipos[v.kind]}
                        </td>
                        <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                          {v.serial || '—'}
                        </td>
                        <td
                          className={cn(
                            'border-b border-(--ui-border) py-1 pr-2',
                            v.status === 'perdido' ? 'text-(--ui-danger)' : 'text-(--ui-text-secondary)'
                          )}
                        >
                          {copy.status[v.status]}
                        </td>
                        <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                          {nomeDoCliente(v.customer_id)}
                        </td>
                        <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                          {dataCurta(v.delivered_at)}
                        </td>
                        <td className="border-b border-(--ui-border) py-1">
                          <div className="flex justify-end gap-1">
                            {v.status === 'estoque' ? (
                              <Button onClick={() => void entregar(v.id)} variant="ghost">
                                {copy.acoes.entregar}
                              </Button>
                            ) : null}
                            {v.status === 'comodato' ? (
                              <>
                                <Button onClick={() => void devolver(v.id)} variant="ghost">
                                  {copy.acoes.devolver}
                                </Button>
                                <Button onClick={() => void perder(v.id)} variant="ghost">
                                  {copy.acoes.perder}
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
        </div>
              </section>
            ))}
        </div>
      )}
    </div>
  )
}

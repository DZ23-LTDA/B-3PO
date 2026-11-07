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
  VASILHAME_LABEL,
  VASILHAME_STATUS_LABEL,
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
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const VAZIO: GasSaldoRow = { em_comodato: 0, em_estoque: 0, perdidos: 0, por_tipo: {} }

function dataCurta(epoch: number): string {
  if (!epoch) return '—'

  return new Date(epoch).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function GasView() {
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
      setFailure('Não foi possível carregar os vasilhames.')
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

      if ('error' in r) setFailure(r.error)
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
      setFailure('Escolha o cliente antes de entregar o vasilhame.')

      return
    }

    const r = await entregarVasilhame(id, cliente)

    if ('error' in r) setFailure(r.error)
    else await carregar()
  }

  async function devolver(id: string) {
    const r = await devolverVasilhame(id)

    if ('error' in r) setFailure(r.error)
    else await carregar()
  }

  async function perder(id: string) {
    const motivo = window.prompt('Por que o vasilhame foi perdido?', 'cliente não devolveu')

    if (motivo === null) return

    const r = await perderVasilhame(id, motivo)

    if ('error' in r) setFailure(r.error)
    else await carregar()
  }

  if (!disponivel) {
    return (
      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        Os vasilhames precisam do aplicativo desktop para funcionar.
      </p>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        O casco que sai com o cliente continua sendo da revenda. Aqui ele é contado até voltar.
      </p>

      <section
        aria-label="Saldo de vasilhames"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        role="group"
      >
        {[
          { chave: 'estoque', label: 'Na revenda', valor: saldo.em_estoque, nota: 'pronto para vender' },
          { chave: 'comodato', label: 'Com o cliente', valor: saldo.em_comodato, nota: 'a cobrar de volta' },
          { chave: 'perdido', label: 'Perdidos', valor: saldo.perdidos, nota: 'baixa no patrimônio' },
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
          Entrada de vasilhame
        </span>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] text-(--ui-text-tertiary)">Tipo</span>
            <select
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground"
              onChange={evento => setTipo(evento.target.value as VasilhameKind)}
              value={tipo}
            >
              {VASILHAME_KINDS.map(k => (
                <option key={k} value={k}>
                  {VASILHAME_LABEL[k]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] text-(--ui-text-tertiary)">Série (opcional)</span>
            <input
              aria-label="Número de série"
              className="w-32 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground"
              onChange={evento => setSerie(evento.target.value)}
              value={serie}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] text-(--ui-text-tertiary)">Cliente (para entregar)</span>
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
            Cadastrar
          </Button>
        </div>

        {failure ? (
          <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
        ) : null}
      </section>

      {vasilhames === null ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Carregando…
        </p>
      ) : vasilhames.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Nenhum vasilhame cadastrado ainda. Cadastre os cascos que a revenda já tem.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {[
            { titulo: 'Na revenda', linhas: disponiveis },
            { titulo: 'Com o cliente', linhas: emComodato },
            { titulo: 'Perdidos', linhas: perdidos },
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
                      <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">Tipo</th>
                      <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">Série</th>
                      <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">Situação</th>
                      <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">Cliente</th>
                      <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">Saiu</th>
                      <th className="border-b border-(--ui-border) py-1 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.linhas.map(v => (
                      <tr key={v.id}>
                        <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">
                          {VASILHAME_LABEL[v.kind]}
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
                          {VASILHAME_STATUS_LABEL[v.status]}
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
                                Entregar
                              </Button>
                            ) : null}
                            {v.status === 'comodato' ? (
                              <>
                                <Button onClick={() => void devolver(v.id)} variant="ghost">
                                  Devolver
                                </Button>
                                <Button onClick={() => void perder(v.id)} variant="ghost">
                                  Perder
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

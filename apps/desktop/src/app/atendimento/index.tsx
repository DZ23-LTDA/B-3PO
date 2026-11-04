import { useCallback, useEffect, useState } from 'react'

import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  deskAvailable,
  deskIndicators,
  listTickets,
  openTicket,
  rateTicket,
  setTicketStatus,
  slaLabel,
  type DeskIndicatorsRow,
  type TicketRow
} from '@/api/service-desk'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

/**
 * Atendimento.
 *
 * Três coisas que a tela mostra e que sem ela não existiriam:
 *
 * 1. **Atraso visível.** Um SLA que ninguém vê não é SLA. O indicador de atrasados fica no topo, não
 *    escondido num relatório.
 * 2. **Selo de revisão.** Ticket com satisfação baixa carrega "precisa revisão" — é o sinal que o
 *    GOAL pede para escalonar insatisfação a um humano.
 * 3. **Fechar só depois de resolver.** O botão de fechar só aparece em ticket resolvido, porque o
 *    backend recusa de qualquer forma e um botão que sempre falha ensina o usuário a desconfiar da tela.
 */
export function AtendimentoView() {
  const { t } = useI18n()
  const copy = t.settings.atendimento

  const [tickets, setTickets] = useState<null | TicketRow[]>(null)
  const [ind, setInd] = useState<DeskIndicatorsRow>({ atrasados: 0, abertos: 0, satisfacaoMedia: null })
  const [failure, setFailure] = useState<null | string>(null)
  const [saving, setSaving] = useState(false)

  const [assunto, setAssunto] = useState('')
  const [prioridade, setPrioridade] = useState('media')
  const [telefone, setTelefone] = useState('')

  const disponivel = deskAvailable()

  const carregar = useCallback(async () => {
    try {
      setTickets(await listTickets())
      setInd(await deskIndicators())
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setTickets([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const erroDe = (chave: string): string => {
    const mapa: Record<string, string> = {
      avaliar_exige_resolvido: copy.rateRequiresResolved,
      fechar_exige_resolvido: copy.closeRequiresResolved,
      nota_invalida: copy.invalidRating,
      subject_required: copy.subjectRequired,
      ticket_nao_encontrado: copy.notFound
    }

    return mapa[chave] ?? chave
  }

  async function abrir() {
    if (!assunto.trim()) {
      setFailure(copy.subjectRequired)

      return
    }

    setSaving(true)

    try {
      const r = await openTicket({ contact_phone: telefone.trim(), priority: prioridade, subject: assunto.trim() })

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setAssunto('')
        setTelefone('')
        await carregar()
      }
    } finally {
      setSaving(false)
    }
  }

  async function mudarStatus(id: string, status: string) {
    setSaving(true)

    try {
      const r = await setTicketStatus(id, status)

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        await carregar()
      }
    } finally {
      setSaving(false)
    }
  }

  async function avaliar(id: string, nota: number) {
    setSaving(true)

    try {
      const r = await rateTicket(id, nota)

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        await carregar()
      }
    } finally {
      setSaving(false)
    }
  }

  const campo = (rotulo: string, valor: string, aoMudar: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
      <span className="text-(--ui-text-tertiary)">{rotulo}</span>
      <input
        className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
        onChange={event => aoMudar(event.target.value)}
        value={valor}
      />
    </label>
  )

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

      {!disponivel ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.unavailable}</p>
      ) : (
        <>
          <section className="grid gap-2 rounded-lg border border-(--ui-border) p-3 sm:grid-cols-3">
            <div className="flex flex-col">
              <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                {copy.openCount}
              </span>
              <span className="text-lg font-semibold text-foreground">{ind.abertos}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                {copy.overdueCount}
              </span>
              <span
                className={
                  ind.atrasados > 0
                    ? 'text-lg font-semibold text-(--ui-danger)'
                    : 'text-lg font-semibold text-foreground'
                }
              >
                {ind.atrasados}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                {copy.satisfaction}
              </span>
              <span className="text-lg font-semibold text-foreground">
                {ind.satisfacaoMedia === null ? copy.noRatings : ind.satisfacaoMedia.toFixed(1)}
              </span>
            </div>
          </section>

          <section className="grid gap-2 rounded-lg border border-(--ui-border) p-4 sm:grid-cols-2 lg:grid-cols-4">
            {campo(copy.subject, assunto, setAssunto)}
            {campo(copy.phone, telefone, setTelefone)}
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.priority}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setPrioridade(event.target.value)}
                value={prioridade}
              >
                {Object.entries(TICKET_PRIORITY_LABELS).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button disabled={saving} onClick={() => void abrir()}>
                {copy.open}
              </Button>
            </div>
          </section>

          {failure ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
          ) : null}

          {tickets === null ? (
            <Loader />
          ) : tickets.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tickets.map(ticket => (
                <li className="flex flex-col gap-2 rounded-lg border border-(--ui-border) px-3 py-2" key={ticket.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        #{ticket.number} · {ticket.subject}
                      </span>
                      <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                        {TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority} ·{' '}
                        {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status} ·{' '}
                        {slaLabel(ticket.sla_minutos, copy.remaining, copy.overdue)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ticket.atrasado ? (
                        <span className="rounded bg-(--ui-danger) px-2 py-0.5 text-[length:var(--conversation-caption-font-size)] text-white">
                          {copy.overdueBadge}
                        </span>
                      ) : null}
                      {ticket.precisa_revisao ? (
                        <span className="rounded bg-(--ui-warning, #d09b2c) px-2 py-0.5 text-[length:var(--conversation-caption-font-size)] text-black">
                          {copy.reviewBadge}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ticket.status === 'aberto' || ticket.status === 'aguardando' ? (
                      <Button disabled={saving} onClick={() => void mudarStatus(ticket.id, 'em_andamento')} variant="ghost">
                        {copy.start}
                      </Button>
                    ) : null}
                    {ticket.status !== 'resolvido' && ticket.status !== 'fechado' ? (
                      <Button disabled={saving} onClick={() => void mudarStatus(ticket.id, 'resolvido')} variant="ghost">
                        {copy.resolve}
                      </Button>
                    ) : null}
                    {ticket.status === 'resolvido' ? (
                      <Button disabled={saving} onClick={() => void mudarStatus(ticket.id, 'fechado')} variant="ghost">
                        {copy.close}
                      </Button>
                    ) : null}
                    {ticket.status === 'resolvido' || ticket.status === 'fechado' ? (
                      <span className="flex items-center gap-1">
                        <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                          {copy.rate}
                        </span>
                        {[1, 2, 3, 4, 5].map(nota => (
                          <button
                            className={
                              ticket.satisfaction === nota
                                ? 'rounded border border-(--ui-accent) px-2 text-[length:var(--conversation-caption-font-size)] text-foreground'
                                : 'rounded border border-(--ui-border) px-2 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)'
                            }
                            disabled={saving}
                            key={nota}
                            onClick={() => void avaliar(ticket.id, nota)}
                            type="button"
                          >
                            {nota}
                          </button>
                        ))}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

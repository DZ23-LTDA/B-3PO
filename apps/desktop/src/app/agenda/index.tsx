import { useCallback, useEffect, useState } from 'react'

import {
  bookAppointmentFromCatalog,
  cancelAppointment,
  confirmAppointment,
  dateLabel,
  dayBounds,
  instantFrom,
  listAppointments,
  schedulingAvailable,
  timeLabel,
  type AppointmentRow
} from '@/api/scheduling'
import { listServices, type ServiceRow } from '@/api/services'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'

import { SchedulingBlocks } from './blocks'
import { SchedulingFreeSlots } from './livres'
import { useI18n } from '@/i18n/context'

/**
 * Tela de agenda.
 *
 * O conflito de horário é decidido no processo principal, com o livro inteiro em mãos. Quando a marcação
 * é recusada, a tela mostra **qual** compromisso ocupa o horário — recusar sem dizer o motivo deixa o
 * operador tentando horários no escuro.
 */
export function AgendaView() {
  const { t } = useI18n()
  const copy = t.settings.agenda

  const [appointments, setAppointments] = useState<null | AppointmentRow[]>(null)
  const [failure, setFailure] = useState<null | string>(null)
  const [recurso, setRecurso] = useState('')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('09:00')
  const [servico, setServico] = useState('')
  const [catalogo, setCatalogo] = useState<ServiceRow[]>([])
  const [saving, setSaving] = useState(false)

  const disponivel = schedulingAvailable()

  const carregar = useCallback(async () => {
    try {
      setAppointments(await listAppointments())
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setAppointments([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  // O serviço vem do catálogo. Sem isso o campo volta a ser texto livre e a duração é chutada.
  useEffect(() => {
    if (disponivel) {
      void listServices()
        .then(setCatalogo)
        .catch(() => setCatalogo([]))
    }
  }, [disponivel])

  const erroDe = (chave: string, conflito?: AppointmentRow): string => {
    if (chave === 'conflito_de_agenda' && conflito) {
      return `${copy.conflict} ${timeLabel(conflito.starts_at)}–${timeLabel(conflito.ends_at)} (${conflito.resource_id})`
    }

    const mapa: Record<string, string> = {
      catalogo_indisponivel: copy.catalogUnavailable,
      comprovante: '',
      conflito_de_agenda: copy.conflict,
      periodo_invalido: copy.invalidPeriod,
      resource_required: copy.resourceRequired
    }

    return mapa[chave] ?? chave
  }

  async function marcar() {
    const inicio = instantFrom(data, hora)

    if (!recurso.trim()) {
      setFailure(copy.resourceRequired)
      return
    }

    if (inicio <= 0) {
      setFailure(copy.invalidPeriod)
      return
    }

    if (!servico.trim()) {
      setFailure(copy.serviceRequired)
      return
    }

    setSaving(true)

    try {
      // `ends_at` NÃO é enviado: o processo principal deriva da duração do catálogo. Mandar o fim
      // calculado aqui criaria duas fontes para a mesma duração.
      const r = await bookAppointmentFromCatalog({
        resource_id: recurso.trim(),
        service: servico.trim(),
        starts_at: inicio
      })

      if ('error' in r) {
        setFailure(erroDe(r.error, r.conflict))
      } else {
        setAppointments(r.appointments)
        setServico('')
        setFailure(null)
      }
    } catch {
      setFailure(copy.loadFailed)
    } finally {
      setSaving(false)
    }
  }

  const hoje = dayBounds(Date.now())
  const doDia = (appointments ?? []).filter(a => a.starts_at >= hoje.start && a.starts_at < hoje.end)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

      <SchedulingBlocks />
      <SchedulingFreeSlots agendamentos={appointments ?? []} resourceId={recurso || (appointments ?? [])[0]?.resource_id || ""} />

      {!disponivel ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.unavailable}</p>
      ) : (
        <>
          <section className="grid gap-2 rounded-lg border border-(--ui-border) p-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.resource}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setRecurso(event.target.value)}
                placeholder={copy.resourceHint}
                value={recurso}
              />
            </label>
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.service}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setServico(event.target.value)}
                value={servico}
              >
                <option value="">{copy.servicePlaceholder}</option>
                {catalogo.map(item => (
                  <option key={item.id} value={item.name}>
                    {item.name} · {item.duration_min} min
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.date}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setData(event.target.value)}
                type="date"
                value={data}
              />
            </label>
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.time}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setHora(event.target.value)}
                type="time"
                value={hora}
              />
            </label>
            {/* Removido o campo de duração: ela vem do catálogo. Campo que não faz nada é pior que
                campo ausente — o operador digitaria 90 e receberia 30 sem entender. */}
            <div className="flex items-end">
              <Button disabled={saving} onClick={() => void marcar()}>
                {copy.book}
              </Button>
            </div>
          </section>

          {failure ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
          ) : null}

          {appointments === null ? (
            <Loader />
          ) : appointments.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
          ) : (
            <>
              <h2 className="text-[length:var(--conversation-caption-font-size)] font-medium text-foreground">
                {copy.today} ({doDia.length})
              </h2>
              <table className="w-full border-collapse text-left text-[length:var(--conversation-caption-font-size)]">
                <thead>
                  <tr className="text-(--ui-text-tertiary)">
                    <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.date}</th>
                    <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.time}</th>
                    <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.resource}</th>
                    <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.service}</th>
                    <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">{copy.status}</th>
                    <th className="border-b border-(--ui-border) py-1 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(appointment => (
                    <tr key={appointment.id}>
                      <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                        {dateLabel(appointment.starts_at)}
                      </td>
                      <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">
                        {timeLabel(appointment.starts_at)}–{timeLabel(appointment.ends_at)}
                      </td>
                      <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                        {appointment.resource_id}
                      </td>
                      <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                        {appointment.service || '—'}
                      </td>
                      <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                        {copy.statuses[appointment.status] ?? appointment.status}
                      </td>
                      <td className="border-b border-(--ui-border) py-1">
                        <div className="flex justify-end gap-1">
                          {appointment.status === 'marcado' ? (
                            <Button onClick={() => void confirmAppointment(appointment.id).then(carregar)} variant="ghost">
                              {copy.confirm}
                            </Button>
                          ) : null}
                          {appointment.status !== 'cancelado' && appointment.status !== 'concluido' ? (
                            <Button onClick={() => void cancelAppointment(appointment.id).then(carregar)} variant="ghost">
                              {copy.cancel}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  )
}
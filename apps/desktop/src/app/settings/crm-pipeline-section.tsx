import { useCallback, useEffect, useState } from 'react'

import {
  type CrmOpportunityRow,
  listOpportunities,
  money,
  opportunityTotals,
  PIPELINE_STAGES,
  pipelineAvailable,
  pipelineErrorText,
  removeOpportunity,
  saveOpportunity,
  stageLabel, type PipelineStage } from '@/api/crm-pipeline'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

/**
 * Funil de oportunidades do WhatsApp CRM.
 *
 * Mostra os totais **calculados dos registros reais** (nunca número inventado) e deixa criar/mover/remover.
 * Sem bridge (web) explica o motivo em vez de fingir lista vazia.
 */
export function CrmPipelineSection({ contacts }: { contacts: readonly { name: string; phone: string }[] }) {
  const { t } = useI18n()
  const copy = t.settings.crmPipeline

  const [rows, setRows] = useState<CrmOpportunityRow[] | null>(null)
  const [failure, setFailure] = useState<null | string>(null)
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [contact, setContact] = useState('')
  const [saving, setSaving] = useState(false)
  // Motivo de perda: o store exige quando o estágio é `perdido`.
  const [doneStage, setDoneStage] = useState<PipelineStage>('novo')
  const [lostReason, setLostReason] = useState('')
  // Mover uma linha para `perdido` pede o motivo antes de salvar (regra do store, não da tela).
  const [pendingLoss, setPendingLoss] = useState<null | { id: string; reason: string }>(null)

  const load = useCallback(async () => {
    try {
      setRows(await listOpportunities())
    } catch {
      setRows([])
      setFailure(copy.unavailable)
    }
  }, [copy.unavailable])

  useEffect(() => {
    if (!pipelineAvailable()) {
      setRows([])
      setFailure(copy.unavailable)

      return
    }

    void load()
  }, [copy.unavailable, load])

  const save = useCallback(async () => {
    setSaving(true)
    setFailure(null)

    try {
      const answer = await saveOpportunity({
      contact_phone: contact,
      lost_reason: doneStage === 'perdido' ? lostReason : '',
      stage: doneStage,
      title,
      value_cents: Number(value) || 0
    })

      if ('error' in answer) {
        setFailure(pipelineErrorText(answer.error))
      } else {
        setRows(answer.opportunities)
        setTitle('')
        setValue('')
        setContact('')
      }
    } finally {
      setSaving(false)
    }
  }, [contact, title, value])

  const move = useCallback(
    async (row: CrmOpportunityRow, stage: CrmOpportunityRow['stage'], reason = '') => {
      const answer = await saveOpportunity({
        ...row,
        lost_reason: stage === 'perdido' ? reason : '',
        stage
      })

    if ('error' in answer) {
      setFailure(pipelineErrorText(answer.error))
    } else {
      setRows(answer.opportunities)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      setRows(await removeOpportunity(id))
    } catch {
      setFailure(copy.unavailable)
    }
  }, [copy.unavailable])

  const totals = opportunityTotals(rows ?? [])

  return (
    <div className="mt-8 border-t border-border/60 pt-6">
      <p className="mb-1 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        {copy.title}
      </p>
      <p className="mb-2 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        {copy.intro}
      </p>

      {rows !== null && rows.length > 0 ? (
        <p className="mb-4 text-sm text-(--ui-text-secondary)">
          {`${copy.open}: ${money(totals.openCents)} · ${copy.won}: ${money(totals.wonCents)}`}
        </p>
      ) : null}

      {failure ? <p className="mb-3 text-sm text-(--ui-text-secondary)">{failure}</p> : null}

      {rows === null ? (
        <Loader className="mx-auto my-2 size-6 text-(--ui-text-tertiary)" label={t.common.loading} type="rose-orbit" />
      ) : null}

      {rows !== null && rows.length === 0 && !failure ? (
        <p className="mb-3 text-sm text-(--ui-text-secondary)">{copy.empty}</p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.opportunity}
          </span>
          <input
            className="h-8 w-52 rounded-md border border-border/60 bg-transparent px-2 text-sm"
            onChange={event => setTitle(event.target.value)}
            value={title}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.value}
          </span>
          <input
            className="h-8 w-32 rounded-md border border-border/60 bg-transparent px-2 text-sm"
            onChange={event => setValue(event.target.value)}
            value={value}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.contact}
          </span>
          <select
            aria-label={copy.contact}
            className="h-8 w-48 rounded-md border border-border/60 bg-transparent px-2 text-sm"
            onChange={event => setContact(event.target.value)}
            value={contact}
          >
            <option value="">—</option>
            {contacts.map(entry => (
              <option key={entry.phone} value={entry.phone}>
                {entry.name}
              </option>
            ))}
          </select>
        <label className="flex flex-col gap-1">
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.stageInitial}
          </span>
          <select
            aria-label={copy.stageInitial}
            className="h-8 rounded-md border border-border/60 bg-transparent px-2 text-sm"
            onChange={event => {
              setDoneStage(event.target.value as PipelineStage)
              setLostReason('')
            }}
            value={doneStage}
          >
            {PIPELINE_STAGES.map(entry => (
              <option key={entry} value={entry}>
                {stageLabel(entry, copy.stages)}
              </option>
            ))}
          </select>
        </label>
        {doneStage === 'perdido' ? (
          <label className="flex flex-col gap-1">
            <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
              {copy.lostReason}
            </span>
            <input
              aria-label={copy.lostReason}
              className="h-8 rounded-md border border-border/60 bg-transparent px-2 text-sm"
              onChange={event => setLostReason(event.target.value)}
              value={lostReason}
            />
          </label>
        ) : null}
        </label>
        <Button disabled={saving} onClick={() => void save()} size="sm">
          {copy.add}
        </Button>
      </div>

      {rows !== null && rows.length > 0 ? (
        // Funil visual: uma coluna por etapa, com contagem e total reais daquela etapa. O cartao continua igual
        // (mover de etapa, motivo de perda obrigatorio, remover) — o que muda e o lugar: lado a lado, como um funil
        // se le. Largura fixa com rolagem horizontal porque sete etapas em colunas elasticas espremem o texto ate
        // truncar tudo; o funil rola, o cartao nao quebra.
        <div className="flex flex-wrap gap-2 pb-2">
          {PIPELINE_STAGES.map(stage => {
            const daEtapa = rows.filter(row => row.stage === stage)
            const totalEtapa = daEtapa.reduce((soma, row) => soma + row.value_cents, 0)

            return (
              <section className="w-60 shrink-0 rounded-md border border-border/60 p-2" key={stage}>
                <header className="mb-2 flex flex-col gap-0.5 border-b border-border/60 pb-1">
                  <span className="text-xs font-semibold text-foreground">{stageLabel(stage, copy.stages)}</span>
                  <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                    {`${daEtapa.length} · ${money(totalEtapa)}`}
                  </span>
                </header>
                {daEtapa.length === 0 ? (
                  <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                    {copy.columnEmpty}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {daEtapa.map(row => (
                      <li
                        className="flex flex-col gap-1.5 rounded-md border border-border/60 px-2 py-1.5"
                        key={row.id}
                      >
                        <span className="text-sm leading-tight text-foreground">{row.title}</span>
                        <span className="flex flex-col text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                          <span className="truncate">{row.contact_phone}</span>
                          <span className="truncate">{money(row.value_cents, row.currency)}</span>
                        </span>
                        <select
                          aria-label={copy.stage}
                          className="h-7 w-full rounded-md border border-border/60 bg-transparent px-1 text-xs"
                          onChange={event => {
                            const next = event.target.value as CrmOpportunityRow['stage']

                            if (next === 'perdido') {
                              setPendingLoss({ id: row.id, reason: '' })

                              return
                            }

                            void move(row, next)
                          }}
                          value={row.stage}
                        >
                          {PIPELINE_STAGES.map(opcao => (
                            <option key={opcao} value={opcao}>
                              {stageLabel(opcao, copy.stages)}
                            </option>
                          ))}
                        </select>
                        {pendingLoss?.id === row.id ? (
                          <span className="flex flex-col gap-1">
                            <input
                              aria-label={copy.lostReason}
                              className="h-7 w-full rounded-md border border-border/60 bg-transparent px-1 text-xs"
                              onChange={event => setPendingLoss({ id: row.id, reason: event.target.value })}
                              value={pendingLoss.reason}
                            />
                            <Button
                              className="w-full"
                              onClick={() => {
                                void move(row, 'perdido', pendingLoss.reason)
                                setPendingLoss(null)
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              {copy.add}
                            </Button>
                          </span>
                        ) : row.stage === 'perdido' && row.lost_reason ? (
                          <span className="text-xs text-(--ui-text-tertiary)">{row.lost_reason}</span>
                        ) : null}
                        <Button className="w-full" onClick={() => void remove(row.id)} size="sm" variant="ghost">
                          {copy.remove}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

import { useEffect, useState } from 'react'

import { listCrmContacts, type CrmContactRow } from '@/api/crm-contacts'
import { listOpportunities, money, type CrmOpportunityRow } from '@/api/crm-pipeline'
import { listTasks, type CrmTaskRow } from '@/api/crm-tasks'
import { useI18n } from '@/i18n/context'

import { summarizeCrm } from './overview'

/**
 * Faixa de indicadores do CRM.
 *
 * Cada celula mostra um numero que saiu de um arquivo deste computador. Enquanto os tres stores nao respondem, a
 * faixa nao desenha: numero pela metade e pior que numero nenhum. Sem bridge (versao web) ela some inteira em vez
 * de mostrar zeros, que seriam mentira sobre nao haver dados.
 */
export function CrmOverview() {
  const { t } = useI18n()
  const copy = t.crmOverview

  const [dados, setDados] = useState<null | {
    contacts: CrmContactRow[]
    opportunities: CrmOpportunityRow[]
    tasks: CrmTaskRow[]
  }>(null)

  useEffect(() => {
    let vivo = true

    void Promise.all([listCrmContacts(), listOpportunities(), listTasks()])
      .then(([contacts, opportunities, tasks]) => {
        if (vivo) {
          setDados({ contacts, opportunities, tasks })
        }
      })
      .catch(() => {
        // Sem os tres stores a faixa nao aparece; cada secao abaixo ja explica o proprio estado.
      })

    return () => {
      vivo = false
    }
  }, [])

  if (!dados) {
    return null
  }

  const resumo = summarizeCrm({ ...dados, now: Date.now() })
  const celulas = [
    { label: copy.contacts, value: `${resumo.contacts}` },
    { label: copy.openOpportunities, value: `${resumo.openOpportunities}` },
    { label: copy.openValue, value: money(resumo.openValueCents) },
    { label: copy.wonValue, value: money(resumo.wonValueCents) },
    { label: copy.openTasks, value: `${resumo.openTasks}` },
    { label: copy.lateTasks, value: `${resumo.lateTasks}`, alarme: resumo.lateTasks > 0 }
  ]

  return (
    <section aria-label={copy.title} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {celulas.map(celula => (
        <div className="rounded border border-(--ui-border) px-2.5 py-2" key={celula.label}>
          <div className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {celula.label}
          </div>
          <div
            className={
              celula.alarme ? 'text-sm font-semibold text-destructive' : 'text-sm font-semibold text-foreground'
            }
          >
            {celula.value}
          </div>
        </div>
      ))}
    </section>
  )
}

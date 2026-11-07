/**
 * Painel de indicadores do CRM — 14.6.
 *
 * Mostra so o que as mensagens provam: quantas conversas esperam resposta, quantas chegaram nos ultimos 7 dias e o tempo
 * medio de resposta. Nada de numero decorativo: se nao houver resposta registrada, o tempo nao aparece.
 */

import {
  averageResponseTime,
  conversationsCreatedSince,
  needsReply,
  responseTimeLabel,
} from '@/app/crm/response-time'
import type { CrmConversationRow } from '@/api/crm-conversations'

const SETE_DIAS = 7 * 86_400_000

interface Section {
  indicatorsTitle: string
  newConversations: string
  responseTime: string
  waitingReply: string
}

interface Props {
  conversas: readonly CrmConversationRow[]
  section: Section
}

export function CrmIndicators({ conversas, section }: Props) {
  const agora = Date.now()
  const esperando = conversas.filter(c => needsReply(c.messages)).length
  const novas = conversationsCreatedSince(conversas, agora - SETE_DIAS, agora)
  const tempo = averageResponseTime(conversas)

  return (
    <div className="flex flex-col gap-1 rounded border border-(--ui-border) p-2">
      <span className="text-xs font-semibold text-(--ui-text-secondary)">{section.indicatorsTitle}</span>
      <div className="flex flex-wrap gap-4 text-sm text-foreground">
        <span>
          {section.waitingReply}: <strong>{esperando}</strong>
        </span>
        <span>
          {section.newConversations}: <strong>{novas}</strong>
        </span>
        {tempo === null ? null : (
          <span>
            {section.responseTime}: <strong>{responseTimeLabel(tempo.mediaMs)}</strong>
          </span>
        )}
      </div>
    </div>
  )
}

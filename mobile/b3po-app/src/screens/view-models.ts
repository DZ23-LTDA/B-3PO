/**
 * View-models das telas do cliente mobile.
 *
 * As telas React Native ficam finas: elas não decidem nada, só desenham o que estes módulos
 * calculam. Isso permite provar comportamento (ordem, rótulo, botão habilitado, estado vazio) sem
 * aparelho nem SDK — e mantém a regra do GOAL de que o cliente apresenta estado real, nunca
 * inventado.
 *
 * Cópia em pt-BR: o app é pt-first hoje; quando houver catálogo de tradução, estes rótulos passam a
 * vir dele sem mudar a forma do view-model.
 */

import type { ExecutionEvent, ExecutionEventType } from '../protocol/execution'

/* ── lista de bots ───────────────────────────────────────────────────────── */

export interface BotRow {
  name: string
  title: string
  description: string
  /** Estado vindo do gateway; `null` quando o gateway não informa. */
  activity: 'idle' | 'working' | 'waiting_approval' | 'done' | 'error' | null
}

export interface BotListItem {
  name: string
  title: string
  description: string
  statusLabel: string
  /** Só marcamos atenção quando o gateway disse que há aprovação pendente. */
  needsAttention: boolean
  accessibilityLabel: string
}

const BOT_STATUS_LABEL: Record<NonNullable<BotRow['activity']>, string> = {
  idle: 'Ocioso',
  working: 'Trabalhando',
  waiting_approval: 'Aguardando aprovação',
  done: 'Concluído',
  error: 'Com erro'
}

export function botListItems(rows: readonly BotRow[]): BotListItem[] {
  return rows
    .map(row => {
      const statusLabel = row.activity ? BOT_STATUS_LABEL[row.activity] : 'Sem atividade'

      return {
        name: row.name,
        title: row.title,
        description: row.description,
        statusLabel,
        needsAttention: row.activity === 'waiting_approval' || row.activity === 'error',
        accessibilityLabel: `${row.title}, ${statusLabel}`
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
}

/* ── execução na tela de conversa ────────────────────────────────────────── */

export type ExecutionPhase = 'idle' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled'

export interface ExecutionSummary {
  executionId: string
  phase: ExecutionPhase
  phaseLabel: string
  /** Última etapa legível (ferramenta iniciada/terminada), para o usuário ver progresso real. */
  detail: string | null
  toolName: string | null
  /** Só é `true` quando o gateway PEDIU aprovação — nunca por heurística. */
  canDecide: boolean
  errorMessage: string | null
}

const PHASE_LABEL: Record<ExecutionPhase, string> = {
  idle: 'Sem execução',
  running: 'Em execução',
  waiting_approval: 'Aguardando sua aprovação',
  completed: 'Concluído',
  failed: 'Falhou',
  cancelled: 'Cancelado'
}

const PHASE_OF_EVENT: Partial<Record<ExecutionEventType, ExecutionPhase>> = {
  'execution.created': 'running',
  'execution.started': 'running',
  'execution.waiting_approval': 'waiting_approval',
  'execution.tool_started': 'running',
  'execution.tool_finished': 'running',
  'execution.completed': 'completed',
  'execution.failed': 'failed',
  'execution.cancel_requested': 'running',
  'execution.cancelled': 'cancelled'
}

/** Resume a execução a partir dos eventos JÁ aplicados pelo cursor. */
export function summarizeExecution(events: readonly ExecutionEvent[]): ExecutionSummary | null {
  if (events.length === 0) {
    return null
  }

  const last = events[events.length - 1]

  if (!last) {
    return null
  }

  const phase = PHASE_OF_EVENT[last.type] ?? 'running'
  const toolName = typeof last.data?.['tool'] === 'string' ? String(last.data['tool']) : null
  const error = typeof last.data?.['error'] === 'string' ? String(last.data['error']) : null

  let detail: string | null = null

  if (last.type === 'execution.tool_started') {
    detail = toolName ? `Usando ${toolName}` : 'Usando uma ferramenta'
  } else if (last.type === 'execution.tool_finished') {
    detail = toolName ? `${toolName} concluída` : 'Ferramenta concluída'
  }

  return {
    executionId: last.execution_id,
    phase,
    phaseLabel: PHASE_LABEL[phase],
    detail,
    toolName,
    canDecide: phase === 'waiting_approval',
    errorMessage: phase === 'failed' ? error : null
  }
}

/* ── tela de aprovação ───────────────────────────────────────────────────── */

export type ApprovalAction = 'approve' | 'deny'

export interface ApprovalView {
  title: string
  body: string
  /** Ação que o gateway ainda aceita; `null` quando a decisão já foi enviada. */
  pending: ApprovalAction | null
  approveEnabled: boolean
  denyEnabled: boolean
  /** A decisão precisa do token do cofre; sem ele a tela não deixa decidir. */
  blockedReason: string | null
}

export function approvalView(
  summary: ExecutionSummary | null,
  options: { deciding: boolean; hasDeviceToken: boolean; ownershipVerified: boolean }
): ApprovalView | null {
  if (!summary || summary.phase !== 'waiting_approval') {
    return null
  }

  const body = summary.toolName
    ? `O bot quer usar ${summary.toolName} para continuar.`
    : 'O bot precisa da sua autorização para continuar.'

  // Uma notificação/deep link pode citar um `execution_id` de outra pessoa. Até o backend
  // confirmar que a execução pertence a ESTE dispositivo, a tela não oferece decisão.
  if (!options.ownershipVerified) {
    return {
      title: 'Aprovação pendente',
      body,
      pending: null,
      approveEnabled: false,
      denyEnabled: false,
      blockedReason: 'Confirmando com o computador que esta execução é sua…'
    }
  }

  if (!options.hasDeviceToken) {
    return {
      title: 'Aprovação pendente',
      body,
      pending: null,
      approveEnabled: false,
      denyEnabled: false,
      blockedReason: 'Pareie este aparelho novamente: a chave de decisão não está disponível.'
    }
  }

  if (options.deciding) {
    return {
      title: 'Aprovação pendente',
      body,
      pending: null,
      approveEnabled: false,
      denyEnabled: false,
      blockedReason: 'Enviando sua decisão…'
    }
  }

  return {
    title: 'Aprovação pendente',
    body,
    pending: 'approve',
    approveEnabled: true,
    denyEnabled: true,
    blockedReason: null
  }
}

/* ── estados vazios / offline ────────────────────────────────────────────── */

export type EmptyReason = 'no-bots' | 'no-conversations' | 'offline' | 'connecting'

export function emptyStateCopy(reason: EmptyReason): { title: string; body: string } {
  switch (reason) {
    case 'no-bots':
      return {
        title: 'Nenhum bot ainda',
        body: 'Os bots são criados no computador. Depois de criar um, ele aparece aqui para conversar.'
      }
    case 'no-conversations':
      return { title: 'Nenhuma conversa', body: 'Escolha um bot para começar a conversar.' }
    case 'offline':
      return {
        title: 'Sem conexão com o computador',
        body: 'Verifique se o B-3PO está aberto na mesma rede. Suas ações continuam pendentes até reconectar.'
      }
    case 'connecting':
      return { title: 'Conectando…', body: 'Falando com o computador que hospeda seus bots.' }
  }
}

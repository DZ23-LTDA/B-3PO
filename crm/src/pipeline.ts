/**
 * Funil comercial: detalhes que faltavam no `Deal` (GOAL §14.3).
 *
 * O `Deal` base (`contacts.ts`) tem id, contato, etapa, valor e datas. Aqui entram **probabilidade**,
 * **previsão de fechamento**, **motivo de perda** e **histórico de etapa** — o que transforma um
 * quadro de cartões em instrumento de gestão.
 *
 * Regras que o código impõe (e os testes provam):
 *
 * - **perder exige motivo**: mover para etapa de perda sem justificativa é recusado. Sem isso o
 *   relatório de perdas vira "não informado" e não ensina nada;
 * - **ganho limpa motivo de perda** e perda limpa valor de fechamento — estado contraditório não
 *   existe;
 * - **probabilidade é 0..100**, não 0..1 nem 0..1000: validar aqui evita previsão absurda na tela;
 * - **previsão ponderada** = valor × probabilidade da etapa, somada só sobre negócios abertos;
 *   negócio ganho não entra em previsão (já é receita);
 * - **histórico é append-only** com de/para, autor e quando;
 * - **previsão de fechamento atrasada** é calculada contra `now`, não digitada.
 */

export interface DealStage extends PipelineStageLike {
  /** Probabilidade padrão da etapa (0..100), usada quando o negócio não define a sua. */
  probability?: number
  /** Etapa marca perda. */
  lost?: boolean
}

export interface PipelineStageLike {
  id: string
  name: string
  order: number
  won?: boolean
}

export interface DealStageChange {
  at: number
  from: string
  to: string
  by: string | null
  note: string | null
}

export interface DealDetail {
  id: string
  contactId: string
  stageId: string
  title: string
  valueCents: number
  /** 0..100; quando ausente, vale a probabilidade da etapa. */
  probability: number | null
  /** Data prevista de fechamento (epoch ms) ou `null`. */
  expectedCloseAt: number | null
  /** Obrigatório quando a etapa é de perda. */
  lostReason: string | null
  owner: string | null
  createdAt: number
  updatedAt: number
  history: DealStageChange[]
}

export type DealError =
  | 'unknown_stage'
  | 'lost_reason_required'
  | 'invalid_probability'
  | 'same_stage'

export interface DealInput {
  id: string
  contactId: string
  title: string
  stageId: string
  now: number
  valueCents?: number
  probability?: number | null
  expectedCloseAt?: number | null
  owner?: string | null
}

const MIN_REASON = 3

export function createDeal(input: DealInput, stages: readonly DealStage[]): DealDetail | { error: DealError } {
  if (!stages.some(stage => stage.id === input.stageId)) {
    return { error: 'unknown_stage' }
  }

  if (input.probability !== null && input.probability !== undefined) {
    if (!Number.isFinite(input.probability) || input.probability < 0 || input.probability > 100) {
      return { error: 'invalid_probability' }
    }
  }

  return {
    id: input.id,
    contactId: input.contactId,
    title: input.title.trim(),
    stageId: input.stageId,
    valueCents: Math.max(0, Math.round(input.valueCents ?? 0)),
    probability: input.probability ?? null,
    expectedCloseAt: input.expectedCloseAt ?? null,
    lostReason: null,
    owner: (input.owner ?? '').trim() || null,
    createdAt: input.now,
    updatedAt: input.now,
    history: [{ at: input.now, from: '', to: input.stageId, by: null, note: 'criado' }]
  }
}

/**
 * Move de etapa validando existência, motivo de perda e coerência de estado. `by` vai para o histórico
 * — quem moveu é informação, não detalhe.
 */
export function moveDealTo(
  deal: DealDetail,
  stageId: string,
  stages: readonly DealStage[],
  now: number,
  options: { by?: string | null; lostReason?: string | null; note?: string | null } = {}
): DealDetail | { error: DealError } {
  const target = stages.find(stage => stage.id === stageId)

  if (!target) {
    return { error: 'unknown_stage' }
  }

  if (deal.stageId === stageId) {
    return { error: 'same_stage' }
  }

  const reason = (options.lostReason ?? '').trim()

  if (target.lost && reason.length < MIN_REASON) {
    return { error: 'lost_reason_required' }
  }

  return {
    ...deal,
    stageId,
    // Ganho limpa perda; perda guarda o motivo; demais etapas mantêm o que existir.
    lostReason: target.won ? null : target.lost ? reason : deal.lostReason,
    updatedAt: now,
    history: [
      ...deal.history,
      {
        at: now,
        from: deal.stageId,
        to: stageId,
        by: options.by ?? null,
        note: options.note ?? (target.lost ? reason : null)
      }
    ]
  }
}

export function setProbability(
  deal: DealDetail,
  probability: number | null,
  now: number,
  by: string | null = null
): DealDetail | { error: DealError } {
  if (probability !== null) {
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
      return { error: 'invalid_probability' }
    }
  }

  return {
    ...deal,
    probability,
    updatedAt: now,
    history: [
      ...deal.history,
      { at: now, from: deal.stageId, to: deal.stageId, by, note: `probabilidade: ${probability ?? 'padrão da etapa'}` }
    ]
  }
}

/** Probabilidade efetiva: a do negócio quando existe, senão a da etapa, senão 0. */
export function effectiveProbability(deal: DealDetail, stages: readonly DealStage[]): number {
  if (deal.probability !== null) {
    return deal.probability
  }

  const stage = stages.find(candidate => candidate.id === deal.stageId)

  return stage?.probability ?? 0
}

export function isWon(deal: DealDetail, stages: readonly DealStage[]): boolean {
  return stages.find(stage => stage.id === deal.stageId)?.won === true
}

export function isLost(deal: DealDetail, stages: readonly DealStage[]): boolean {
  return stages.find(stage => stage.id === deal.stageId)?.lost === true
}

export function isOpen(deal: DealDetail, stages: readonly DealStage[]): boolean {
  return !isWon(deal, stages) && !isLost(deal, stages)
}

/** Previsão atrasada: prazo passou e o negócio continua aberto. */
export function isForecastOverdue(deal: DealDetail, stages: readonly DealStage[], now: number): boolean {
  if (!isOpen(deal, stages) || deal.expectedCloseAt === null) {
    return false
  }

  return now > deal.expectedCloseAt
}

export interface Forecast {
  openDeals: number
  openValueCents: number
  /** Soma ponderada por probabilidade — é estimativa, não receita. */
  weightedCents: number
  wonDeals: number
  wonValueCents: number
  lostDeals: number
  overdueDeals: number
  /** Média de dias até fechar, somente entre ganhos com histórico suficiente. */
  averageCycleDays: number | null
}

export function forecast(deals: readonly DealDetail[], stages: readonly DealStage[], now: number): Forecast {
  const open = deals.filter(deal => isOpen(deal, stages))
  const won = deals.filter(deal => isWon(deal, stages))
  const lost = deals.filter(deal => isLost(deal, stages))
  const overdue = open.filter(deal => isForecastOverdue(deal, stages, now))

  const weighted = open.reduce(
    (sum, deal) => sum + Math.round((deal.valueCents * effectiveProbability(deal, stages)) / 100),
    0
  )

  const cycles = won
    .map(deal => (deal.updatedAt > deal.createdAt ? (deal.updatedAt - deal.createdAt) / 86_400_000 : null))
    .filter((days): days is number => days !== null)

  return {
    openDeals: open.length,
    openValueCents: open.reduce((sum, deal) => sum + deal.valueCents, 0),
    weightedCents: weighted,
    wonDeals: won.length,
    wonValueCents: won.reduce((sum, deal) => sum + deal.valueCents, 0),
    lostDeals: lost.length,
    overdueDeals: overdue.length,
    averageCycleDays:
      cycles.length > 0 ? Math.round((cycles.reduce((sum, days) => sum + days, 0) / cycles.length) * 10) / 10 : null
  }
}

/** Relatório de perdas: motivo → quantidade e valor, do maior para o menor. Nunca "não informado". */
export function lostReasons(deals: readonly DealDetail[], stages: readonly DealStage[]): Array<{ reason: string; count: number; valueCents: number }> {
  const byReason = new Map<string, { count: number; valueCents: number }>()

  for (const deal of deals) {
    if (!isLost(deal, stages)) {
      continue
    }

    const reason = deal.lostReason ?? 'sem motivo registrado'
    const current = byReason.get(reason) ?? { count: 0, valueCents: 0 }

    byReason.set(reason, { count: current.count + 1, valueCents: current.valueCents + deal.valueCents })
  }

  return [...byReason.entries()]
    .map(([reason, stats]) => ({ reason, ...stats }))
    .sort((a, b) => b.count - a.count || b.valueCents - a.valueCents)
}

/** Cartão do Kanban: título, valor, probabilidade e alerta de previsão. */
export interface DealCard {
  id: string
  title: string
  valueCents: number
  probability: number
  overdue: boolean
  lostReason: string | null
  accessibilityLabel: string
}

export function dealCard(deal: DealDetail, stages: readonly DealStage[], now: number): DealCard {
  const probability = effectiveProbability(deal, stages)
  const overdue = isForecastOverdue(deal, stages, now)

  return {
    id: deal.id,
    title: deal.title,
    valueCents: deal.valueCents,
    probability,
    overdue,
    lostReason: deal.lostReason,
    accessibilityLabel: `${deal.title}, ${probability}% de chance${overdue ? ', previsão atrasada' : ''}${
      deal.lostReason ? `, perdido: ${deal.lostReason}` : ''
    }`
  }
}

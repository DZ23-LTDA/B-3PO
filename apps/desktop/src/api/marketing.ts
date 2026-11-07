/**
 * Marketing no renderer.
 *
 * CTR e custo-por-lead chegam calculados do processo principal: same numeric authority as the P&L.
 * Um `null` significa "sem impressão"/"sem lead", que é diferente de zero — e a tela precisa distinguir
 * os dois para não afirmar "0%" quando não se sabe.
 */

export interface CampaignRow {
  budget_cents: number
  channel: string
  clicks: number
  cpl_cents: null | number
  ctr: null | number
  ends_at: number
  estourou: boolean
  id: string
  impressions: number
  leads: number
  name: string
  spend_cents: number
  starts_at: number
  status: 'ativa' | 'encerrada' | 'agendada' | 'rascunho'
}

export interface PostRow {
  campaign_id: string
  content: string
  id: string
  scheduled_for: number
  status: 'aprovado' | 'descartado' | 'rascunho'
}

export interface MarketingIndicators {
  agendadasVencidas: number
  ativas: number
  estouradas: number
  leads: number
  postsAprovados: number
  postsRascunho: number
  spendTotalCents: number
}

interface Bridge {
  campaigns: () => Promise<{ campaigns: CampaignRow[] }>
  createCampaign: (payload: Record<string, unknown>) => Promise<{ error: string } | unknown>
  createPost: (payload: Record<string, unknown>) => Promise<{ error: string } | unknown>
  indicators: () => Promise<{ indicators: MarketingIndicators }>
  posts: () => Promise<{ posts: PostRow[] }>
  setCampaignStatus: (payload: Record<string, unknown>) => Promise<{ error: string } | unknown>
  setPostStatus: (payload: Record<string, unknown>) => Promise<{ error: string } | unknown>
}

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { marketing?: Bridge } }).hermesDesktop?.marketing ?? null
}

export function marketingAvailable(): boolean {
  return bridge() !== null
}

export async function listCampaigns(): Promise<CampaignRow[]> {
  const api = bridge()

  return api ? ((await api.campaigns()).campaigns ?? []) : []
}

export async function listPosts(): Promise<PostRow[]> {
  const api = bridge()

  return api ? ((await api.posts()).posts ?? []) : []
}

export async function indicators(): Promise<MarketingIndicators | null> {
  const api = bridge()

  return api ? ((await api.indicators()).indicators ?? null) : null
}

/**
 * Resultado de escrita.
 *
 * Tipado como discriminado de proposito: `{ error } | unknown` colapsa para `unknown` e obriga a tela
 * a converter o tipo que ela nem sabe qual e. O union explicito deixa `'error' in r` funcionar.
 */
export type WriteResult = { error: string } | { ok: true }

export async function createCampaign(payload: Record<string, unknown>): Promise<WriteResult> {
  const api = bridge()

  return api ? normalizar(await api.createCampaign(payload)) : { error: 'marketing_indisponivel' }
}

export async function createPost(payload: Record<string, unknown>): Promise<WriteResult> {
  const api = bridge()

  return api ? normalizar(await api.createPost(payload)) : { error: 'marketing_indisponivel' }
}

export async function approvePost(id: string): Promise<WriteResult> {
  const api = bridge()

  return api ? normalizar(await api.setPostStatus({ id, status: 'aprovado' })) : { error: 'marketing_indisponivel' }
}

function normalizar(bruto: unknown): WriteResult {
  const erro = (bruto as { error?: unknown } | null)?.error

  return typeof erro === 'string' ? { error: erro } : { ok: true }
}

export const STATUS_LABEL: Record<CampaignRow['status'], string> = {
  agendada: 'Agendada',
  ativa: 'Ativa',
  encerrada: 'Encerrada',
  rascunho: 'Rascunho'
}

/** Percentual com 1 casa. `null` vira "sem dados" na tela — nunca "0%". */
export function percentLabel(valor: null | number): string {
  return valor === null ? '—' : `${(valor * 100).toFixed(1)}%`
}

export function moneyLabel(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`
}

// Marketing: campanhas e calendário editorial.
//
// Duas entidades no mesmo arquivo porque pertencem ao mesmo dono — campanha e conteúdo são o mesmo
// domínio, e separá-los criaria dois lugares para a mesma pergunta ("o que está agendado?").
//
// TRÊS DECISÕES
//
// 1. **Métrica é derivada.** CTR é `cliques / impressões`, calculado na leitura. Guardar CTR no disco é
//    guardar uma conta que pode discordar das parcelas.
// 2. **Nada é publicado por este módulo.** O status para em `aprovado`; publicar é ação externa, exige
//    integração com a API oficial de cada canal e autorização específica do GOAL. Um `publicar()` aqui
//    seria um botão que mente.
// 3. **Encerrar antes de começar é recusado.** Campanha com fim anterior ao início produz métrica sem
//    janela e relatório impossível.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'

export const CAMPAIGN_CHANNELS = ['instagram', 'facebook', 'google', 'tiktok', 'email', 'whatsapp'] as const

export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number]

export const CAMPAIGN_STATUSES = ['rascunho', 'agendada', 'ativa', 'encerrada'] as const

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

/**
 * O último status alcançável aqui é `aprovado`. `publicado` só existiria com integração real e
 * homologada — marcá-lo sem isso seria declarar no banco uma ação que não aconteceu.
 */
export const POST_STATUSES = ['rascunho', 'aprovado', 'descartado'] as const

export type PostStatus = (typeof POST_STATUSES)[number]

export interface Campaign {
  budget_cents: number
  channel: CampaignChannel
  clicks: number
  created_at: number
  ends_at: number
  id: string
  impressions: number
  leads: number
  name: string
  spend_cents: number
  starts_at: number
  status: CampaignStatus
  tenant_id: string
  updated_at: number
}

export interface EditorialPost {
  campaign_id: string
  content: string
  created_at: number
  id: string
  /** 0 quando ainda é rascunho sem data. */
  scheduled_for: number
  status: PostStatus
  tenant_id: string
  updated_at: number
}

export interface MarketingFile {
  campaigns: Campaign[]
  posts: EditorialPost[]
  schema_version: 1
}

function empty(): MarketingFile {
  return { campaigns: [], posts: [], schema_version: 1 }
}

export function marketingStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'marketing.json')
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function inteiro(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

/** CTR em fração. `null` quando não houve impressão — 0/0 não é 0%, é ausência de dado. */
export function ctr(campanha: Pick<Campaign, 'clicks' | 'impressions'>): null | number {
  if (campanha.impressions <= 0) return null

  return campanha.clicks / campanha.impressions
}

/** Custo por lead em centavos. `null` sem lead. */
export function costPerLead(campanha: Pick<Campaign, 'leads' | 'spend_cents'>): null | number {
  if (campanha.leads <= 0) return null

  return Math.round(campanha.spend_cents / campanha.leads)
}

/** Estourou o orçamento? Derivado do gasto real, não do previsto. */
export function overBudget(campanha: Pick<Campaign, 'budget_cents' | 'spend_cents'>): boolean {
  return campanha.budget_cents > 0 && campanha.spend_cents > campanha.budget_cents
}

export function normalizeCampaign(input: unknown, now: number): { error: string } | { campaign: Campaign } {
  const raw = (input ?? {}) as Record<string, unknown>
  const nome = texto(raw['name'])

  if (!nome) return { error: 'nome_obrigatorio' }

  const startsAt = inteiro(raw['starts_at'])
  const endsAt = inteiro(raw['ends_at'])

  if (startsAt <= 0) return { error: 'inicio_obrigatorio' }

  if (endsAt > 0 && endsAt <= startsAt) {
    // Sem janela valida nao ha relatorio possivel: a campanha nunca "durou".
    return { error: 'fim_antes_do_inicio' }
  }

  const channel = CAMPAIGN_CHANNELS.includes(raw['channel'] as CampaignChannel)
    ? (raw['channel'] as CampaignChannel)
    : null

  if (!channel) return { error: 'canal_invalido' }

  const status = CAMPAIGN_STATUSES.includes(raw['status'] as CampaignStatus)
    ? (raw['status'] as CampaignStatus)
    : 'rascunho'

  return {
    campaign: {
      budget_cents: inteiro(raw['budget_cents']),
      channel,
      clicks: inteiro(raw['clicks']),
      created_at: now,
      ends_at: endsAt,
      id: texto(raw['id']) || `camp_${now}_${Math.random().toString(36).slice(2, 8)}`,
      impressions: inteiro(raw['impressions']),
      leads: inteiro(raw['leads']),
      name: nome,
      spend_cents: inteiro(raw['spend_cents']),
      starts_at: startsAt,
      status,
      tenant_id: texto(raw['tenant_id']) || DEFAULT_TENANT,
      updated_at: now
    }
  }
}

export function normalizePost(input: unknown, now: number): { error: string } | { post: EditorialPost } {
  const raw = (input ?? {}) as Record<string, unknown>
  const conteudo = texto(raw['content'])

  if (!conteudo) return { error: 'conteudo_obrigatorio' }

  return {
    post: {
      campaign_id: texto(raw['campaign_id']),
      content: conteudo,
      created_at: now,
      id: texto(raw['id']) || `post_${now}_${Math.random().toString(36).slice(2, 8)}`,
      scheduled_for: inteiro(raw['scheduled_for']),
      status: 'rascunho',
      tenant_id: texto(raw['tenant_id']) || DEFAULT_TENANT,
      updated_at: now
    }
  }
}

export function parseMarketing(raw: string): MarketingFile {
  try {
    const parsed = JSON.parse(raw) as Partial<MarketingFile>

    if (!parsed) return empty()

    return {
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns.filter(c => c && typeof c.id === 'string') : [],
      posts: Array.isArray(parsed.posts) ? parsed.posts.filter(p => p && typeof p.id === 'string') : [],
      schema_version: 1
    }
  } catch {
    return empty()
  }
}

export interface MarketingIndicators {
  ativas: number
  /** Campanhas agendadas cujo início já passou — o agendamento não foi cumprido ou não foi atualizado. */
  agendadasVencidas: number
  estouradas: number
  leads: number
  postsAprovados: number
  /** Conteúdo rascunho ainda sem aprovação — a fila editorial real. */
  postsRascunho: number
  spendTotalCents: number
}

export function indicators(file: MarketingFile, now: number, tenantId: string = DEFAULT_TENANT): MarketingIndicators {
  const camps = file.campaigns.filter(c => c.tenant_id === tenantId)
  const posts = file.posts.filter(p => p.tenant_id === tenantId)

  return {
    agendadasVencidas: camps.filter(c => c.status === 'agendada' && c.starts_at <= now).length,
    ativas: camps.filter(c => c.status === 'ativa').length,
    estouradas: camps.filter(c => overBudget(c)).length,
    leads: camps.reduce((total, c) => total + c.leads, 0),
    postsAprovados: posts.filter(p => p.status === 'aprovado').length,
    postsRascunho: posts.filter(p => p.status === 'rascunho').length,
    spendTotalCents: camps.reduce((total, c) => total + c.spend_cents, 0)
  }
}

export class MarketingStore {
  constructor(private readonly filePath: string) {}

  async listCampaigns(tenantId: string = DEFAULT_TENANT): Promise<Campaign[]> {
    return (await this.read()).campaigns.filter(c => c.tenant_id === tenantId)
  }

  async listPosts(tenantId: string = DEFAULT_TENANT): Promise<EditorialPost[]> {
    // Ordem de calendario: o que vem antes aparece antes. Sem data vai para o fim.
    return (await this.read())
      .posts.filter(p => p.tenant_id === tenantId)
      .sort((a, b) => (a.scheduled_for || Number.MAX_SAFE_INTEGER) - (b.scheduled_for || Number.MAX_SAFE_INTEGER))
  }

  async indicators(now: number, tenantId: string = DEFAULT_TENANT): Promise<MarketingIndicators> {
    return indicators(await this.read(), now, tenantId)
  }

  async createCampaign(input: unknown): Promise<{ campaign: Campaign; campaigns: Campaign[] } | { error: string }> {
    const normalized = normalizeCampaign(input, Date.now())

    if ('error' in normalized) return normalized

    const file = await this.read()

    file.campaigns.push(normalized.campaign)
    await this.write(file)

    return { campaign: normalized.campaign, campaigns: await this.listCampaigns(normalized.campaign.tenant_id) }
  }

  async setCampaignStatus(id: string, status: CampaignStatus): Promise<{ campaigns: Campaign[] } | { error: string }> {
    if (!CAMPAIGN_STATUSES.includes(status)) return { error: 'status_invalido' }

    const file = await this.read()
    const indice = file.campaigns.findIndex(c => c.id === id)

    if (indice < 0) return { error: 'campanha_nao_encontrada' }

    const atual = file.campaigns[indice]!

    file.campaigns[indice] = { ...atual, status, updated_at: Date.now() }
    await this.write(file)

    return { campaigns: await this.listCampaigns(atual.tenant_id) }
  }

  async createPost(input: unknown): Promise<{ post: EditorialPost; posts: EditorialPost[] } | { error: string }> {
    const normalized = normalizePost(input, Date.now())

    if ('error' in normalized) return normalized

    const file = await this.read()

    // Vinculo com campanha inexistente e recusado: um post apontando para o nada nao aparece em
    // relatorio nenhum e ninguem descobre.
    if (normalized.post.campaign_id && !file.campaigns.some(c => c.id === normalized.post.campaign_id)) {
      return { error: 'campanha_inexistente' }
    }

    file.posts.push(normalized.post)
    await this.write(file)

    return { post: normalized.post, posts: await this.listPosts(normalized.post.tenant_id) }
  }

  async setPostStatus(id: string, status: PostStatus): Promise<{ posts: EditorialPost[] } | { error: string }> {
    if (!POST_STATUSES.includes(status)) return { error: 'status_invalido' }

    const file = await this.read()
    const indice = file.posts.findIndex(p => p.id === id)

    if (indice < 0) return { error: 'conteudo_nao_encontrado' }

    const atual = file.posts[indice]!

    if (status === 'aprovado' && atual.scheduled_for <= 0) {
      // Aprovar sem data nao agenda nada: o conteudo ficaria "aprovado" para sempre sem entrar no
      // calendario, que e justamente o que o calendario editorial deveria evitar.
      return { error: 'data_obrigatoria_para_aprovar' }
    }

    file.posts[indice] = { ...atual, status, updated_at: Date.now() }
    await this.write(file)

    return { posts: await this.listPosts(atual.tenant_id) }
  }

  private async read(): Promise<MarketingFile> {
    try {
      return parseMarketing(await readFile(this.filePath, 'utf8'))
    } catch {
      return empty()
    }
  }

  private async write(file: MarketingFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}

// IPC do marketing.
//
// `hermes:marketing:indicators` e o canal que da sentido a tela: sem ele a lista de campanhas nao
// revela a agendada cujo inicio ja passou sem ninguem notar.
//
// r6 do GOAL V2: os sete canais passam pela guarda.
//
// Por que o marketing e nivel 1: `setPostStatus` com status de publicação é o ato de PUBLICAR FORA da
// empresa, em conta social que carrega o nome dela. `setCampaignStatus` põe verba em circulação. Nenhum
// dos dois é configuração de tela.

import type {
  CampaignStatus,
  EditorialPost,
  PostStatus
} from './marketing-store'
import { ctr, costPerLead, MarketingStore, overBudget, type Campaign } from './marketing-store'
import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'

export interface MarketingDeps {
  marketing: MarketingStore

  /**
   * Ator resolvido no processo principal. `null` recusa.
   *
   * Obrigatório: publicar em rede social em nome da empresa é ato externo. Sem ator, o canal deixa o
   * renderer publicar sem que exista alguém responsável pelo que saiu.
   */
  actorOf: () => Promise<Actor | null>
}

/** Campanha com as metricas derivadas, calculadas aqui para a tela nao refazer a conta. */
export interface CampaignView extends Campaign {
  cpl_cents: null | number
  ctr: null | number
  estourou: boolean
}

export function toView(campaign: Campaign): CampaignView {
  return {
    ...campaign,
    cpl_cents: costPerLead(campaign),
    ctr: ctr(campaign),
    estourou: overBudget(campaign)
  }
}

export function registerMarketingIpc(ipcMain: IpcRegistrar, deps: MarketingDeps): void {
  ipcMain.handle(
    'hermes:marketing:campaigns',
    async (): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'read', 'marketing', async () => {
        const lista = await deps.marketing.listCampaigns()

        return { campaigns: lista.map(toView) }
      })
  )

  ipcMain.handle(
    'hermes:marketing:posts',
    async (): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'read', 'marketing', async () => ({ posts: await deps.marketing.listPosts() }))
  )

  ipcMain.handle(
    'hermes:marketing:indicators',
    async (): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'read', 'marketing', async () => ({
        indicators: await deps.marketing.indicators(Date.now())
      }))
  )

  /**
   * Cria campanha — EXECUTE.
   *
   * Campanha é verba: cria um compromisso de gasto e um alvo de público. Não é leitura.
   */
  ipcMain.handle('hermes:marketing:createCampaign', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'marketing', async () => deps.marketing.createCampaign(payload))
  )

  /**
   * Muda o status da campanha — EXECUTE.
   *
   * `ativa` põe a campanha em circulação; `encerrada` para o gasto. Duas decisões de negócio.
   */
  ipcMain.handle(
    'hermes:marketing:setCampaignStatus',
    async (_event: unknown, payload: unknown): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'execute', 'marketing', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>
        const id = typeof raw['id'] === 'string' ? raw['id'] : ''

        if (!id || typeof raw['status'] !== 'string') {
          return { error: 'status_invalido' }
        }

        return deps.marketing.setCampaignStatus(id, raw['status'] as CampaignStatus)
      })
  )

  /** Cria post no calendário editorial — EXECUTE: é conteúdo que vai sair em nome da empresa. */
  ipcMain.handle('hermes:marketing:createPost', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'marketing', async () => deps.marketing.createPost(payload))
  )

  /**
   * Muda o status do post — EXECUTE, e é o canal mais sensível dos sete.
   *
   * Publicar é o ato externo: o post sai na conta social da empresa e não dá para recolher. Tratar como
   * `read` deixaria o renderer publicar sem responsável.
   */
  ipcMain.handle('hermes:marketing:setPostStatus', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'marketing', async () => {
      const raw = (payload ?? {}) as Record<string, unknown>
      const id = typeof raw['id'] === 'string' ? raw['id'] : ''

      if (!id || typeof raw['status'] !== 'string') {
        return { error: 'status_invalido' }
      }

      return deps.marketing.setPostStatus(id, raw['status'] as PostStatus)
    })
  )
}

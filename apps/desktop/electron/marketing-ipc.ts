// IPC do marketing.
//
// `hermes:marketing:indicators` e o canal que da sentido a tela: sem ele a lista de campanhas nao
// revela a agendada cujo inicio ja passou sem ninguem notar.

import type {
  CampaignStatus,
  EditorialPost,
  PostStatus
} from './marketing-store'
import { ctr, costPerLead, MarketingStore, overBudget, type Campaign } from './marketing-store'
import type { IpcRegistrar } from './ipc-types'

export interface MarketingDeps {
  marketing: MarketingStore
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
  ipcMain.handle('hermes:marketing:campaigns', async (): Promise<{ campaigns: CampaignView[] }> => {
    const lista = await deps.marketing.listCampaigns()

    return { campaigns: lista.map(toView) }
  })

  ipcMain.handle('hermes:marketing:posts', async (): Promise<{ posts: EditorialPost[] }> => {
    return { posts: await deps.marketing.listPosts() }
  })

  ipcMain.handle('hermes:marketing:indicators', async () => {
    return { indicators: await deps.marketing.indicators(Date.now()) }
  })

  ipcMain.handle('hermes:marketing:createCampaign', async (_event, payload: unknown) => {
    return deps.marketing.createCampaign(payload)
  })

  ipcMain.handle('hermes:marketing:setCampaignStatus', async (_event, payload: unknown) => {
    const raw = (payload ?? {}) as Record<string, unknown>
    const id = typeof raw['id'] === 'string' ? raw['id'] : ''

    if (!id || typeof raw['status'] !== 'string') {
      return { error: 'status_invalido' }
    }

    return deps.marketing.setCampaignStatus(id, raw['status'] as CampaignStatus)
  })

  ipcMain.handle('hermes:marketing:createPost', async (_event, payload: unknown) => {
    return deps.marketing.createPost(payload)
  })

  ipcMain.handle('hermes:marketing:setPostStatus', async (_event, payload: unknown) => {
    const raw = (payload ?? {}) as Record<string, unknown>
    const id = typeof raw['id'] === 'string' ? raw['id'] : ''

    if (!id || typeof raw['status'] !== 'string') {
      return { error: 'status_invalido' }
    }

    return deps.marketing.setPostStatus(id, raw['status'] as PostStatus)
  })
}

// Guarda de permissão nos canais de marketing (r6 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// `setPostStatus` com status de publicação é o ato de PUBLICAR FORA da empresa, na conta social que
// carrega o nome dela. Não dá para recolher. `setCampaignStatus` põe verba em circulação.
//
// O inventário da r2 mediu sete canais abertos aqui — o maior arquivo de domínio em exposição.
//
// A DISTINÇÃO
//
//   campaigns / posts / indicators            → `read`
//   createCampaign / setCampaignStatus         → `execute`
//   createPost / setPostStatus                 → `execute`
//
// Sete canais, dois níveis. O que a tela mostra é leitura; tudo que muda o que sai ou o que se gasta
// é execução.

import { describe, expect, it } from 'vitest'

import { registerMarketingIpc, type MarketingDeps } from './marketing-ipc'
import type { Actor } from './rbac'

type Handler = (event: unknown, arg: unknown) => Promise<unknown>

const DONO: Actor = { id: 'ator-dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }

function negado(resposta: unknown): boolean {
  return typeof resposta === 'object' && resposta !== null && (resposta as { error?: string }).error === 'sem_permissao'
}

/** Store espião: conta criação de campanha/post e mudanças de status. */
function montar(actor: Actor | null): {
  handlers: Map<string, Handler>
  campanhasCriadas: () => number
  postsCriados: () => number
  statusPublicados: () => number
} {
  const handlers = new Map<string, Handler>()
  let campanhasCriadas = 0
  let postsCriados = 0
  let statusPublicados = 0

  const marketing = {
    listCampaigns: async () => [],
    listPosts: async () => [],
    indicators: async () => ({ agendadasAtrasadas: 0 }),
    createCampaign: async (raw: unknown) => {
      campanhasCriadas++
      return { campaign: { id: 'c1', raw } }
    },
    setCampaignStatus: async (id: string, status: string) => ({ campaign: { id, status } }),
    createPost: async (raw: unknown) => {
      postsCriados++
      return { post: { id: 'p1', raw } }
    },
    setPostStatus: async (id: string, status: string) => {
      statusPublicados++
      return { post: { id, status } }
    }
  } as unknown as MarketingDeps['marketing']

  registerMarketingIpc(
    { handle: (canal: string, handler: Handler) => void handlers.set(canal, handler) } as never,
    { actorOf: async () => actor, marketing }
  )

  return {
    campanhasCriadas: () => campanhasCriadas,
    handlers,
    postsCriados: () => postsCriados,
    statusPublicados: () => statusPublicados
  }
}

describe('canais de marketing exigem ator', () => {
  it('os sete canais são registrados', () => {
    const { handlers } = montar(DONO)

    expect([...handlers.keys()].sort()).toEqual([
      'hermes:marketing:campaigns',
      'hermes:marketing:createCampaign',
      'hermes:marketing:createPost',
      'hermes:marketing:indicators',
      'hermes:marketing:posts',
      'hermes:marketing:setCampaignStatus',
      'hermes:marketing:setPostStatus'
    ])
  })

  it('sem ator, os sete recusam com sem_permissao', async () => {
    const { handlers } = montar(null)

    for (const canal of [
      'hermes:marketing:campaigns',
      'hermes:marketing:posts',
      'hermes:marketing:indicators',
      'hermes:marketing:createCampaign',
      'hermes:marketing:setCampaignStatus',
      'hermes:marketing:createPost',
      'hermes:marketing:setPostStatus'
    ]) {
      const resposta = await handlers.get(canal)!(null, { id: 'p1', status: 'publicado' })

      expect(negado(resposta), `${canal} deveria recusar sem ator`).toBe(true)
    }
  })

  it('sem ator, NAO publica — o store nem e chamado', async () => {
    const { handlers, statusPublicados } = montar(null)

    await handlers.get('hermes:marketing:setPostStatus')!(null, { id: 'p1', status: 'publicado' })

    expect(statusPublicados()).toBe(0)
  })

  it('sem ator, NAO cria campanha nem post', async () => {
    const { campanhasCriadas, handlers, postsCriados } = montar(null)

    await handlers.get('hermes:marketing:createCampaign')!(null, { nome: 'x' })
    await handlers.get('hermes:marketing:createPost')!(null, { texto: 'y' })

    expect(campanhasCriadas()).toBe(0)
    expect(postsCriados()).toBe(0)
  })

  it('sem ator, a recusa acontece ANTES de validar o payload', async () => {
    const { handlers } = montar(null)

    const resposta = await handlers.get('hermes:marketing:setPostStatus')!(null, null)

    expect(negado(resposta)).toBe(true)
  })

  it('com ator, a validacao do status volta a valer', async () => {
    const { handlers } = montar(DONO)

    expect(await handlers.get('hermes:marketing:setPostStatus')!(null, {})).toEqual({ error: 'status_invalido' })
    expect(await handlers.get('hermes:marketing:setCampaignStatus')!(null, { id: 'c1' })).toEqual({
      error: 'status_invalido'
    })
  })

  it('com ator, publicar chega ao store', async () => {
    const { handlers, statusPublicados } = montar(DONO)

    await handlers.get('hermes:marketing:setPostStatus')!(null, { id: 'p1', status: 'publicado' })

    expect(statusPublicados()).toBe(1)
  })
})

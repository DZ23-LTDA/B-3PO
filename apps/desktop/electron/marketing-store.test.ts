import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  costPerLead,
  ctr,
  indicators,
  marketingStorePath,
  MarketingStore,
  normalizeCampaign,
  normalizePost,
  overBudget,
  parseMarketing
} from './marketing-store'

const T0 = 1_700_000_000_000

async function withStore<T>(run: (store: MarketingStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-mkt-'))

  try {
    return await run(new MarketingStore(marketingStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const CAMPANHA = { channel: 'instagram', name: 'Verão', starts_at: T0 }

describe('métricas derivadas', () => {
  it('CTR e null sem impressao — 0/0 nao e 0%', () => {
    expect(ctr({ clicks: 0, impressions: 0 })).toBeNull()
    expect(ctr({ clicks: 10, impressions: 100 })).toBeCloseTo(0.1)
  })

  it('custo por lead e null sem lead', () => {
    expect(costPerLead({ leads: 0, spend_cents: 10_000 })).toBeNull()
    expect(costPerLead({ leads: 4, spend_cents: 10_000 })).toBe(2500)
  })

  it('estouro de orcamento vem do gasto, nao do previsto', () => {
    expect(overBudget({ budget_cents: 10_000, spend_cents: 9_000 })).toBe(false)
    expect(overBudget({ budget_cents: 10_000, spend_cents: 10_001 })).toBe(true)
    // Orcamento zero = sem limite definido; nao pode acusar estouro por qualquer gasto.
    expect(overBudget({ budget_cents: 0, spend_cents: 50_000 })).toBe(false)
  })
})

describe('normalizacao de campanha', () => {
  it('exige nome, inicio e canal', () => {
    expect(normalizeCampaign({}, 1)).toEqual({ error: 'nome_obrigatorio' })
    expect(normalizeCampaign({ name: 'X' }, 1)).toEqual({ error: 'inicio_obrigatorio' })
    expect(normalizeCampaign({ channel: 'orkut', name: 'X', starts_at: T0 }, 1)).toEqual({ error: 'canal_invalido' })
  })

  it('recusa fim antes do inicio', () => {
    const r = normalizeCampaign({ ...CAMPANHA, ends_at: T0 - 1 }, 1)

    expect(r).toEqual({ error: 'fim_antes_do_inicio' })
  })

  it('duracao zero tambem e recusada', () => {
    expect(normalizeCampaign({ ...CAMPANHA, ends_at: T0 }, 1)).toEqual({ error: 'fim_antes_do_inicio' })
  })

  it('comeca como rascunho', () => {
    const r = normalizeCampaign(CAMPANHA, 1)

    expect('campaign' in r && r.campaign.status).toBe('rascunho')
  })
})

describe('conteudo editorial', () => {
  it('exige conteudo', () => {
    expect(normalizePost({}, 1)).toEqual({ error: 'conteudo_obrigatorio' })
  })

  it('nasce como rascunho, nunca aprovado', () => {
    const r = normalizePost({ content: 'post', status: 'aprovado' }, 1)

    expect('post' in r && r.post.status).toBe('rascunho')
  })
})

describe('store', () => {
  it('cria campanha e lista', async () => {
    await withStore(async store => {
      const r = await store.createCampaign(CAMPANHA)

      expect('campaign' in r && r.campaign.name).toBe('Verão')
      expect(await store.listCampaigns()).toHaveLength(1)
    })
  })

  it('recusa post sem campanha existente', async () => {
    await withStore(async store => {
      expect(await store.createPost({ campaign_id: 'nao-existe', content: 'x' })).toEqual({ error: 'campanha_inexistente' })
    })
  })

  it('aceita post sem campanha (conteudo organico)', async () => {
    await withStore(async store => {
      const r = await store.createPost({ content: 'organico' })

      expect('post' in r).toBe(true)
    })
  })

  it('NAO aprova conteudo sem data: aprovado-e-sem-data e conteudo fantasma', async () => {
    await withStore(async store => {
      const criado = await store.createPost({ content: 'sem data' })
      if (!('post' in criado)) return

      expect(await store.setPostStatus(criado.post.id, 'aprovado')).toEqual({ error: 'data_obrigatoria_para_aprovar' })
    })
  })

  it('aprova conteudo com data', async () => {
    await withStore(async store => {
      const criado = await store.createPost({ content: 'com data', scheduled_for: T0 })
      if (!('post' in criado)) return

      const r = await store.setPostStatus(criado.post.id, 'aprovado')

      expect('posts' in r && r.posts[0]!.status).toBe('aprovado')
    })
  })

  it('lista posts em ordem de calendario', async () => {
    await withStore(async store => {
      await store.createPost({ content: 'depois', scheduled_for: T0 + 5000 })
      await store.createPost({ content: 'antes', scheduled_for: T0 })
      await store.createPost({ content: 'sem data' })

      expect((await store.listPosts()).map(p => p.content)).toEqual(['antes', 'depois', 'sem data'])
    })
  })

  it('status de campanha invalido e recusado', async () => {
    await withStore(async store => {
      const criado = await store.createCampaign(CAMPANHA)
      if (!('campaign' in criado)) return

      expect(await store.setCampaignStatus(criado.campaign.id, 'voando' as never)).toEqual({ error: 'status_invalido' })
    })
  })
})

describe('indicadores', () => {
  it('conta agendada vencida: agendamento cujo inicio ja passou sem virar ativa', async () => {
    await withStore(async store => {
      const c = await store.createCampaign({ ...CAMPANHA, starts_at: T0 - 10_000 })
      if (!('campaign' in c)) return

      await store.setCampaignStatus(c.campaign.id, 'agendada')

      expect((await store.indicators(T0)).agendadasVencidas).toBe(1)
    })
  })

  it('soma gasto e leads de todas as campanhas', () => {
    const arquivo = {
      campaigns: [
        { budget_cents: 100, leads: 2, spend_cents: 50, status: 'ativa', tenant_id: 'local' },
        { budget_cents: 100, leads: 3, spend_cents: 200, status: 'encerrada', tenant_id: 'local' }
      ],
      posts: [],
      schema_version: 1 as const
    }

    const r = indicators(arquivo as never, T0)

    expect(r.leads).toBe(5)
    expect(r.spendTotalCents).toBe(250)
    expect(r.estouradas).toBe(1)
    expect(r.ativas).toBe(1)
  })

  it('arquivo corrompido vira vazio', () => {
    expect(parseMarketing('nao e json')).toEqual({ campaigns: [], posts: [], schema_version: 1 })
  })
})

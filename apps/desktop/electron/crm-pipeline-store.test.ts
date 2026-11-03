import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  CrmPipelineStore,
  isStage,
  normalizeOpportunity,
  parsePipeline,
  pipelineStorePath,
  pipelineTotals,
  type CrmOpportunity
} from './crm-pipeline-store'

async function withStore<T>(run: (store: CrmPipelineStore, file: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-pipeline-'))

  try {
    const file = pipelineStorePath(dir)

    return await run(new CrmPipelineStore(file), file)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const opportunity = (over: Record<string, unknown> = {}) => ({
  contact_phone: '+5511999991111',
  stage: 'novo',
  title: 'Consultoria',
  value_cents: 150000,
  ...over
})

describe('funil do CRM no disco', () => {
  it('exige título, contato e estágio válido', () => {
    expect(normalizeOpportunity(opportunity({ title: ' ' }), 1)).toEqual({ error: 'title_required' })
    expect(normalizeOpportunity(opportunity({ contact_phone: '' }), 1)).toEqual({ error: 'contact_required' })
    expect(normalizeOpportunity(opportunity({ stage: 'inventado' }), 1)).toEqual({ error: 'stage_invalid' })
    expect(normalizeOpportunity(opportunity(), 1)).toHaveProperty('opportunity')
  })

  it('normaliza valor com vírgula e ponto sem perder centavos', () => {
    const brl = normalizeOpportunity(opportunity({ value_cents: '1.234,56' }), 1)
    const usd = normalizeOpportunity(opportunity({ value_cents: '1234.56' }), 1)

    expect('opportunity' in brl && brl.opportunity.value_cents).toBe(123456)
    expect('opportunity' in usd && usd.opportunity.value_cents).toBe(123456)
  })

  it('grava, persiste e ordena pelo funil (e depois pela atualização)', async () => {
    await withStore(async (store, file) => {
      await store.upsert(opportunity({ stage: 'proposta', title: 'B' }))
      await store.upsert(opportunity({ stage: 'novo', title: 'A' }))

      const lista = await new CrmPipelineStore(file).list()

      expect(lista.map(entry => entry.title)).toEqual(['A', 'B'])
    })
  })

  it('mesma id atualiza e preserva created_at', async () => {
    await withStore(async store => {
      const first = await store.upsert(opportunity({ id: 'opp-1' }))
      const original = 'opportunities' in first ? first.opportunities[0]! : null

      const second = await store.upsert(opportunity({ id: 'opp-1', stage: 'ganho', title: 'Consultoria fechada' }))

      expect('opportunities' in second && second.opportunities).toHaveLength(1)
      expect(second.opportunities[0]!.stage).toBe('ganho')
      expect(second.opportunities[0]!.created_at).toBe(original?.created_at)
    })
  })

  it('totais separam aberto de ganho e ignoram perdido', () => {
    const rows: CrmOpportunity[] = [
      { contact_phone: '1', created_at: 0, currency: 'BRL', id: 'a', stage: 'novo', title: 'a', updated_at: 0, value_cents: 1000 },
      { contact_phone: '2', created_at: 0, currency: 'BRL', id: 'b', stage: 'ganho', title: 'b', updated_at: 0, value_cents: 500 },
      { contact_phone: '3', created_at: 0, currency: 'BRL', id: 'c', stage: 'perdido', title: 'c', updated_at: 0, value_cents: 999 }
    ]

    expect(pipelineTotals(rows)).toEqual({ openCents: 1000, wonCents: 500 })
  })

  it('remove por id e descarta arquivo corrompido sem derrubar nada', async () => {
    await withStore(async (store, file) => {
      const saved = await store.upsert(opportunity({ id: 'opp-9' }))
      const id = 'opportunities' in saved ? saved.opportunities[0]!.id : ''

      expect((await store.remove(id)).opportunities).toHaveLength(0)

      await writeFile(file, 'não é json', 'utf8')
      expect(await store.list()).toEqual([])
      expect(parsePipeline('{"opportunities": [{"id": "x", "stage": "errado"}]}')).toEqual({
        opportunities: [],
        schema_version: 1
      })
    })
  })

  it('estágios conhecidos são os do funil do GOAL', () => {
    expect(isStage('qualificacao')).toBe(true)
    expect(isStage('ganho')).toBe(true)
    expect(isStage('Ganho')).toBe(false)
  })
  it('exige motivo quando a oportunidade vai para perdido', () => {
    const result = normalizeOpportunity(opportunity({ stage: 'perdido' }), 1)

    expect(result.error).toBe('lost_reason_required')
  })

  it('guarda o motivo de perda e o mostra na oportunidade', () => {
    const result = normalizeOpportunity(opportunity({ lost_reason: '  preço  ', stage: 'perdido' }), 1)

    expect(result.opportunity?.lost_reason).toBe('preço')
  })

  it('limpa o motivo quando a oportunidade volta para o funil', () => {
    const result = normalizeOpportunity(opportunity({ lost_reason: 'preço', stage: 'negociacao' }), 1)

    expect(result.opportunity?.lost_reason).toBe('')
  })
})

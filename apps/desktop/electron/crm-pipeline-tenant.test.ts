// Pipeline com tenant (rodada 82). Terceiro dos quatro stores do CRM.

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CrmPipelineStore, pipelineStorePath } from './crm-pipeline-store'

const A = 'empresa_a'
const B = 'empresa_b'

let dir = ''
let file = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-pipe-tenant-'))
  file = pipelineStorePath(dir)
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

describe('isolamento do funil', () => {
  it('oportunidade de A nao aparece no funil de B', async () => {
    const store = new CrmPipelineStore(file)

    await store.upsert({ contact_phone: '5511999998888', stage: 'novo', title: 'Venda A', value_cents: 10_000 }, A)

    expect((await store.list(A)).map(o => o.title)).toEqual(['Venda A'])
    expect(await store.list(B)).toEqual([])
  })

  it('remover de A nao apaga a de B', async () => {
    const store = new CrmPipelineStore(file)

    const a = await store.upsert({ contact_phone: '5511911112222', stage: 'novo', title: 'A', value_cents: 100 }, A)
    const b = await store.upsert({ contact_phone: '5511933334444', stage: 'novo', title: 'B', value_cents: 200 }, B)

    if ('error' in a || 'error' in b) throw new Error('nao criou')

    await store.remove(a.opportunities[0]!.id, A)

    expect(await store.list(A)).toEqual([])
    expect((await store.list(B)).map(o => o.title)).toEqual(['B'])
  })

  it('id de outra empresa nao serve para sobrescrever', async () => {
    const store = new CrmPipelineStore(file)

    const a = await store.upsert({ contact_phone: '5511955556666', stage: 'novo', title: 'Da A', value_cents: 100 }, A)

    if ('error' in a) throw new Error(a.error)

    await store.upsert({ contact_phone: '5511955556666', id: a.opportunities[0]!.id, stage: 'ganho', title: 'sequestrada', value_cents: 999 }, B)

    expect((await store.list(A))[0]!.title).toBe('Da A')
  })

  it('oportunidade sem tenant no arquivo e lida como local', async () => {
    await writeFile(
      file,
      JSON.stringify({
        opportunities: [{ contact_phone: '', created_at: 1, currency: 'BRL', id: 'o1', lost_reason: '', stage: 'novo', title: 'Antiga', updated_at: 1, value_cents: 500 }],
        schema_version: 1
      }),
      'utf8'
    )

    const store = new CrmPipelineStore(file)

    expect((await store.list('local')).map(o => o.title)).toEqual(['Antiga'])
  })
})

// O pedido de anonimização executado de ponta a ponta (rodada 94).
//
// Usa stores REAIS e deixa que ELES gerem os ids. O teste da rodada 93 falhou em produção porque o
// fixture inventava id `o_<telefone>` - formato que o store nunca produz. O id real é opaco, e é isso
// que muda a lógica: com id opaco, o upsert substitui no lugar e nenhum remove é necessário.

import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CrmContactStore, crmStorePath } from './crm-contacts-store'
import { CrmConversationStore, conversationsStorePath } from './crm-conversations-store'
import { CrmPipelineStore, pipelineStorePath } from './crm-pipeline-store'
import { CrmTaskStore, tasksStorePath } from './crm-tasks-store'
import { aplicarAnonimizacao, exportarTitular } from './privacy'

const TELEFONE = '5511999998888'
const OUTRO = '5511888887777'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-anon-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

function stores() {
  return {
    contacts: new CrmContactStore(crmStorePath(dir)),
    conversations: new CrmConversationStore(conversationsStorePath(dir)),
    opportunities: new CrmPipelineStore(pipelineStorePath(dir)),
    tasks: new CrmTaskStore(tasksStorePath(dir))
  }
}

async function popular() {
  const s = stores()

  await s.contacts.upsert({ email: 'ana@ex.com', name: 'Ana Silva', phone: TELEFONE })
  await s.contacts.upsert({ email: 'bruno@ex.com', name: 'Bruno', phone: OUTRO })
  await s.conversations.upsert({ contact_phone: TELEFONE, messages: [{ body: 'meu pedido', direction: 'entrada', external_id: 'e1', sent_at: 1 }], notes: 'nota interna', title: 'Ana' })
  await s.opportunities.upsert({ contact_phone: TELEFONE, stage: 'novo', title: 'Venda da Ana', value_cents: 50_000 })
  await s.tasks.upsert({ contact_phone: TELEFONE, notes: 'ligar', title: 'Ligar para Ana' })

  return s
}

describe('anonimizar de ponta a ponta', () => {
  it('o que identifica some do disco e o fato fiscal fica', async () => {
    const s = await popular()
    const r = await aplicarAnonimizacao(TELEFONE, s)

    if ('error' in r) throw new Error(r.error)

    const tudo =
      (await readFile(crmStorePath(dir), 'utf8')) +
      (await readFile(conversationsStorePath(dir), 'utf8')) +
      (await readFile(pipelineStorePath(dir), 'utf8')) +
      (await readFile(tasksStorePath(dir), 'utf8'))

    expect(tudo).not.toContain(TELEFONE)
    expect(tudo).not.toContain('Ana Silva')
    expect(tudo).not.toContain('ana@ex.com')
    expect(tudo).not.toContain('meu pedido')

    // O fato sobrevive, verificado pelo store.
    const oportunidades = await s.opportunities.list()

    expect(oportunidades).toHaveLength(1)
    expect(oportunidades[0]!.value_cents).toBe(50_000)
    expect(oportunidades[0]!.contact_phone).toBe(r.marcador)
  })

  it('o outro titular NAO e tocado', async () => {
    const s = await popular()

    await aplicarAnonimizacao(TELEFONE, s)

    expect((await s.contacts.list()).map(c => c.name)).toContain('Bruno')
  })

  it('depois de anonimizar, exportar o telefone antigo devolve vazio', async () => {
    const s = await popular()

    await aplicarAnonimizacao(TELEFONE, s)

    const r = await exportarTitular(TELEFONE, s)

    if ('error' in r) throw new Error(r.error)

    expect(r.export.totais).toEqual({ contatos: 0, conversas: 0, mensagens: 0, oportunidades: 0, tarefas: 0 })
  })

  it('rodar duas vezes nao duplica nem apaga: a segunda nao acha o telefone', async () => {
    const s = await popular()

    await aplicarAnonimizacao(TELEFONE, s)

    expect(await aplicarAnonimizacao(TELEFONE, s)).toEqual({ error: 'titular_sem_dados' })
    expect(await s.contacts.list()).toHaveLength(2)
    expect(await s.opportunities.list()).toHaveLength(1)
  })

  it('titular sem dados devolve erro, nao sucesso vazio', async () => {
    expect(await aplicarAnonimizacao(TELEFONE, stores())).toEqual({ error: 'titular_sem_dados' })
  })
})

// Tools de fiscal para o agente (rodada 107).
//
// O pedido do proprietário foi "para os agentes conseguirem completar o processo todo". Sem a tool, o agente
// não alcança o fiscal — o domínio existe e ele não sabe.
//
// O que estes testes travam: as tools existem com a ação certa, e a de emitir marca homologação em vez de
// deixar o agente prometer nota ao cliente.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildDomainTools } from './agent-tools-catalog'
import { sandboxProvider } from './fiscal-provider'
import { FiscalStore, fiscalStorePath } from './fiscal-store'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-fiscal-tools-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

function ferramentas() {
  return buildDomainTools({ fiscal: { provider: sandboxProvider(), store: new FiscalStore(fiscalStorePath(dir)) } })
}

const porNome = (nome: string) => ferramentas().find(t => t.name === nome)

describe('catalogo de tools fiscais', () => {
  it('sem o dominio fiscal, nenhuma tool fiscal aparece', () => {
    expect(buildDomainTools({}).filter(t => t.domain === 'fiscal')).toEqual([])
  })

  it('expoe documents, status e emitir', () => {
    const nomes = ferramentas().filter(t => t.domain === 'fiscal').map(t => t.name)

    expect(nomes.sort()).toEqual(['fiscal.documents', 'fiscal.emitir', 'fiscal.status'])
  })

  it('emitir exige execute: nao e leitura nem recomendacao', () => {
    // Efeito legal: emitir nota nao pode estar disponivel a quem so consulta.
    expect(porNome('fiscal.emitir')?.action).toBe('execute')
    expect(porNome('fiscal.documents')?.action).toBe('read')
    expect(porNome('fiscal.status')?.action).toBe('read')
  })

  it('a descricao de emitir avisa que homologacao nao tem validade fiscal', () => {
    // O modelo le a descricao para decidir o que dizer ao cliente. Se ela nao avisa, o agente promete nota.
    expect(porNome('fiscal.emitir')?.description).toMatch(/homologa/i)
    expect(porNome('fiscal.emitir')?.description).toMatch(/validade fiscal/i)
  })

  it('status informa que o emissor e de homologacao', async () => {
    const r = (await porNome('fiscal.status')!.run({})) as { homologado: boolean; id: string }

    expect(r.id).toBe('sandbox')
    expect(r.homologado).toBe(false)
  })

  it('emitir grava o documento e devolve o registro', async () => {
    const r = (await porNome('fiscal.emitir')!.run({ sale_id: 'sale_1' })) as {
      record?: { chave: string; homologacao: boolean; ref: string }
    }

    expect(r.record?.ref).toBe('venda:sale_1')
    expect(r.record?.homologacao).toBe(true)
    expect(r.record?.chave.startsWith('SANDBOX-')).toBe(true)

    // E o documento aparece na consulta.
    const docs = (await porNome('fiscal.documents')!.run({})) as { ref: string }[]

    expect(docs.map(d => d.ref)).toEqual(['venda:sale_1'])
  })

  it('emitir sem sale_id e recusado', async () => {
    expect(await porNome('fiscal.emitir')!.run({})).toEqual({ error: 'venda_obrigatoria' })
  })

  it('emitir duas vezes nao cria segundo documento', async () => {
    const t = porNome('fiscal.emitir')!

    await t.run({ sale_id: 'sale_1' })
    await t.run({ sale_id: 'sale_1' })

    expect(((await porNome('fiscal.documents')!.run({})) as unknown[]).length).toBe(1)
  })

  it('o kind default e nfe, e nfce/nfse sao aceitos', async () => {
    await porNome('fiscal.emitir')!.run({ kind: 'nfce', sale_id: 's2' })

    const docs = (await porNome('fiscal.documents')!.run({})) as { kind: string }[]

    expect(docs[0]!.kind).toBe('nfce')
  })
})

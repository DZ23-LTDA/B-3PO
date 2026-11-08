// A trilha de auditoria em disco (r35 do GOAL V2).
//
// O QUE ESTES TESTES PROVAM
//
//   1. uma decisão do `permission-guard` **chega ao disco** sem ninguém passar `onAudit`
//   2. **negar** também é auditado — auditoria que só guarda o permitido esconde a tentativa
//   3. o ledger é **append-only**: nada é apagado, só truncado pelo início, e a perda é **contada**
//   4. o tenant acompanha a entrada

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  AuditStore,
  AUDIT_MAX_ENTRIES,
  auditStorePath,
  configurarColetorDeAuditoria,
  parseAudit,
  registrarNaTrilha
} from './audit-store'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'

const DONO: Actor = { id: 'ator-dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }
const VISITANTE: Actor = { id: 'ator-vis', kind: 'human', level: 'READ', role: 'viewer' }

let dir = ''
let store: AuditStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-audit-'))
  store = new AuditStore(auditStorePath(dir))
  configurarColetorDeAuditoria(store)
})

afterEach(async () => {
  configurarColetorDeAuditoria(null)
  await rm(dir, { force: true, recursive: true })
})

/** Dá tempo de a fila de escrita drenar. A escrita é assíncrona por desenho. */
async function drenar(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50))
}

describe('o caminho', () => {
  it('grava dentro de b3po/, como os outros stores', () => {
    expect(auditStorePath('/x')).toBe(join('/x', 'b3po', 'auditoria.json'))
  })

  it('arquivo corrompido vira ledger vazio, não exceção', () => {
    expect(parseAudit('{nao e json')).toEqual({ descartadas: 0, entries: [], schema_version: 1 })
    expect(parseAudit('{"entries":"x"}')).toEqual({ descartadas: 0, entries: [], schema_version: 1 })
  })
})

describe('a decisão chega ao disco sem ninguém passar onAudit', () => {
  it('uma chamada permitida é registrada', async () => {
    await exigirAtor(async () => DONO, 'read', 'finance', async () => ({ ok: true }))
    await drenar()

    const { entries } = await store.listar()

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ action: 'read', actorId: 'ator-dono', allowed: true, resource: 'finance' })
  })

  it('uma chamada NEGADA também é registrada', async () => {
    // Auditoria que só guarda o permitido esconde a tentativa — que é o que se investiga.
    const r = await exigirAtor(async () => VISITANTE, 'execute', 'finance', async () => ({ ok: true }))

    await drenar()

    expect(r).toMatchObject({ error: 'sem_permissao' })

    const { entries } = await store.listar()

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ action: 'execute', actorId: 'ator-vis', allowed: false })
  })

  it('sem ator, a recusa também é auditada', async () => {
    await exigirAtor(async () => null, 'read', 'stock', async () => ({ ok: true }))
    await drenar()

    const { entries } = await store.listar()

    expect(entries).toHaveLength(1)
    expect(entries[0]?.allowed).toBe(false)
  })

  it('`onAudit` próprio tem precedência sobre o coletor global', async () => {
    // Quem instrumenta o domínio não deve receber a entrada duas vezes.
    const recebidas: unknown[] = []

    await exigirAtor(async () => DONO, 'read', 'crm', async () => ({}), {
      onAudit: e => recebidas.push(e)
    })
    await drenar()

    expect(recebidas).toHaveLength(1)
    expect((await store.listar()).entries).toHaveLength(0)
  })
})

describe('append-only', () => {
  it('duas decisões geram duas entradas, na ordem em que aconteceram', async () => {
    await exigirAtor(async () => DONO, 'read', 'a', async () => ({}))
    await exigirAtor(async () => DONO, 'read', 'b', async () => ({}))
    await drenar()

    // `listar` devolve mais recente primeiro.
    const { entries } = await store.listar()

    expect(entries.map(e => e.resource)).toEqual(['b', 'a'])
  })

  it('trunca pelo INÍCIO e conta o que saiu', async () => {
    // Escreve direto no arquivo para não gerar 5.001 decisões.
    const cheio = {
      descartadas: 0,
      entries: Array.from({ length: AUDIT_MAX_ENTRIES }, (_, i) => ({
        action: 'read' as const,
        actorId: `a${i}`,
        allowed: true,
        at: i,
        reason: '',
        resource: 'x',
        tenant_id: 'local'
      })),
      schema_version: 1 as const
    }

    await mkdir(join(dir, 'b3po'), { recursive: true })
    await writeFile(auditStorePath(dir), JSON.stringify(cheio), 'utf8')

    store.registrar({
      action: 'execute',
      actorId: 'novo',
      allowed: true,
      at: 9_999,
      reason: '',
      resource: 'y'
    })
    await drenar()

    const conteudo = await store.listar({ limite: 3 })

    // O recente está lá; o mais antigo saiu; a perda está CONTADA.
    expect(conteudo.entries[0]).toMatchObject({ actorId: 'novo' })
    expect(conteudo.descartadas).toBe(1)
  })
})

describe('tenant e leitura', () => {
  it('o tenant acompanha a entrada', async () => {
    registrarNaTrilha({ action: 'read', actorId: 'a', allowed: true, at: 0, reason: '', resource: 'r' })
    await drenar()

    expect((await store.listar()).entries[0]?.tenant_id).toBe('local')
  })

  it('filtra por tenant', async () => {
    store.registrar({ action: 'read', actorId: 'a', allowed: true, at: 0, reason: '', resource: 'r' }, 'empresa-a')
    store.registrar({ action: 'read', actorId: 'a', allowed: true, at: 0, reason: '', resource: 'r' }, 'empresa-b')
    await drenar()

    expect((await store.listar({ tenant_id: 'empresa-a' })).entries).toHaveLength(1)
  })

  it('limite corta a leitura sem alterar o arquivo', async () => {
    for (let i = 0; i < 10; i++) {
      store.registrar({ action: 'read', actorId: `a${i}`, allowed: true, at: i, reason: '', resource: 'r' })
    }
    await drenar()

    expect((await store.listar({ limite: 3 })).entries).toHaveLength(3)
    expect((await store.listar()).entries).toHaveLength(10)
  })

  it('o arquivo gravado tem schema_version e o formato esperado', async () => {
    registrarNaTrilha({ action: 'read', actorId: 'a', allowed: true, at: 0, reason: '', resource: 'r' })
    await drenar()

    const cru = JSON.parse(await readFile(auditStorePath(dir), 'utf8'))

    expect(cru.schema_version).toBe(1)
    expect(Array.isArray(cru.entries)).toBe(true)
    expect(cru.descartadas).toBe(0)
  })
})

describe('sem coletor configurado', () => {
  it('nada é registrado e nada lança', async () => {
    configurarColetorDeAuditoria(null)

    const r = await exigirAtor(async () => DONO, 'read', 'finance', async () => ({ ok: true }))

    // A ação segue normalmente: auditoria ausente não pode derrubar o canal.
    expect(r).toEqual({ ok: true })
  })
})

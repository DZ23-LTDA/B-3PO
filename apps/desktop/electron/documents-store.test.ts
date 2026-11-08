import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  documentTotals,
  documentsStorePath,
  DocumentsStore,
  normalizeDocument,
  parseDocuments,
  type DocumentRecord
} from './documents-store'

const T0 = 1_700_000_000_000

async function withStore<T>(run: (store: DocumentsStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-docs-'))

  try {
    return await run(new DocumentsStore(documentsStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const entrada = (over: Record<string, unknown> = {}) => ({
  kind: 'contrato',
  name: 'contrato-2024.pdf',
  ref: 'C:/empresa/contratos/contrato-2024.pdf',
  scope: 'empresa',
  scope_id: 'emp_1',
  size_bytes: 240_000,
  ...over
})

const documento = (over: Partial<DocumentRecord> = {}): DocumentRecord => ({
  created_at: T0,
  custodian: '',
  id: 'doc_1',
  kind: 'contrato',
  name: 'a.pdf',
  notes: '',
  ref: 'C:/a.pdf',
  scope: 'outro',
  scope_id: '',
  size_bytes: 100,
  tenant_id: 'local',
  updated_at: T0,
  ...over
})

describe('normalizacao', () => {
  it('aceita documento com nome e origem', () => {
    const r = normalizeDocument(entrada(), T0)

    expect('error' in r).toBe(false)
  })

  it('recusa sem nome: nao ha o que listar', () => {
    expect(normalizeDocument(entrada({ name: '' }), T0)).toEqual({ error: 'nome_obrigatorio' })
  })

  it('recusa sem origem: registro sem origem nao serve para nada', () => {
    expect(normalizeDocument(entrada({ ref: '  ' }), T0)).toEqual({ error: 'origem_obrigatoria' })
  })

  it('recusa entidade vazia quando o escopo exige uma', () => {
    expect(normalizeDocument(entrada({ scope: 'venda', scope_id: '' }), T0)).toEqual({
      error: 'entidade_obrigatoria'
    })
  })

  it('escopo outro dispensa entidade', () => {
    expect('error' in normalizeDocument(entrada({ scope: 'outro', scope_id: '' }), T0)).toBe(false)
  })

  it('kind desconhecido vira outro, sem inventar categoria', () => {
    const r = normalizeDocument(entrada({ kind: 'inventado' }), T0)

    expect('error' in r).toBe(false)
    expect('error' in r ? '' : r.kind).toBe('outro')
  })
})

describe('store', () => {
  it('grava e lista', async () => {
    await withStore(async store => {
      const r = await store.upsert(entrada(), T0)

      expect('error' in r).toBe(false)

      const lista = await store.list()

      expect(lista).toHaveLength(1)
      expect(lista[0]!.name).toBe('contrato-2024.pdf')
    })
  })

  it('atualizar mantem created_at e troca updated_at', async () => {
    await withStore(async store => {
      const criado = await store.upsert(entrada(), T0)

      if ('error' in criado) throw new Error('nao criou')

      const depois = await store.upsert({ id: criado.document.id, notes: 'renovado' }, T0 + 5000)

      if ('error' in depois) throw new Error(depois.error)

      expect(depois.document.created_at).toBe(T0)
      expect(depois.document.updated_at).toBe(T0 + 5000)
      expect(depois.document.notes).toBe('renovado')
      // O nome nao foi enviado; deve ser preservado, nao apagado.
      expect(depois.document.name).toBe('contrato-2024.pdf')
    })
  })

  it('id inexistente nao cria documento novo: recusa', async () => {
    await withStore(async store => {
      expect(await store.upsert({ id: 'fantasma', name: 'x.pdf', ref: 'C:/x.pdf' }, T0)).toEqual({
        error: 'documento_inexistente'
      })
      expect(await store.list()).toEqual([])
    })
  })

  it('isola por tenant', async () => {
    await withStore(async store => {
      await store.upsert(entrada({ tenant_id: 'outro' }), T0)

      expect(await store.list('local')).toEqual([])
      expect(await store.list('outro')).toHaveLength(1)
    })
  })

  it('remove devolve erro se nao existia', async () => {
    await withStore(async store => {
      expect(await store.remove('nao_existe')).toEqual({ error: 'documento_inexistente' })
    })
  })

  it('arquivo corrompido vira vazio em vez de derrubar a tela', () => {
    expect(parseDocuments('{{{')).toEqual({ documents: [], schema_version: 1 })
  })

  it('grava em disco de verdade', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'b3po-docs-disk-'))
    const store = new DocumentsStore(documentsStorePath(dir))

    try {
      await store.upsert(entrada(), T0)

      const bruto = await readFile(documentsStorePath(dir), 'utf8')

      expect(bruto).toContain('contrato-2024.pdf')
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })
})

describe('totais', () => {
  it('conta por tipo e soma bytes', () => {
    const t = documentTotals([
      documento({ kind: 'contrato', size_bytes: 1000 }),
      documento({ id: 'doc_2', kind: 'contrato', size_bytes: 500 }),
      documento({ id: 'doc_3', kind: 'nota_fiscal', size_bytes: 250 })
    ])

    expect(t.total).toBe(3)
    expect(t.bytes).toBe(1750)
    expect(t.por_kind.contrato).toBe(2)
    expect(t.por_kind.nota_fiscal).toBe(1)
    // Tipo sem documento aparece como 0 explicito, nunca ausente.
    expect(t.por_kind.proposta).toBe(0)
  })

  it('lista vazia devolve todos os tipos zerados, nao undefined', () => {
    const t = documentTotals([])

    expect(t.total).toBe(0)
    expect(t.bytes).toBe(0)
    expect(Object.keys(t.por_kind)).toHaveLength(6)
  })
})

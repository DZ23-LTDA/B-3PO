import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CrmContactStore, crmStorePath, normalizeContact, parseStore } from './crm-contacts-store'

/**
 * Cada teste ganha o proprio diretorio. Um `dir` mutavel no modulo vazou estado entre testes: o caso do
 * arquivo corrompido passava isolado e falhava na suite porque encontrava o store de outro teste no mesmo
 * caminho relativo.
 */
async function withStore<T>(run: (store: CrmContactStore, file: string, dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-crm-'))

  try {
    const file = crmStorePath(dir)

    return await run(new CrmContactStore(file), file, dir)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const contact = (over: Record<string, unknown> = {}) => ({
  company: 'DZ23',
  email: 'a@b.co',
  name: 'Maria',
  phone: '+55 (11) 99999-1111',
  ...over
})

describe('contatos do CRM no disco', () => {
  it('normaliza telefone e recusa contato sem nome ou telefone', () => {
    const ok = normalizeContact(contact(), 1_700_000_000_000)

    expect('contact' in ok && ok.contact.phone).toBe('+5511999991111')
    expect(normalizeContact(contact({ name: '  ' }), 1)).toEqual({ error: 'name_required' })
    expect(normalizeContact(contact({ phone: '' }), 1)).toEqual({ error: 'phone_required' })
    expect(normalizeContact(contact({ phone: '123' }), 1)).toEqual({ error: 'phone_too_short' })
  })

  it('grava, lista mais recente primeiro e sobrevive a nova instância (persistência real)', async () => {
    await withStore(async (store, file) => {
      await store.upsert(contact({ name: 'Maria' }))
      await store.upsert(contact({ name: 'João', phone: '+5511888882222' }))

      const lista = await new CrmContactStore(file).list()

      expect(lista.map(entry => entry.name)).toEqual(['João', 'Maria'])
      expect(JSON.parse(await readFile(file, 'utf8')).schema_version).toBe(1)
    })
  })

  it('mesmo telefone atualiza em vez de duplicar, preservando created_at', async () => {
    await withStore(async store => {
      const first = await store.upsert(contact({ name: 'Maria' }))
      const original = 'contacts' in first ? first.contacts[0]! : null

      const second = await store.upsert(contact({ name: 'Maria Silva', company: 'Nova' }))

      expect('contacts' in second && second.contacts).toHaveLength(1)
      expect(second.contacts[0]!.name).toBe('Maria Silva')
      expect(second.contacts[0]!.company).toBe('Nova')
      expect(second.contacts[0]!.created_at).toBe(original?.created_at)
    })
  })

  it('remove por telefone, aceitando o número com máscara', async () => {
    await withStore(async store => {
      await store.upsert(contact())

      const after = await store.remove('+55 11 99999-1111')

      expect(after.contacts).toHaveLength(0)
    })
  })

  it('arquivo corrompido não derruba nada: lê vazio e continua gravando', async () => {
    await withStore(async (store, file) => {
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, '{ isso não é json', 'utf8')

      expect(await store.list()).toEqual([])
      expect(parseStore('null')).toEqual({ contacts: [], schema_version: 1 })

      await store.upsert(contact())

      expect(await store.list()).toHaveLength(1)
    })
  })

  it('não deixa arquivo temporário para trás depois de gravar', async () => {
    await withStore(async (store, file) => {
      await store.upsert(contact())

      await expect(readFile(`${file}.tmp`, 'utf8')).rejects.toThrow()
    })
  })
})

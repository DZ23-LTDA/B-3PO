// Contatos do CRM no disco do usuário, dono do dado: o processo principal do Electron.
//
// O renderer pede e apresenta; quem valida, grava e devolve estado consistente é aqui. Sem banco externo:
// um JSON sob o `userData` do app, gravado com `write` + `rename` para uma queda no meio não deixar arquivo
// pela metade. A lógica de funil/automação continua em `@dz23/crm-core` — este arquivo só guarda contatos.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export interface CrmContact {
  created_at: number
  /** Só dígitos e `+`, como o telefone precisa chegar na API oficial. */
  phone: string
  name: string
  email: string
  company: string
  tags: string[]
  updated_at: number
}

export interface CrmStoreFile {
  schema_version: 1
  contacts: CrmContact[]
}

/**
 * Store vazio NOVO a cada uso. Uma constante compartilhada com spread raso reaproveita o mesmo array de
 * contatos: um `upsert` de qualquer instância passada contaminava toda leitura "vazia" depois. O teste de
 * arquivo corrompido pegou exatamente isso.
 */
function emptyStore(): CrmStoreFile {
  return { contacts: [], schema_version: 1 }
}

export function crmStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'crm-contacts.json')
}

function digitsOnly(value: unknown): string {
  const raw = typeof value === 'string' ? value : ''

  return raw.replace(/[^\d+]/g, '')
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '').map(tag => tag.trim())
}

/** Aceita o que veio do renderer e devolve um contato válido — ou o motivo da recusa. */
export function normalizeContact(input: unknown, now: number): { contact: CrmContact } | { error: string } {
  const raw = (input ?? {}) as Record<string, unknown>
  const name = text(raw['name'])
  const phone = digitsOnly(raw['phone'])

  if (!name) {
    return { error: 'name_required' }
  }

  if (!phone) {
    return { error: 'phone_required' }
  }

  if (phone.replace(/\D/g, '').length < 8) {
    return { error: 'phone_too_short' }
  }

  return {
    contact: {
      company: text(raw['company']),
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      email: text(raw['email']),
      name,
      phone,
      tags: tags(raw['tags']),
      updated_at: now
    }
  }
}

/** Ler tolera arquivo ausente ou corrompido: devolve vazio em vez de derrubar a janela. */
export function parseStore(raw: string): CrmStoreFile {
  try {
    const parsed = JSON.parse(raw) as Partial<CrmStoreFile>

    if (!parsed || !Array.isArray(parsed.contacts)) {
      return emptyStore()
    }

    return { contacts: parsed.contacts.filter(entry => !!entry && typeof entry.phone === 'string'), schema_version: 1 }
  } catch {
    return emptyStore()
  }
}

export class CrmContactStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<CrmContact[]> {
    const store = await this.read()

    return [...store.contacts].sort((a, b) => b.updated_at - a.updated_at)
  }

  async upsert(input: unknown): Promise<{ contacts: CrmContact[] } | { error: string }> {
    const normalized = normalizeContact(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const store = await this.read()
    const contact = normalized.contact
    const existing = store.contacts.findIndex(entry => entry.phone === contact.phone)

    if (existing >= 0) {
      // Mesmo telefone é o mesmo contato: atualiza em vez de duplicar (o índice do CRM é o telefone).
      store.contacts[existing] = { ...store.contacts[existing], ...contact, created_at: store.contacts[existing]!.created_at }
    } else {
      store.contacts.push(contact)
    }

    await this.write(store)

    return { contacts: await this.list() }
  }

  async remove(phone: string): Promise<{ contacts: CrmContact[] }> {
    const store = await this.read()
    const wanted = digitsOnly(phone)
    store.contacts = store.contacts.filter(entry => entry.phone !== wanted)
    await this.write(store)

    return { contacts: await this.list() }
  }

  private async read(): Promise<CrmStoreFile> {
    try {
      return parseStore(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptyStore()
    }
  }

  private async write(store: CrmStoreFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(store, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}

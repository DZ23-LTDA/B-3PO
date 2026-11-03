/**
 * Importação, exportação, duplicidade e segmentação de contatos (GOAL §14.2).
 *
 * Separado de `contacts.ts` de propósito: aquele módulo define o contato e o telefone; este cuida do
 * trabalho em lote — que é onde se perde dado silenciosamente.
 *
 * Regras que os testes provam:
 *
 * - **importação é idempotente**: o mesmo arquivo duas vezes não duplica contato (a chave é o telefone
 *   normalizado);
 * - **linha inválida não derruba o lote**: ela volta em `skipped` com o motivo, e o resto entra;
 * - **dado existente não é sobrescrito por vazio**: importar planilha sem e-mail não apaga o e-mail que
 *   já estava lá;
 * - **duplicidade é detectada, não apagada**: o relatório mostra os pares para decisão humana;
 * - **exportação escapa CSV** (vírgula, aspas, quebra de linha) e é determinística na ordem;
 * - **segmento é filtro declarado**, não "todos menos os que eu não gosto".
 */

import type { Contact } from './contacts'
import { createContact, normalizePhone, updateContact } from './contacts'
import type { ContactInput } from './contacts'

export interface ContactRow {
  name?: string
  phone: string
  email?: string
  company?: string
  source?: string
  tags?: string[]
  owner?: string
  notes?: string
  customFields?: Record<string, string>
}

export type ImportSkipReason = 'invalid_phone' | 'duplicate_in_file'

export interface ImportReport {
  created: Contact[]
  updated: Contact[]
  skipped: Array<{ row: ContactRow; index: number; reason: ImportSkipReason }>
}

export interface ImportOptions {
  now?: number
  /** `true` atualiza o contato existente quando o telefone já existe. */
  updateExisting?: boolean
  /** Id para contato novo; injetável para teste determinístico. */
  newId?: (index: number) => string
}

/** Campos que a planilha pode atualizar. Campo vazio NÃO sobrescreve o existente. */
function patchFromRow(current: Contact, row: ContactRow): Partial<Omit<Contact, "id" | "phone" | "consent">> {
  const patch: Partial<Omit<Contact, "id" | "phone" | "consent">> = {}

  if (row.name?.trim()) patch.name = row.name.trim()
  if (row.company?.trim()) patch.company = row.company.trim()
  if (row.source?.trim()) patch.source = row.source.trim()
  if (row.owner?.trim()) patch.owner = row.owner.trim()
  if (row.tags && row.tags.length > 0) patch.tags = mergeTags(current.tags, row.tags)

  const extraFields = {
    ...(row.customFields ?? {}),
    ...(row.email?.trim() ? { email: row.email.trim() } : {})
  }

  if (Object.keys(extraFields).length > 0) {
    patch.customFields = { ...(current.customFields ?? {}), ...extraFields }
  }

  return patch
}

/** Cria o contato pelo contrato real de `createContact` e compõe id/campos extras depois. */
function createFromRow(row: ContactRow, phone: string, id: string, now: number): Contact {
  const candidate = createContact(
    {
      phone,
      name: row.name?.trim() || undefined,
      company: row.company?.trim() || undefined,
      tags: row.tags && row.tags.length > 0 ? mergeTags([], row.tags) : undefined,
      source: row.source?.trim() || "import",
      owner: row.owner?.trim() || undefined
    },
    now
  )

  if (typeof candidate === "string") {
    throw new Error("telefone passou pela normalização mas createContact recusou")
  }

  return {
    ...candidate,
    id,
    customFields: {
      ...(row.customFields ?? {}),
      ...(row.email?.trim() ? { email: row.email.trim() } : {})
    }
  }
}

/**
 * Importa linhas sobre um conjunto existente. Devolve os contatos resultantes e o relatório do que foi
 * criado, atualizado e recusado — nada é descartado sem explicação.
 */
export function importContacts(
  rows: readonly ContactRow[],
  existing: readonly Contact[],
  options: ImportOptions = {}
): { contacts: Contact[]; report: ImportReport } {
  const now = options.now ?? Date.now()
  const newId = options.newId ?? ((index: number) => `c-${now}-${index}`)

  const contacts = [...existing]
  const created: Contact[] = []
  const updated: Contact[] = []
  const skipped: ImportReport['skipped'] = []
  const seenPhones = new Set<string>()
  void now

  rows.forEach((row, index) => {
    const phone = normalizePhone(row.phone ?? "")

    if (!phone) {
      skipped.push({ row, index, reason: "invalid_phone" })

      return
    }

    if (seenPhones.has(phone)) {
      skipped.push({ row, index, reason: "duplicate_in_file" })

      return
    }

    seenPhones.add(phone)

    const current = contacts.find(contact => contact.phone === phone)

    if (!current) {
      const createdContact = createFromRow(row, phone, newId(index), now)

      contacts.push(createdContact)
      created.push(createdContact)

      return
    }

    if (!options.updateExisting) {
      skipped.push({ row, index, reason: "duplicate_in_file" })

      return
    }

    const next = updateContact(current, patchFromRow(current, row), now)

    contacts[contacts.indexOf(current)] = next
    updated.push(next)
  })

  return { contacts, report: { created, updated, skipped } }
}

function mergeTags(existing: readonly string[], incoming: readonly string[]): string[] {
  const merged = new Set<string>()

  for (const tag of [...existing, ...incoming]) {
    const clean = tag.trim()

    if (clean) {
      merged.add(clean)
    }
  }

  return [...merged].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export interface DuplicatePair {
  keepId: string
  duplicateId: string
  reason: 'same_phone' | 'same_email' | 'same_name_and_company'
}

/**
 * Encontra pares suspeitos. Não apaga nada: mesclar cadastro é decisão humana, e apagar contato por
 * heurística é o tipo de automação que ninguém perdoa.
 */
export function findDuplicates(contacts: readonly Contact[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = []
  const byPhone = new Map<string, Contact>()
  const byEmail = new Map<string, Contact>()
  const byNameCompany = new Map<string, Contact>()

  for (const contact of contacts) {
    const phone = contact.phone
    const email = contact.customFields?.['email']?.trim().toLowerCase()
    const key = `${(contact.name ?? '').trim().toLowerCase()}|${(contact.company ?? '').trim().toLowerCase()}`

    const phoneHit = byPhone.get(phone)

    if (phoneHit) {
      pairs.push({ keepId: phoneHit.id, duplicateId: contact.id, reason: 'same_phone' })
      continue
    }

    byPhone.set(phone, contact)

    if (email) {
      const emailHit = byEmail.get(email)

      if (emailHit) {
        pairs.push({ keepId: emailHit.id, duplicateId: contact.id, reason: 'same_email' })
        continue
      }

      byEmail.set(email, contact)
    }

    if ((contact.name ?? '').trim() && (contact.company ?? '').trim()) {
      const nameHit = byNameCompany.get(key)

      if (nameHit) {
        pairs.push({ keepId: nameHit.id, duplicateId: contact.id, reason: 'same_name_and_company' })
        continue
      }

      byNameCompany.set(key, contact)
    }
  }

  return pairs
}

/** Escapa um campo para CSV (aspas duplicadas, campo entre aspas quando necessário). */
export function csvEscape(value: string | undefined | null): string {
  const text = value ?? ''

  if (/[",\n\r;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

export const CONTACT_CSV_HEADER = ['name', 'phone', 'email', 'company', 'source', 'tags', 'owner'] as const

/** Exporta em CSV determinístico (ordenado por nome, depois telefone). Concorda com o importador. */
export function exportContactsCsv(contacts: readonly Contact[]): string {
  const lines = [CONTACT_CSV_HEADER.join(',')]

  const ordered = [...contacts].sort((a, b) => {
    const nameA = (a.name ?? '').toLowerCase()
    const nameB = (b.name ?? '').toLowerCase()

    return nameA === nameB ? a.phone.localeCompare(b.phone) : nameA.localeCompare(nameB, 'pt-BR')
  })

  for (const contact of ordered) {
    lines.push(
      [
        csvEscape(contact.name),
        csvEscape(contact.phone),
        csvEscape(contact.customFields?.['email']),
        csvEscape(contact.company),
        csvEscape(contact.source),
        csvEscape(contact.tags.join('|')),
        csvEscape(contact.owner)
      ].join(',')
    )
  }

  return `${lines.join('\n')}\n`
}

export interface Segment {
  tags?: string[]
  company?: string
  source?: string
  owner?: string
  /** `true` só com opt-in; `false` só sem consentimento registrado. */
  optedIn?: boolean
  blocked?: boolean
  search?: string
}

/** Filtra contatos por critérios declarados. Todos os critérios precisam bater (E lógico). */

function matchesScalar(value: string | undefined, expected: string | undefined): boolean {
  if (!expected) {
    return true
  }

  return (value ?? "").trim().toLowerCase() === expected.trim().toLowerCase()
}

function matchesTags(tags: readonly string[], expected: readonly string[] | undefined): boolean {
  if (!expected || expected.length === 0) {
    return true
  }

  return expected.every(tag => tags.includes(tag))
}

function matchesConsent(contact: Contact, optedIn: boolean | undefined): boolean {
  if (optedIn === true) {
    return contact.consent.state === "opted_in"
  }

  if (optedIn === false) {
    return contact.consent.state !== "opted_in"
  }

  return true
}

function matchesSearch(contact: Contact, needle: string): boolean {
  if (!needle) {
    return true
  }

  const haystack = [contact.name, contact.phone, contact.company, contact.customFields?.["email"]]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return haystack.includes(needle)
}

/** Filtra contatos por critérios declarados. Todos os critérios precisam bater (E lógico). */
export function segmentContacts(contacts: readonly Contact[], segment: Segment): Contact[] {
  const needle = (segment.search ?? "").trim().toLowerCase()

  return contacts.filter(contact => {
    if (!matchesTags(contact.tags, segment.tags)) return false
    if (!matchesScalar(contact.company, segment.company)) return false
    if (!matchesScalar(contact.source, segment.source)) return false
    if (!matchesScalar(contact.owner, segment.owner)) return false
    if (!matchesConsent(contact, segment.optedIn)) return false
    if (segment.blocked !== undefined && contact.blocked !== segment.blocked) return false

    return matchesSearch(contact, needle)
  })
}

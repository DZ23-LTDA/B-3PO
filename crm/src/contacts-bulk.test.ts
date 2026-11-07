import { describe, expect, it } from 'vitest'

import { createContact } from './contacts'
import type { Contact } from './contacts'
import {
  CONTACT_CSV_HEADER,
  csvEscape,
  exportContactsCsv,
  findDuplicates,
  importContacts,
  segmentContacts
} from './contacts-bulk'

const T0 = 1_700_000_000_000

function contact(overrides: Partial<Parameters<typeof createContact>[0]> & { id?: string } = {}): Contact {
  const created = createContact(
    {
      phone: overrides.phone ?? '+5511999998888',
      name: overrides.name ?? 'Ana',
      company: overrides.company,
      tags: overrides.tags,
      source: overrides.source,
      owner: overrides.owner
    },
    T0
  )

  if (typeof created === 'string') {
    throw new Error('contato de teste inválido')
  }

  return { ...created, id: overrides.id ?? 'c1' }
}

describe('importação de contatos', () => {
  it('cria contatos novos e normaliza o telefone', () => {
    const { contacts, report } = importContacts(
      [{ name: 'Ana', phone: '(11) 99999-8888' }, { name: 'Bruno', phone: '11 98888-7777' }],
      [],
      { now: T0, newId: index => `n${index}` }
    )

    expect(report.created).toHaveLength(2)
    expect(contacts.map(item => item.phone)).toEqual(['+5511999998888', '+5511988887777'])
    expect(contacts[0]?.id).toBe('n0')
  })

  it('linha com telefone inválido é recusada com motivo, sem derrubar o lote', () => {
    const { contacts, report } = importContacts(
      [{ name: 'Ana', phone: '+5511999998888' }, { name: 'X', phone: '123' }],
      [],
      { now: T0 }
    )

    expect(contacts).toHaveLength(1)
    expect(report.skipped).toEqual([{ row: { name: 'X', phone: '123' }, index: 1, reason: 'invalid_phone' }])
  })

  it('telefone repetido dentro do mesmo arquivo entra uma vez só', () => {
    const { contacts, report } = importContacts(
      [{ name: 'Ana', phone: '+5511999998888' }, { name: 'Ana 2', phone: '11999998888' }],
      [],
      { now: T0 }
    )

    expect(contacts).toHaveLength(1)
    expect(report.skipped[0]?.reason).toBe('duplicate_in_file')
  })

  it('importar o mesmo arquivo duas vezes não duplica contato', () => {
    const rows = [{ name: 'Ana', phone: '+5511999998888' }]
    const first = importContacts(rows, [], { now: T0 })
    const second = importContacts(rows, first.contacts, { now: T0 + 1000 })

    expect(second.contacts).toHaveLength(1)
    expect(second.report.created).toHaveLength(0)
    expect(second.report.skipped[0]?.reason).toBe('duplicate_in_file')
  })

  it('com updateExisting, campo vazio da planilha não apaga dado existente', () => {
    const existing = contact({ id: 'c1', name: 'Ana Lima', company: 'DZ23' })
    const withEmail: Contact = { ...existing, customFields: { email: 'ana@dz23.dev' } }

    const { contacts, report } = importContacts(
      [{ name: '', phone: '+5511999998888', company: 'DZ23 Ltda' }],
      [withEmail],
      { now: T0 + 1000, updateExisting: true }
    )

    expect(report.updated).toHaveLength(1)
    expect(contacts[0]?.name).toBe('Ana Lima')
    expect(contacts[0]?.company).toBe('DZ23 Ltda')
    expect(contacts[0]?.customFields?.['email']).toBe('ana@dz23.dev')
  })

  it('sem updateExisting, contato existente é pulado', () => {
    const existing = contact({ id: 'c1' })
    const { contacts, report } = importContacts([{ name: 'Outra', phone: '+5511999998888' }], [existing], {
      now: T0 + 1000
    })

    expect(contacts).toHaveLength(1)
    expect(contacts[0]?.name).toBe('Ana')
    expect(report.updated).toHaveLength(0)
  })

  it('etiquetas da planilha são mescladas sem duplicar', () => {
    const existing = contact({ id: 'c1', tags: ['vip'] })
    const { contacts } = importContacts([{ phone: '+5511999998888', tags: ['vip', 'lead'] }], [existing], {
      now: T0 + 1000,
      updateExisting: true
    })

    expect(contacts[0]?.tags).toEqual(['lead', 'vip'])
  })
})

describe('duplicidade', () => {
  it('detecta mesmo telefone', () => {
    const pairs = findDuplicates([contact({ id: 'a' }), contact({ id: 'b' })])

    expect(pairs).toEqual([{ keepId: 'a', duplicateId: 'b', reason: 'same_phone' }])
  })

  it('detecta mesmo e-mail', () => {
    const a: Contact = { ...contact({ id: 'a', phone: '+5511911112222' }), customFields: { email: 'x@y.dev' } }
    const b: Contact = { ...contact({ id: 'b', phone: '+5511933334444' }), customFields: { email: 'X@Y.dev' } }

    expect(findDuplicates([a, b])[0]?.reason).toBe('same_email')
  })

  it('detecta mesmo nome e empresa', () => {
    const a = contact({ id: 'a', phone: '+5511911112222', name: 'Ana', company: 'DZ23' })
    const b = contact({ id: 'b', phone: '+5511933334444', name: 'ana', company: 'dz23' })

    expect(findDuplicates([a, b])[0]?.reason).toBe('same_name_and_company')
  })

  it('não marca duplicidade quando os dados são diferentes', () => {
    expect(findDuplicates([contact({ id: 'a' }), contact({ id: 'b', phone: '+5511933334444', name: 'Bruno' })])).toEqual(
      []
    )
  })
})

describe('exportação CSV', () => {
  it('escapa vírgula, aspas e quebra de linha', () => {
    expect(csvEscape('simples')).toBe('simples')
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('diz "oi"')).toBe('"diz ""oi"""')
    expect(csvEscape('linha1\nlinha2')).toBe('"linha1\nlinha2"')
    expect(csvEscape(undefined)).toBe('')
  })

  it('exporta cabeçalho, ordem determinística e campos certos', () => {
    const csv = exportContactsCsv([
      { ...contact({ id: 'b', phone: '+5511933334444', name: 'Bruno', company: 'ACME, Ltda' }), tags: ['lead'] },
      { ...contact({ id: 'a', phone: '+5511911112222', name: 'Ana' }), customFields: { email: 'ana@dz23.dev' } }
    ])

    const lines = csv.trim().split('\n')

    expect(lines[0]).toBe(CONTACT_CSV_HEADER.join(','))
    expect(lines[1]).toContain('Ana')
    expect(lines[1]).toContain('ana@dz23.dev')
    expect(lines[2]).toContain('"ACME, Ltda"')
    expect(lines[2]).toContain('lead')
    expect(csv.endsWith('\n')).toBe(true)
  })

  it('o CSV exportado volta pelo importador sem perder contato', () => {
    const source = [{ ...contact({ id: 'a', name: 'Ana' }), customFields: { email: 'ana@dz23.dev' } }]
    const csv = exportContactsCsv(source)
    const [, dataLine = ''] = csv.trim().split('\n')
    const columns = dataLine.match(/("([^"]|"")*"|[^,]*)/g)?.filter(Boolean) ?? []

    expect(columns[0]).toBe('Ana')
    expect(columns[1]).toBe('+5511999998888')
  })
})

describe('segmentação', () => {
  const contacts: Contact[] = [
    { ...contact({ id: 'a', name: 'Ana', company: 'DZ23', source: 'whatsapp', tags: ['vip', 'lead'] }), consent: { ...contact().consent, state: 'opted_in' } },
    { ...contact({ id: 'b', phone: '+5511933334444', name: 'Bruno', company: 'ACME', source: 'form', tags: ['lead'] }) },
    { ...contact({ id: 'c', phone: '+5511955556666', name: 'Carla', company: 'DZ23', source: 'whatsapp' }), blocked: true }
  ]

  it('filtra por etiquetas (todas precisam bater)', () => {
    expect(segmentContacts(contacts, { tags: ['lead'] }).map(c => c.id)).toEqual(['a', 'b'])
    expect(segmentContacts(contacts, { tags: ['lead', 'vip'] }).map(c => c.id)).toEqual(['a'])
  })

  it('filtra por empresa e origem sem diferenciar caixa', () => {
    expect(segmentContacts(contacts, { company: 'dz23' }).map(c => c.id)).toEqual(['a', 'c'])
    expect(segmentContacts(contacts, { source: 'FORM' }).map(c => c.id)).toEqual(['b'])
  })

  it('filtra por consentimento e por bloqueio', () => {
    expect(segmentContacts(contacts, { optedIn: true }).map(c => c.id)).toEqual(['a'])
    expect(segmentContacts(contacts, { blocked: true }).map(c => c.id)).toEqual(['c'])
  })

  it('busca livre cobre nome, telefone, empresa e e-mail', () => {
    expect(segmentContacts(contacts, { search: 'carla' }).map(c => c.id)).toEqual(['c'])
    expect(segmentContacts(contacts, { search: 'acme' }).map(c => c.id)).toEqual(['b'])
  })

  it('segmento vazio devolve todos', () => {
    expect(segmentContacts(contacts, {})).toHaveLength(3)
  })
})

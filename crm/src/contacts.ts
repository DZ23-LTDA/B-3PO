/**
 * Contatos e funil do WhatsApp CRM.
 *
 * O telefone é a identidade do contato na Cloud API: normalizar (E.164) é obrigatório para não
 * duplicar a mesma pessoa em formatos diferentes. O funil é dado de negócio — valor é informativo,
 * nunca executa operação financeira.
 */
import type { ContactConsent } from './consent'

export interface Contact {
  id: string
  /** E.164: `+5511999998888`. */
  phone: string
  name?: string
  company?: string
  tags: string[]
  source?: string
  owner?: string
  locale?: string
  timezone?: string
  customFields?: Record<string, string>
  consent: ContactConsent
  blocked: boolean
  createdAt: number
  updatedAt: number
}

export type ContactError = 'invalid_phone'

/**
 * Normaliza para E.164. Aceita `+55 (11) 99999-8888`, `5511999998888`, `011999998888`.
 * Brasil: garante o 9º dígito em celular e descarta zero de discagem.
 */
export function normalizePhone(raw: string, defaultCountry = '55'): string | null {
  const digits = raw.replace(/[^\d]/g, '')
  if (digits.length < 8) {
    return null
  }

  let national = digits

  if (national.startsWith('+')) {
    national = national.slice(1)
  }

  // remove o zero de discagem nacional (011…)
  if (national.startsWith('0') && !national.startsWith(defaultCountry)) {
    national = national.replace(/^0+/, '')
  }

  // já veio com DDI
  if (national.startsWith(defaultCountry) && national.length >= 12) {
    return `+${national}`
  }

  // DDD + número local: completa com DDI e o 9º dígito quando for celular de 10 dígitos
  if (national.length === 10 || national.length === 11) {
    const ddd = national.slice(0, 2)
    let local = national.slice(2)
    if (local.length === 8) {
      local = `9${local}` // fixo/móvel antigo sem o nono dígito
    }

    return `+${defaultCountry}${ddd}${local}`
  }

  return `+${national}`
}

export interface ContactInput {
  consent?: ContactConsent
  company?: string
  name?: string
  owner?: string
  phone: string
  source?: string
  tags?: string[]
}

export function createContact(input: ContactInput, now = Date.now()): Contact | ContactError {
  const phone = normalizePhone(input.phone)

  if (!phone) {
    return 'invalid_phone'
  }

  return {
    blocked: false,
    company: input.company,
    consent: input.consent ?? { events: [], state: 'unknown' },
    createdAt: now,
    id: `contact_${phone.replace(/\D/g, '')}`,
    name: input.name,
    owner: input.owner,
    phone,
    source: input.source,
    tags: input.tags ?? [],
    updatedAt: now
  }
}

/** Atualiza sem tocar em identidade (`id`, `phone`, `consent` têm caminhos próprios). */
export function updateContact(contact: Contact, patch: Partial<Omit<Contact, 'id' | 'phone' | 'consent'>>, now = Date.now()): Contact {
  return { ...contact, ...patch, updatedAt: now }
}

export interface PipelineStage {
  id: string
  name: string
  order: number
}

export interface Deal {
  id: string
  contactId: string
  stageId: string
  /** Valor **informativo** em centavos; o CRM não movimenta dinheiro. */
  valueCents?: number
  currency?: string
  title: string
  createdAt: number
  updatedAt: number
}

export const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'new', name: 'Novo', order: 0 },
  { id: 'talking', name: 'Conversando', order: 1 },
  { id: 'qualified', name: 'Qualificado', order: 2 },
  { id: 'won', name: 'Ganho', order: 3 },
  { id: 'lost', name: 'Perdido', order: 4 }
]

export function moveDeal(deal: Deal, stageId: string, stages: PipelineStage[], now = Date.now()): Deal {
  if (!stages.some(stage => stage.id === stageId)) {
    throw new Error(`etapa desconhecida: ${stageId}`)
  }

  return { ...deal, stageId, updatedAt: now }
}

/** Métricas do funil: contagem e valor por etapa (dado, não previsão financeira). */
export function funnelMetrics(deals: Deal[], stages: PipelineStage[]): Array<{ stageId: string; count: number; valueCents: number }> {
  return stages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(stage => {
      const inStage = deals.filter(deal => deal.stageId === stage.id)

      return {
        count: inStage.length,
        stageId: stage.id,
        valueCents: inStage.reduce((sum, deal) => sum + (deal.valueCents ?? 0), 0)
      }
    })
}

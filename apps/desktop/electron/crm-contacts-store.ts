// Contatos do CRM no disco do usuário, dono do dado: o processo principal do Electron.
//
// O renderer pede e apresenta; quem valida, grava e devolve estado consistente é aqui. Sem banco externo:
// um JSON sob o `userData` do app, gravado com `write` + `rename` para uma queda no meio não deixar arquivo
// pela metade. A lógica de funil/automação continua em `@dz23/crm-core` — este arquivo só guarda contatos.

import { WriteQueue } from './write-queue'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export type BaseLegal = 'consentimento' | 'contrato' | 'legitimo_interesse' | 'obrigacao_legal'

export type Consentimento = {
  /** Quando o titular autorizou, em ms. */
  at: number
  /** Base legal invocada. */
  base: BaseLegal
  /** 	rue = autorizou; alse = recusou explicitamente. */
  granted: boolean
}

export interface CrmContact {
  /**
   * Base legal do contato para receber comunicacao (LGPD).
ull = nunca registrado, que NAO e o mesmo
   * que
ecusado: ausencia de registro e ausencia de consentimento, mas precisa aparecer como tal em vez
   * de virar um alse que ninguem sabe se foi recusa ou esquecimento.
   */
  consent: Consentimento | null
  created_at: number
  /** Só dígitos e `+`, como o telefone precisa chegar na API oficial. */
  phone: string
  name: string
  email: string
  company: string
  tags: string[]
  /**
   * Empresa dona deste contato.
   *
   * O CRM nasceu sem tenant: `phone` era a chave única, e o mesmo telefone não podia ser cliente de
   * duas empresas. Com multiempresa a chave passa a ser `(phone, tenant_id)`.
   *
   * Registros gravados antes disso não têm o campo; `parseStore` os lê como `local`, então nenhum dado
   * existente fica órfão e nada precisa ser migrado destrutivamente.
   */
  tenant_id: string
  updated_at: number
  /**
   * A última compra deste cliente (r134 do GOAL V2).
   *
   * **Por que no contato, e não numa tabela de ligação**: o CRM é a ficha de quem o cliente é, e "quando ele
   * comprou por último e quanto" é o fato que quem atende precisa ver **sem navegar**. Guardar só o id da venda
   * obrigaria uma segunda leitura para responder a pergunta mais comum do balcão.
   *
   * **`null` é "nunca comprou"** — e não "não sei". Um contato criado à mão no CRM tem `null` aqui, e a tela pode
   * dizer isso em vez de mostrar `0`, que seria uma compra de zero real.
   *
   * **O histórico completo NÃO fica aqui**: `last_*` é o último, e o resto está no `sales-store`. Duplicar a
   * lista de vendas no contato faria duas fontes para o mesmo fato.
   */
  last_purchase_at: null | number
  last_purchase_cents: null | number
  last_sale_id: null | string
  /**
   * O ultimo chamado de atendimento (r146).
   *
   * **O CRM ve so a data e o id** — uma contagem de reclamacoes seria uma opiniao; a data e um fato. E o
   * historico completo esta no service-desk-store, nao aqui.
   */
  last_ticket_at: null | number
  last_ticket_id: null | string
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

export const DEFAULT_TENANT = 'local'

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
const BASES_LEGAIS: readonly BaseLegal[] = ['consentimento', 'contrato', 'legitimo_interesse', 'obrigacao_legal']

/**
 * Le o consentimento gravado, ou `null` quando nunca foi registrado.
 *
 * Recusa tudo que nao for um registro completo e reconhecivel em vez de adivinhar. Um consentimento adivinhado
 * e pior que ausente: ele aparece no relatorio de conformidade como se o titular tivesse autorizado.
 */
export function normalizarConsentimento(bruto: unknown): Consentimento | null {
  if (!bruto || typeof bruto !== 'object') {
    return null
  }

  const raw = bruto as Record<string, unknown>
  const base = raw['base']
  const at = Number(raw['at'])
  const granted = raw['granted']

  if (!BASES_LEGAIS.includes(base as BaseLegal)) {
    return null
  }

  if (!Number.isFinite(at) || at <= 0) {
    return null
  }

  if (typeof granted !== 'boolean') {
    return null
  }

  return { at, base: base as BaseLegal, granted }
}

/** Pode receber comunicacao? Ausencia de registro nunca vira permissao. */
export function podeReceberComunicacao(contato: CrmContact): boolean {
  return contato.consent?.granted === true
}
export function normalizeContact(input: unknown, now: number, tenantId: string = DEFAULT_TENANT): { contact: CrmContact } | { error: string } {
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
      consent: normalizarConsentimento(raw['consent']),
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      email: text(raw['email']),
      name,
      phone,
      tags: tags(raw['tags']),
      tenant_id: tenantId || DEFAULT_TENANT,
      updated_at: now,
      // r134: `null` e "nunca comprou". Um contato criado a mao no CRM nao tem compra, e `0` seria uma venda
      // de zero real - fato diferente de nao ter vendido nada.
      last_purchase_at: typeof raw['last_purchase_at'] === 'number' ? raw['last_purchase_at'] : null,
      last_purchase_cents: typeof raw['last_purchase_cents'] === 'number' ? raw['last_purchase_cents'] : null,
      last_sale_id: typeof raw['last_sale_id'] === 'string' && raw['last_sale_id'] ? raw['last_sale_id'] : null,
      last_ticket_at: typeof raw['last_ticket_at'] === 'number' ? raw['last_ticket_at'] : null,
      last_ticket_id: typeof raw['last_ticket_id'] === 'string' && raw['last_ticket_id'] ? raw['last_ticket_id'] : null
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

    // Registro antigo nao tem 	enant_id. Ler como local evita migracao destrutiva: o dado continua
    // visivel e ganha o campo na proxima gravacao.
    return {
      contacts: parsed.contacts
        .filter(entry => !!entry && typeof entry.phone === 'string')
        .map(entry => ({ ...entry, tenant_id: entry.tenant_id || DEFAULT_TENANT })),
      schema_version: 1
    }
  } catch {
    return emptyStore()
  }
}

export class CrmContactStore {
  constructor(private readonly filePath: string) {}

  /** Fila de escrita (r237): read -> valida -> write nao era serializado. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  async list(tenantId: string = DEFAULT_TENANT): Promise<CrmContact[]> {
    const store = await this.read()

    return store.contacts.filter(c => c.tenant_id === tenantId).sort((a, b) => b.updated_at - a.updated_at)
  }

  async upsert(input: unknown, tenantId: string = DEFAULT_TENANT): Promise<{ contacts: CrmContact[] } | { error: string }> {
    return this.fila.serializar(() => this.upsertSerializado(input, tenantId))
  }

  private async upsertSerializado(input: unknown, tenantId: string = DEFAULT_TENANT): Promise<{ contacts: CrmContact[] } | { error: string }> {
    const normalized = normalizeContact(input, Date.now(), tenantId)

    if ('error' in normalized) {
      return normalized
    }

    const store = await this.read()
    const contact = normalized.contact
    // Chave composta: o mesmo telefone pode ser cliente de duas empresas, e cada uma tem o seu.
    const existing = store.contacts.findIndex(entry => entry.phone === contact.phone && entry.tenant_id === contact.tenant_id)

    if (existing >= 0) {
      // Mesmo telefone é o mesmo contato: atualiza em vez de duplicar (o índice do CRM é o telefone).
      store.contacts[existing] = { ...store.contacts[existing], ...contact, created_at: store.contacts[existing]!.created_at }
    } else {
      store.contacts.push(contact)
    }

    await this.write(store)

    return { contacts: await this.list(tenantId) }
  }

  async remove(phone: string, tenantId: string = DEFAULT_TENANT): Promise<{ contacts: CrmContact[] }> {
    return this.fila.serializar(() => this.removeSerializado(phone, tenantId))
  }

  private async removeSerializado(phone: string, tenantId: string = DEFAULT_TENANT): Promise<{ contacts: CrmContact[] }> {
    const store = await this.read()
    const wanted = digitsOnly(phone)
    store.contacts = store.contacts.filter(entry => !(entry.phone === wanted && entry.tenant_id === tenantId))
    await this.write(store)

    return { contacts: await this.list(tenantId) }
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

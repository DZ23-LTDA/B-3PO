/**
 * Contatos do CRM no renderer. A verdade é do processo principal (arquivo sob `userData`); aqui só se
 * tipa a chamada e se traduz "erro de validação" em texto para a tela.
 *
 * Quando o app roda no navegador (`window.hermesDesktop` ausente) não há disco local: as funções recusam
 * com `unavailable` em vez de fingir que salvaram.
 */

export interface CrmContactRow {
  company: string
  /**
   * Base legal do contato (LGPD, r185).
   *
   * `null` = nunca registrado, que NAO e o mesmo que recusado: `false` diz "o titular disse nao",
   * `null` diz "ninguem perguntou".
   */
  consent?: ConsentimentoRow | null
  created_at: number
  email: string
  name: string
  phone: string
  tags: string[]
  updated_at: number
}

export type BaseLegalRow = 'consentimento' | 'contrato' | 'legitimo_interesse' | 'obrigacao_legal'

export interface ConsentimentoRow {
  at: number
  base: BaseLegalRow
  granted: boolean
}

/** Pode receber comunicacao? Ausencia de registro nunca vira permissao. */
export function podeReceberComunicacao(contato: CrmContactRow): boolean {
  return contato.consent?.granted === true
}

export interface CrmContactsBridge {
  list: () => Promise<{ contacts: CrmContactRow[] }>
  remove: (phone: string) => Promise<{ contacts: CrmContactRow[] }>
  upsert: (payload: Partial<CrmContactRow>) => Promise<{ contacts: CrmContactRow[] } | { error: string }>
}

function bridge(): CrmContactsBridge | null {
  const host = (globalThis as { hermesDesktop?: { crmContacts?: CrmContactsBridge } }).hermesDesktop

  return host?.crmContacts ?? null
}

export function crmAvailable(): boolean {
  return bridge() !== null
}

export async function listCrmContacts(): Promise<CrmContactRow[]> {
  const api = bridge()

  if (!api) {
    throw new Error('unavailable')
  }

  return (await api.list()).contacts ?? []
}

export async function saveCrmContact(payload: Partial<CrmContactRow>): Promise<{ contacts: CrmContactRow[] } | { error: string }> {
  const api = bridge()

  if (!api) {
    return { error: 'unavailable' }
  }

  return api.upsert(payload)
}

export async function removeCrmContact(phone: string): Promise<CrmContactRow[]> {
  const api = bridge()

  if (!api) {
    throw new Error('unavailable')
  }

  return (await api.remove(phone)).contacts ?? []
}

const MESSAGES: Record<string, string> = {
  name_required: 'Informe o nome do contato.',
  phone_required: 'Informe o telefone.',
  phone_too_short: 'O telefone precisa de pelo menos 8 dígitos.',
  unavailable: 'Este cliente não tem disco local para guardar contatos.'
}

/** Mensagem para a tela; um código desconhecido não vira texto inventado. */
export function crmErrorText(code: string): string {
  return MESSAGES[code] ?? `Não foi possível salvar (${code}).`
}

/**
 * Consentimento do WhatsApp CRM (opt-in / opt-out).
 *
 * Regra de negócio, não de UI: nenhuma mensagem sai sem opt-in válido, e opt-out é imediato e
 * definitivo até o contato dar novo opt-in. Fora da janela de atendimento de 24h, só template
 * aprovado pode ser enviado — a decisão é tomada aqui, no ponto efetivo, nunca na tela.
 */

export type ConsentState = 'opted_in' | 'opted_out' | 'unknown'

export type ConsentSource = 'customer_message' | 'form' | 'import' | 'agent' | 'api'

export interface ConsentEvent {
  at: number
  /** Quem registrou: humano, bot, sistema ou importação. */
  by: string
  kind: 'opt_in' | 'opt_out'
  source: ConsentSource
  /** Evidência da decisão (texto do formulário, id da mensagem, URL do termo). */
  evidence?: string
}

export interface ContactConsent {
  state: ConsentState
  events: ConsentEvent[]
  /** Última mensagem recebida do contato (ms). Define a janela de 24h. */
  lastInboundAt?: number
}

/** Janela de atendimento da Cloud API: 24h desde a última mensagem do cliente. */
export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

export interface SendDecision {
  allowed: boolean
  reason:
    | 'ok_service_window'
    | 'ok_template'
    | 'no_consent'
    | 'opted_out'
    | 'outside_window_needs_template'
    | 'missing_template_approval'
  /** `true` quando a mensagem exige template aprovado (fora da janela). */
  requiresTemplate: boolean
}

export function emptyConsent(): ContactConsent {
  return { events: [], state: 'unknown' }
}

/**
 * Aplica um evento de consentimento. `opt_out` vence sempre e não pode ser sobrescrito por
 * `opt_in` com origem fraca (`import`) sem evidência — importação não é consentimento.
 */
export function applyConsent(consent: ContactConsent, event: ConsentEvent): ContactConsent {
  if (event.kind === 'opt_in' && event.source === 'import' && !event.evidence) {
    return consent // importação sem evidência não liga consentimento
  }

  const state: ConsentState = event.kind === 'opt_in' ? 'opted_in' : 'opted_out'

  return { ...consent, events: [...consent.events, event], state }
}

/** Registra mensagem recebida: abre (ou renova) a janela de atendimento. */
export function noteInbound(consent: ContactConsent, at: number): ContactConsent {
  return { ...consent, lastInboundAt: at }
}

/** Opt-out é imediato: chamado pelo webhook quando o cliente escreve a palavra de saída. */
export function noteOutboundKeyword(consent: ContactConsent, text: string, at: number, by: string): ContactConsent {
  const normalized = text.trim().toLowerCase()
  const stop = ['sair', 'parar', 'cancelar', 'stop', 'unsubscribe', 'descadastrar']

  if (!stop.includes(normalized)) {
    return consent
  }

  return applyConsent(consent, { at, by, evidence: text.slice(0, 200), kind: 'opt_out', source: 'customer_message' })
}

/**
 * Decide se uma mensagem pode sair AGORA.
 *
 * @param templateApproved quando a mensagem é um template já aprovado pela Meta
 */
export function decideSend(
  consent: ContactConsent,
  now: number,
  { templateApproved = false }: { templateApproved?: boolean } = {}
): SendDecision {
  if (consent.state === 'opted_out') {
    return { allowed: false, reason: 'opted_out', requiresTemplate: false }
  }

  if (consent.state !== 'opted_in') {
    return { allowed: false, reason: 'no_consent', requiresTemplate: false }
  }

  const insideWindow = consent.lastInboundAt !== undefined && now - consent.lastInboundAt <= SERVICE_WINDOW_MS

  if (insideWindow) {
    return { allowed: true, reason: 'ok_service_window', requiresTemplate: false }
  }

  if (!templateApproved) {
    return { allowed: false, reason: 'outside_window_needs_template', requiresTemplate: true }
  }

  return { allowed: true, reason: 'ok_template', requiresTemplate: true }
}

/** Histórico legível para auditoria/LGPD: quem mudou o consentimento, quando e com que evidência. */
export function consentHistory(consent: ContactConsent): ConsentEvent[] {
  return [...consent.events].sort((a, b) => a.at - b.at)
}

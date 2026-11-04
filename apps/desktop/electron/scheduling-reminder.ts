// Lembretes de agendamento (rodada 122).
//
// O QUE É UM LEMBRETE, E O QUE NÃO É
//
// O lembrete tem duas metades: DECIDIR quando avisar (domínio) e ENVIAR a mensagem (canal). Este arquivo faz
// a primeira. O envio depende de WhatsApp — `BLOCKED_BY_EXTERNAL_DEPENDENCY` por credencial — e não é
// reimplementado aqui.
//
// Separar as duas importa: o cálculo pode ser testado hoje, e o dia em que o canal existir ele consome uma
// lista pronta em vez de recalcular a regra.
//
// A REGRA QUE MAIS FALHA EM PRODUÇÃO: MANDAR DUAS VEZES
//
// Um lembrete duplicado não é ruído, é o cliente recebendo a mesma mensagem duas vezes e perdendo a
// confiança no número. Por isso a decisão é por CHAVE ESTÁVEL (`agendamento:<id>:<janela>`) e o chamador
// informa o que já foi enviado: a mesma chave nunca sai duas vezes, mesmo que o cálculo rode de novo a cada
// minuto.

import type { Appointment } from './scheduling-store'

const HORA = 3_600_000

/** Janelas de antecedência oferecidas, em horas. 24 = "lembrete de véspera". */
export const ANTECEDENCIAS_HORAS = [1, 3, 24, 48] as const

export type AntecedenciaHoras = (typeof ANTECEDENCIAS_HORAS)[number]

/** Situações em que o cliente ainda espera o atendimento. Cancelado e concluído não recebem lembrete. */
const AVISAVEIS: ReadonlySet<string> = new Set(['marcado', 'confirmado'])

export interface LembreteDevido {
  appointment_id: string
  contact_phone: string
  /** Quando o cliente deve ser avisado (epoch ms). */
  enviar_em: number
  /** Quando é o atendimento. */
  quando: number
  resource_id: string
  service: string
  /**
   * Chave de idempotência: `agendamento:<id>:<horas>h`.
   *
   * Estável por (agendamento, janela) e independente de quando o cálculo roda — é o que impede o mesmo
   * lembrete de sair duas vezes.
   */
  ref: string
}

export interface ConsultaLembretes {
  antecedencia_horas: AntecedenciaHoras | number
  agendamentos: readonly Appointment[]
  /** Refs que já foram enviadas. */
  ja_enviados?: ReadonlySet<string> | readonly string[]
  /** Instante da consulta (epoch ms). */
  agora: number
  /** Janela de tolerância para trás, em horas: o processo pode ter ficado parado. */
  tolerancia_horas?: number
}

function enviadosPara(jaEnviados: ConsultaLembretes['ja_enviados']): ReadonlySet<string> {
  if (!jaEnviados) return new Set()

  return jaEnviados instanceof Set ? jaEnviados : new Set(jaEnviados)
}

/**
 * Lembretes que devem sair agora.
 *
 * Um lembrete está devido quando `enviar_em <= agora` e ainda não passou da tolerância. A tolerância existe
 * porque o processo pode ter estado desligado: sem ela, um lembrete de véspera calculado de madrugada
 * simplesmente não sairia — e o cliente não seria avisado do atendimento da manhã.
 *
 * Ordena por `enviar_em` para o chamador enviar primeiro o mais atrasado.
 */
export function lembretesDevidos(consulta: ConsultaLembretes): LembreteDevido[] {
  const antecedencia = consulta.antecedencia_horas

  if (!Number.isFinite(antecedencia) || antecedencia < 0) return []

  const enviados = enviadosPara(consulta.ja_enviados)
  const tolerancia = Math.max(0, consulta.tolerancia_horas ?? 2) * HORA
  const antecedenciaMs = antecedencia * HORA
  const devidos: LembreteDevido[] = []

  for (const agendamento of consulta.agendamentos) {
    if (!AVISAVEIS.has(agendamento.status)) continue
    if (!agendamento.contact_phone) continue

    const enviarEm = agendamento.starts_at - antecedenciaMs
    const ref = `agendamento:${agendamento.id}:${antecedencia}h`

    if (enviados.has(ref)) continue
    // Ainda não chegou a hora.
    if (enviarEm > consulta.agora) continue
    // Passou da tolerância: avisar agora seria avisar depois do atendimento.
    if (consulta.agora - enviarEm > tolerancia) continue
    // O atendimento já começou — lembrete não faz mais sentido.
    if (agendamento.starts_at <= consulta.agora) continue

    devidos.push({
      appointment_id: agendamento.id,
      contact_phone: agendamento.contact_phone,
      enviar_em: enviarEm,
      quando: agendamento.starts_at,
      ref,
      resource_id: agendamento.resource_id,
      service: agendamento.service
    })
  }

  return devidos.sort((a, b) => a.enviar_em - b.enviar_em)
}

/**
 * Texto do lembrete.
 *
 * Sem emoji e sem "não responda": é mensagem de serviço, e o cliente pode precisar responder para
 * reagendar. O horário vem formatado pelo chamador porque o fuso é decisão da apresentação, não do domínio.
 */
export function textoDoLembrete(lembrete: LembreteDevido, formatarQuando: (ms: number) => string): string {
  const quando = formatarQuando(lembrete.quando)

  return `Lembrete: ${lembrete.service} em ${quando}. Se precisar remarcar, responda esta mensagem.`
}

// A ponte entre a agenda e o catálogo de serviços.
//
// A agenda aceitava `service` como texto livre: "Corte", "corte ", "Corte " viravam três coisas, o
// fim do horário era digitado à mão e ninguém sabia o preço. Este arquivo resolve o texto contra o
// catálogo canônico e devolve o que a agenda precisa para gravar um compromisso honesto:
//
// - o id do serviço, para a agenda referenciar e não copiar o nome;
// - `ends_at` **derivado** da duração do catálogo, não aceito do chamador;
// - o preço do catálogo, para o caixa não redigitar.
//
// Duas decisões que valem justificar:
//
// 1. Serviço fora do catálogo é **erro**, não cria um serviço novo. Cadastro de serviço é ato
//    deliberado; um agendamento não deve criar catálogo por acidente — é assim que se acaba com
//    "Corte", "corte" e "Corte " no mesmo sistema.
// 2. `ends_at` informado é **ignorado** em favor do catálogo. Duas fontes para a mesma duração
//    divergem no dia em que alguém remarca apressado.

import type { Service } from './services-store'

export interface AppointmentInput {
  ends_at?: unknown
  service?: unknown
  starts_at?: unknown
}

export interface LinkedService {
  duration_min: number
  /** Derivado do catálogo: `starts_at` + duração. */
  ends_at: number
  price_cents: number
  /** Nome canônico do catálogo, não o texto que o chamador mandou. */
  service: string
  service_id: string
  starts_at: number
}

function normalizeKey(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

/** Aceita epoch em ms ou string ISO — a tela manda um, a API pode mandar o outro. */
export function timestampOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value)
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function linkService(
  input: AppointmentInput,
  services: readonly Service[]
): { error: string } | { linked: LinkedService } {
  const texto = typeof input.service === 'string' ? input.service.trim() : ''

  if (!texto) {
    return { error: 'service_required' }
  }

  const startsAt = timestampOf(input.starts_at)

  if (startsAt === null) {
    return { error: 'starts_at_invalid' }
  }

  const chave = normalizeKey(texto)
  const servico = services.find(s => s.active && normalizeKey(s.name) === chave)

  if (!servico) {
    // Nao cria servico novo: isso transformaria um agendamento em cadastro e proliferaria variantes.
    return { error: 'servico_nao_encontrado' }
  }

  return {
    linked: {
      duration_min: servico.duration_min,
      ends_at: startsAt + servico.duration_min * 60_000,
      price_cents: servico.price_cents,
      service: servico.name,
      service_id: servico.id,
      starts_at: startsAt
    }
  }
}

/**
 * Quanto o agendamento vale, pelo catálogo.
 *
 * Devolve `null` quando o serviço não existe mais (foi removido depois de agendado): o compromisso
 * continua válido, mas o valor não pode ser inventado.
 */
export function priceForAppointment(appointment: { price_cents?: number; service: string }, services: readonly Service[]): number | null {
  if (typeof appointment.price_cents === 'number' && appointment.price_cents >= 0) {
    return appointment.price_cents
  }

  const chave = normalizeKey(appointment.service)

  return services.find(s => normalizeKey(s.name) === chave)?.price_cents ?? null
}

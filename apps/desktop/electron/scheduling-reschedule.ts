// Reagendamento (rodada 123).
//
// O QUE JÁ EXISTIA
//
// `conflictFor(appointments, candidate, ignorarId)` já resolve o problema difícil: o `ignorarId` existe para
// que um agendamento não conflite CONSIGO MESMO ao mudar de horário. A auditoria da r121 achou 1 ocorrência
// de "reagend" — a peça estava lá, sem ninguém montar.
//
// O QUE FALTAVA
//
// A orquestração: validar a duração, consultar o conflito ignorando o próprio, e registrar que o horário
// mudou. Sem o registro, um reagendamento apaga o anterior e some a resposta para "o cliente diz que era
// às 10h".
//
// POR QUE A HISTÓRIA VAI EM `notes`
//
// `Appointment` não tem campo de histórico, e criar um agora mudaria o schema por causa de uma rodada. O
// campo `notes` já é texto livre do operador e é o lugar honesto: o registro fica visível na tela que já
// mostra `notes`, sem inventar estrutura que ninguém lê.

import { conflictFor, type Appointment } from './scheduling-store'

export interface PedidoReagendamento {
  /** Novo início (epoch ms). */
  novo_inicio: number
  /**
   * Nova duração em ms. Omitida, mantém a duração atual — reagendar quase sempre é mudar de horário, não de
   * serviço.
   */
  nova_duracao_ms?: number
}

export type ResultadoReagendamento =
  | { agendamento: Appointment; ok: true; anterior: { ends_at: number; starts_at: number } }
  | { motivo: 'conflito' | 'duracao_invalida' | 'nao_remarcavel'; ok: false; ocupado_por?: string }

/** Situações em que mover o horário não faz sentido: o atendimento já aconteceu ou não vai acontecer. */
const REMARCaveis: ReadonlySet<string> = new Set(['marcado', 'confirmado'])

/**
 * Move um agendamento para outro horário.
 *
 * `agendamentos` deve ser a lista COMPLETA do tenant: a checagem de conflito precisa enxergar os outros
 * compromissos do mesmo recurso. Passar só o agendamento a mover devolveria sempre "livre".
 */
export function reagendar(
  agendamento: Appointment,
  pedido: PedidoReagendamento,
  agendamentos: readonly Appointment[],
  agora: number
): ResultadoReagendamento {
  if (!REMARCaveis.has(agendamento.status)) return { motivo: 'nao_remarcavel', ok: false }

  const duracao = pedido.nova_duracao_ms ?? agendamento.ends_at - agendamento.starts_at

  if (!Number.isFinite(duracao) || duracao <= 0) return { motivo: 'duracao_invalida', ok: false }
  if (!Number.isFinite(pedido.novo_inicio)) return { motivo: 'duracao_invalida', ok: false }

  const novoFim = pedido.novo_inicio + duracao

  // O próprio agendamento é ignorado: sem isso, mover um compromisso sempre colidiria com ele mesmo.
  const conflito = conflictFor(
    agendamentos,
    {
      ends_at: novoFim,
      id: agendamento.id,
      resource_id: agendamento.resource_id,
      starts_at: pedido.novo_inicio,
      tenant_id: agendamento.tenant_id
    },
    agendamento.id
  )

  if (conflito) return { motivo: 'conflito', ocupado_por: conflito.id, ok: false }

  const anterior = { ends_at: agendamento.ends_at, starts_at: agendamento.starts_at }

  return {
    agendamento: {
      ...agendamento,
      ends_at: novoFim,
      notes: registrarMudanca(agendamento.notes, anterior, { starts_at: pedido.novo_inicio }, agora),
      starts_at: pedido.novo_inicio,
      updated_at: agora
    },
    anterior,
    ok: true
  }
}

/** Marca o horário anterior no texto, sem apagar o que o operador já escreveu. */
function registrarMudanca(
  notes: string,
  de: { starts_at: number },
  para: { starts_at: number },
  agora: number
): string {
  const marca = `remarcado de ${de.starts_at} para ${para.starts_at} (${agora})`

  return notes ? `${notes} | ${marca}` : marca
}

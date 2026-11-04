// Disponibilidade de agenda (rodada 121).
//
// O QUE A AUDITORIA MOSTROU
//
// `scheduling-store.ts` já detecta CONFLITO (10 ocorrências) e `resource_id` unifica profissional, sala e
// equipamento — não há três domínios onde deveria haver um. O que não existia: DISPONIBILIDADE. Nenhuma
// ocorrência da palavra antes desta rodada.
//
// É a pergunta que a recepção faz o dia inteiro: "que horários você tem na terça?". Sem ela, o operador
// oferece um horário, tenta salvar, e descobre o conflito na recusa — depois de já ter combinado com o
// cliente.
//
// A DIFERENÇA ENTRE OCUPADO E BLOQUEADO
//
//   ocupado    um agendamento. Pode ser cancelado e o horário volta.
//   bloqueado  o recurso não atende (almoço, folga, manutenção). Não é agendamento e não vira um.
//
// Tratar os dois como a mesma lista perderia essa diferença na hora de explicar ao cliente por que o
// horário não está livre.

import type { Appointment } from './scheduling-store'

const MINUTO = 60_000

export interface Janela {
  /** Início do expediente no dia (epoch ms). */
  abre: number
  /** Fim do expediente (epoch ms). Exclusivo: um atendimento que termina aqui cabe. */
  fecha: number
}

export interface Bloqueio {
  ends_at: number
  motivo: string
  resource_id: string
  starts_at: number
}

export interface Slot {
  starts_at: number
  ends_at: number
}

export interface ConsultaDisponibilidade {
  /** Duração do serviço em minutos. Zero ou negativo devolve lista vazia. */
  duracao_minutos: number
  /** Intervalo entre horários oferecidos, em minutos. 30 gera 09:00, 09:30, 10:00. */
  granularidade_minutos?: number
  /** Agendamentos já existentes (qualquer status que ocupe horário). */
  ocupados: readonly Appointment[]
  bloqueios?: readonly Bloqueio[]
  resource_id: string
  /** Fim do expediente. Exclusivo. */
  janela: Janela
  /** Não oferecer horário que comece antes disso (ex.: agora, para não agendar no passado). */
  nao_antes_de?: number
}

/**
 * Horários livres para um recurso.
 *
 * Um horário é livre quando o intervalo `[início, início + duração)` não encosta em nada ocupado nem
 * bloqueado, e termina dentro do expediente. O fim é exclusivo nos dois lados: um atendimento que termina
 * às 10:00 e outro que começa às 10:00 não conflitam — é assim que a agenda real funciona.
 *
 * Só `cancelado` libera horário. `concluido` e `faltou` aconteceram; o horário passou.
 */
export function horariosLivres(consulta: ConsultaDisponibilidade): Slot[] {
  const duracao = consulta.duracao_minutos

  if (!Number.isFinite(duracao) || duracao <= 0) return []

  const granularidade = Math.max(1, consulta.granularidade_minutos ?? 30)
  const duracaoMs = duracao * MINUTO
  const passoMs = granularidade * MINUTO
  const piso = Math.max(consulta.janela.abre, consulta.nao_antes_de ?? consulta.janela.abre)

  const ocupados = consulta.ocupados
    .filter(a => a.resource_id === consulta.resource_id && a.status !== 'cancelado')
    .map(a => ({ fim: a.ends_at, inicio: a.starts_at }))

  const bloqueados = (consulta.bloqueios ?? [])
    .filter(b => b.resource_id === consulta.resource_id)
    .map(b => ({ fim: b.ends_at, inicio: b.starts_at }))

  const impedimentos = [...ocupados, ...bloqueados]
  const livres: Slot[] = []

  for (let inicio = piso; inicio + duracaoMs <= consulta.janela.fecha; inicio += passoMs) {
    const fim = inicio + duracaoMs
    // Sobreposição de intervalos semiabertos: [a,b) e [c,d) colidem se a < d e c < b.
    const colide = impedimentos.some(i => inicio < i.fim && i.inicio < fim)

    if (!colide) livres.push({ ends_at: fim, starts_at: inicio })
  }

  return livres
}

/**
 * Primeiro horário livre.
 *
 * Devolver `null` em vez do primeiro slot da lista vazia força o chamador a tratar "não tem horário" — o
 * caso que a recepção precisa ver, não o que ela quer.
 */
export function proximoHorario(consulta: ConsultaDisponibilidade): Slot | null {
  return horariosLivres(consulta)[0] ?? null
}

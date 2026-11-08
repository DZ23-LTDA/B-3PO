// Disponibilidade de agenda — regra, no lado do renderer.
//
// ESPELHO CONSCIENTE
//
// `electron/scheduling-availability.ts` tem a mesma regra. O renderer NÃO importa de `electron/` (fronteira do
// projeto), e o processo principal não importa de `src/`. Duas cópias pequenas e idênticas são o preço de não
// mover dado para dentro de uma tela nem cálculo para dentro de um processo que não o usa.
//
// A REGRA É UMA SÓ: sobreposição semiaberta. `[a,b)` colide com `[c,d)` quando `a < d && c < b`. Um
// atendimento que termina às 10:00 e outro que começa às 10:00 NÃO conflitam — é assim que a agenda real
// funciona, e as duas cópias implementam isso.
//
// Se as duas divergirem, o sintoma é a tela oferecer horário que o backend recusa. O teste de contrato do
// backend cobre a cópia dele; esta cobre a da tela.

const MINUTO = 60_000

export interface JanelaSlot {
  abre: number
  fecha: number
}

export interface BloqueioSlot {
  ends_at: number
  resource_id: string
  starts_at: number
}

export interface AgendamentoSlot {
  ends_at: number
  resource_id: string
  starts_at: number
  status: string
}

export interface Slot {
  ends_at: number
  starts_at: number
}

export interface ConsultaSlots {
  bloqueios?: readonly BloqueioSlot[]
  duracao_minutos: number
  /** Intervalo entre horários oferecidos. 30 gera 09:00, 09:30, 10:00. */
  granularidade_minutos?: number
  janela: JanelaSlot
  nao_antes_de?: number
  ocupados: readonly AgendamentoSlot[]
  resource_id: string
}

/**
 * Horários livres para um recurso.
 *
 * Só `cancelado` libera horário: `concluido` e `faltou` aconteceram, o horário passou.
 */
export function horariosLivresPara(consulta: ConsultaSlots): Slot[] {
  const duracao = consulta.duracao_minutos

  if (!Number.isFinite(duracao) || duracao <= 0) return []

  const granularidade = Math.max(1, consulta.granularidade_minutos ?? 30)
  const duracaoMs = duracao * MINUTO
  const passoMs = granularidade * MINUTO
  // Alinha o piso a granularidade. Sem isso, um nao_antes_de de 17:35 gera 17:35, 18:05, 18:35 -
  // horarios quebrados que nao existem em nenhuma agenda e que o operador nao consegue comparar
  // com o relogio.
  // A grade vem do EXPEDIENTE, nao do epoch: alinhar por `Math.ceil(epoch/passo)` moveria o primeiro
  // horario de uma janela que comeca as 09:00, porque 09:00 nao e multiplo de 30min desde 1970.
  const abertura = consulta.janela.abre
  const bruto = Math.max(abertura, consulta.nao_antes_de ?? abertura)
  const piso = abertura + Math.ceil((bruto - abertura) / passoMs) * passoMs

  const impedimentos = [
    ...consulta.ocupados
      .filter(a => a.resource_id === consulta.resource_id && a.status !== 'cancelado')
      .map(a => ({ fim: a.ends_at, inicio: a.starts_at })),
    ...(consulta.bloqueios ?? [])
      .filter(b => b.resource_id === consulta.resource_id)
      .map(b => ({ fim: b.ends_at, inicio: b.starts_at }))
  ]

  const livres: Slot[] = []

  for (let inicio = piso; inicio + duracaoMs <= consulta.janela.fecha; inicio += passoMs) {
    const fim = inicio + duracaoMs
    const colide = impedimentos.some(i => inicio < i.fim && i.inicio < fim)

    if (!colide) livres.push({ ends_at: fim, starts_at: inicio })
  }

  return livres
}
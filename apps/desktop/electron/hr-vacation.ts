// Férias (rodada 135).
//
// POR QUE FÉRIAS PRIMEIRO
//
// A auditoria achou `ferias` uma vez em `hr-store.ts` — menção, não regra. Das lacunas do RH, é a que
// erra caro: férias concedida fora do prazo **dobra** o valor, e o 1/3 constitucional não é opcional.
//
// O QUE ESTE ARQUIVO NÃO FAZ
//
// Não calcula dinheiro. Não sabe salário, não sabe média de horas extras, não sabe abono. Calcula *quando* e
// *quantos dias* — que é a parte que a CLT define e que não muda por empresa.
//
// PERÍODO AQUISITIVO vs CONCESSIVO
//
//   aquisitivo   12 meses de trabalho que GERAM o direito
//   concessivo   12 meses seguintes, para o empregador dar as férias
//
// Vencido o concessivo sem gozo, o período está em dobro. Confundir os dois é o erro comum: achar que o
// direito "vence" no fim do aquisitivo, quando é ali que ele **nasce**.

const DIA = 86_400_000
// O concessivo se conta em MESES DE CALENDARIO, nao em 30 dias. 11 * 30 dias erra uma semana por ano - e
// errar o limite significa dizer que as ferias venceram quando ainda havia prazo.
function maisMeses(base: number, meses: number): number {
  const d = new Date(base)

  d.setUTCMonth(d.getUTCMonth() + meses)

  return d.getTime()
}

/** Faltas injustificadas reduzem os dias de férias (art. 130 da CLT). */
export const TABELA_FALTAS: readonly { ate: number; dias: number }[] = [
  { ate: 5, dias: 30 },
  { ate: 14, dias: 24 },
  { ate: 23, dias: 18 },
  { ate: 32, dias: 12 }
]

/** Acima de 32 faltas no período: perde o direito (art. 133). */
export const FALTAS_SEM_DIREITO = 32

export interface PeriodoAquisitivo {
  /** Fim do período aquisitivo (exclusivo). */
  fim: number
  /** Início (data de admissão, ou o fim do período anterior). */
  inicio: number
  /** Meses completos trabalhados no período. */
  meses: number
}

/**
 * Período aquisitivo que contém uma data.
 *
 * Conta em MESES de calendário, não em blocos de 30 dias: quem foi admitido em 31/01 completa o primeiro mês
 * em 28/02, não em 02/03. Blocos fixos de dias erram um dia a cada mês de 31 e, em 12 meses, erram 5 dias.
 */
export function periodoAquisitivo(admissao: number, referencia: number): PeriodoAquisitivo {
  const inicio = new Date(admissao)
  const ref = new Date(referencia)

  let meses =
    (ref.getUTCFullYear() - inicio.getUTCFullYear()) * 12 + (ref.getUTCMonth() - inicio.getUTCMonth())

  // Se o dia da referência ainda não chegou no mês, o mês corrente não conta — EXCETO quando a referência é o
  // último dia do mês e a admissão foi num dia que ele não tem. Quem foi admitido em 31/01 completa o mês em
  // 28/02; exigir o dia 31 faria o empregado perder um mês inteiro em ano não bissexto.
  const ultimoDiaDoMes = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0)).getUTCDate()
  const fimDeMesCurto = ref.getUTCDate() === ultimoDiaDoMes && inicio.getUTCDate() > ultimoDiaDoMes

  if (ref.getUTCDate() < inicio.getUTCDate() && !fimDeMesCurto) meses--

  const completos = Math.max(0, meses)
  const ciclos = Math.floor(completos / 12)
  const inicioCiclo = new Date(inicio)

  inicioCiclo.setUTCMonth(inicioCiclo.getUTCMonth() + ciclos * 12)

  const fimCiclo = new Date(inicioCiclo)

  fimCiclo.setUTCMonth(fimCiclo.getUTCMonth() + 12)

  return {
    fim: fimCiclo.getTime(),
    inicio: inicioCiclo.getTime(),
    meses: completos % 12
  }
}

/**
 * Dias de férias a que o empregado tem direito.
 *
 * Antes de 12 meses completos, o direito é PROPORCIONAL (1/12 por mês). Depois, 30 dias — reduzidos por
 * faltas, se houver.
 *
 * O resultado é em dias inteiros: a CLT não conhece meio dia de férias, e arredondar para cima dá ao
 * empregado um dia que a lei não concede.
 */
export function diasDeFerias(meses: number, faltasInjustificadas = 0): number {
  if (faltasInjustificadas > FALTAS_SEM_DIREITO) return 0

  const mesesValidos = Math.min(12, Math.max(0, Math.floor(meses)))
  const base = mesesValidos < 12 ? Math.floor((30 * mesesValidos) / 12) : 30

  const faixa = TABELA_FALTAS.find(f => faltasInjustificadas <= f.ate)

  if (!faixa) return 0

  // A redução por faltas só se aplica ao direito já integral; proporcional usa a mesma proporção.
  return mesesValidos < 12 ? Math.floor((faixa.dias * mesesValidos) / 12) : faixa.dias
}

/** Terço constitucional, em centavos. `Math.floor` porque o empregador não arredonda contra si. */
export function tercoConstitucional(valorCents: number): number {
  if (!Number.isFinite(valorCents) || valorCents <= 0) return 0

  return Math.floor(valorCents / 3)
}

export type SituacaoFerias = 'a_vencer' | 'disponivel' | 'vencida' | 'sem_direito'

export interface FeriasSituacao {
  /** Dias adquiridos no período aquisitivo atual. */
  dias: number
  /** Último dia para conceder sem dobrar. */
  limite_concessivo: number
  situacao: SituacaoFerias
}

/**
 * Situação das férias na data de referência.
 *
 * `vencida` é o estado que custa dinheiro: o período concessivo passou sem gozo e o valor dobra.
 */
export function situacaoFerias(
  admissao: number,
  referencia: number,
  faltasInjustificadas = 0,
  /**
   * Fim do último período aquisitivo já GOZADO. Sem ele é impossível afirmar `vencida`: os ciclos continuam
   * rolando e o "último que fechou" sempre tem concessivo à frente. Uma função que adivinha aqui produziria
   * alerta de férias em dobro em quem está em dia — e o operador pararia de confiar no alerta.
   */
  ultimoGozo?: number
): FeriasSituacao {
  const atual = periodoAquisitivo(admissao, referencia)

  // Primeiro período em formação: o direito ainda está sendo adquirido.
  if (atual.inicio === admissao && atual.meses < 12) {
    return {
      dias: diasDeFerias(atual.meses, faltasInjustificadas),
      limite_concessivo: maisMeses(atual.fim, 11),
      situacao: 'a_vencer'
    }
  }

  // Período pendente: começa onde o último gozo terminou, ou na admissão se nunca houve gozo.
  const inicioPendente = ultimoGozo ?? admissao
  const fimPendente = maisMeses(inicioPendente, 12)
  const limite = maisMeses(fimPendente, 11)
  const dias = diasDeFerias(12, faltasInjustificadas)

  if (dias === 0) return { dias: 0, limite_concessivo: limite, situacao: 'sem_direito' }

  return {
    dias,
    limite_concessivo: limite,
    situacao: referencia > limite ? 'vencida' : 'disponivel'
  }
}
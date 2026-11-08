// Conciliação bancária (rodada 115).
//
// O VALOR ESTÁ NO QUE NÃO BATE
//
// Conciliar não é marcar carimbos verdes: é encontrar a diferença. Um relatório que mostra "847 conciliados"
// e esconde 3 pendentes é pior que nenhum, porque cria confiança sem ter verificado nada. Por isso o
// resultado sempre traz os DOIS lados que sobraram — no extrato e no sistema.
//
// O QUE É UM PAR
//
// Mesmo valor, mesma direção (entrada/saída) e data dentro de uma janela. A janela existe porque o banco
// lança em D+1 com frequência: exigir a mesma data recusaria conciliações corretas.
//
// CADA LANÇAMENTO CASA UMA VEZ
//
// Dois lançamentos de R$ 100 no sistema e uma linha de R$ 100 no extrato: casa um, o outro fica pendente.
// Sem essa regra, a mesma linha do extrato "conciliaria" dois lançamentos e o total fecharia por acidente.

export type Direcao = 'entrada' | 'saida'

/** Uma linha do extrato bancário, como veio do banco. */
export interface ExtratoItem {
  /** Identificador do banco; opaco para nós. */
  id: string
  valor_cents: number
  /** Verdadeiro quando o dinheiro entrou na conta. */
  entrada: boolean
  /** Data do lançamento no banco (epoch ms). */
  data: number
  descricao: string
}

/** O mínimo que a conciliação precisa de um lançamento do sistema. */
export interface LancamentoConciliável {
  id: string
  amount_cents: number
  /** Receber é entrada; pagar é saída. */
  kind: string
  due_at: number
  description: string
}

export interface ParConciliado {
  extrato: ExtratoItem
  lancamento: LancamentoConciliável
  /** Diferença de dias entre a data do banco e o vencimento. Exposta para o operador ver o atraso. */
  dias_de_diferenca: number
}

export interface ResultadoConciliacao {
  conciliados: ParConciliado[]
  /** Linhas que o banco mostra e o sistema não tem. */
  so_no_extrato: ExtratoItem[]
  /** Lançamentos que o sistema tem e o banco não mostra. */
  so_no_sistema: LancamentoConciliável[]
}

/** Janela padrão: 3 dias, porque D+1 é comum e fim de semana alonga. */
export const JANELA_PADRAO_DIAS = 3

const DIA_MS = 86_400_000

function direcaoDoLancamento(kind: string): Direcao {
  return kind === 'receber' ? 'entrada' : 'saida'
}

/**
 * Casa extrato com lançamentos.
 *
 * Ordena por data antes de casar: com dois candidatos do mesmo valor na janela, o mais próximo no tempo é o
 * par mais provável. Sem ordenar, a escolha dependeria da ordem do arquivo.
 */
export function conciliar(
  extrato: readonly ExtratoItem[],
  lancamentos: readonly LancamentoConciliável[],
  janelaDias: number = JANELA_PADRAO_DIAS
): ResultadoConciliacao {
  const janelaMs = Math.max(0, janelaDias) * DIA_MS
  const usados = new Set<string>()
  const conciliados: ParConciliado[] = []
  const soNoExtrato: ExtratoItem[] = []

  const candidatos = [...lancamentos].sort((a, b) => a.due_at - b.due_at)

  for (const linha of [...extrato].sort((a, b) => a.data - b.data)) {
    const direcao: Direcao = linha.entrada ? 'entrada' : 'saida'

    let melhor: LancamentoConciliável | null = null
    let melhorDistancia = Number.POSITIVE_INFINITY

    for (const lancamento of candidatos) {
      if (usados.has(lancamento.id)) continue
      if (lancamento.amount_cents !== linha.valor_cents) continue
      if (direcaoDoLancamento(lancamento.kind) !== direcao) continue

      const distancia = Math.abs(lancamento.due_at - linha.data)

      if (distancia > janelaMs) continue

      // Mais próximo no tempo vence; empate fica com o primeiro na ordem estável por data.
      if (distancia < melhorDistancia) {
        melhor = lancamento
        melhorDistancia = distancia
      }
    }

    if (melhor) {
      usados.add(melhor.id)
      conciliados.push({
        dias_de_diferenca: Math.round((linha.data - melhor.due_at) / DIA_MS),
        extrato: linha,
        lancamento: melhor
      })
    } else {
      soNoExtrato.push(linha)
    }
  }

  return {
    conciliados,
    so_no_extrato: soNoExtrato,
    so_no_sistema: candidatos.filter(l => !usados.has(l.id))
  }
}

/**
 * Resumo legível.
 *
 * `pendente_cents` soma os dois lados que sobraram, em módulo: é o quanto de dinheiro está sem
 * justificativa — não importa de que lado veio.
 */
export interface ResumoConciliacao {
  conciliados: number
  pendente_cents: number
  so_no_extrato: number
  so_no_sistema: number
}

export function resumoConciliacao(resultado: ResultadoConciliacao): ResumoConciliacao {
  const doExtrato = resultado.so_no_extrato.reduce((s, i) => s + i.valor_cents, 0)
  const doSistema = resultado.so_no_sistema.reduce((s, i) => s + i.amount_cents, 0)

  return {
    conciliados: resultado.conciliados.length,
    pendente_cents: doExtrato + doSistema,
    so_no_extrato: resultado.so_no_extrato.length,
    so_no_sistema: resultado.so_no_sistema.length
  }
}

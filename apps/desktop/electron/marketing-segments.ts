// Segmentação de clientes para campanha (rodada 136).
//
// POR QUE SEGMENTAÇÃO É DOMÍNIO E NÃO FILTRO DE TELA
//
// "Quem não compra há 90 dias?" precisa da MESMA resposta em três lugares: a lista da campanha, a mensagem
// que o agente prepara e o relatório de resultado. Três filtros de tela divergem; uma função só não.
//
// O QUE ELA NÃO FAZ
//
// Não lê o banco. Recebe o RESUMO de cada cliente (quantas compras, quanto, quando foi a última). Montar esse
// resumo é trabalho da venda; decidir quem entra no segmento é trabalho daqui. Misturar os dois faria a
// segmentação depender do formato de `Sale` — e mudaria toda vez que a venda mudasse.
//
// AUSÊNCIA NÃO É ZERO — DE NOVO
//
// Cliente sem compra tem `ultima_compra: null`, não `0`. `0` seria 1970 e faria todo cliente sem compra
// aparecer como "inativo há 20 mil dias" — tecnicamente verdade, praticamente inútil, e esconderia o caso
// que a campanha realmente quer: o cliente que NUNCA comprou.

const DIA = 86_400_000

/** O que a segmentação precisa saber de cada cliente. */
export interface ClienteResumo {
  /** `null` quando nunca comprou. */
  compras: number
  /** Telefone normalizado. É a chave do CRM desde a r80. */
  telefone: string
  tags?: readonly string[]
  /** Em centavos. `0` é legítimo: comprou e gastou zero (brinde, troca). */
  total_cents: number
  /** `null` quando nunca comprou — NÃO zero. */
  ultima_compra: number | null
}

export const CRITERIOS = ['inativo_dias', 'nunca_comprou', 'tag', 'valor_minimo'] as const

export type CriterioKind = (typeof CRITERIOS)[number]

export interface Criterio {
  kind: CriterioKind
  /** `inativo_dias`: dias sem comprar. `valor_minimo`: centavos. `tag`: o nome. Ignorado nos outros. */
  valor?: number | string
}

export interface Segmento {
  /** Relação de critérios. Vazio = todos os clientes. */
  criterios: readonly Criterio[]
  nome: string
}

/**
 * Um cliente pertence ao segmento quando satisfaz TODOS os critérios.
 *
 * Conjunção (E), não disjunção: "inativo há 90 dias E gastou mais de R$ 500" é o que a campanha quer. Com
 * OU, o segmento cresceria até "quase todos" e a campanha perderia o foco — e o operador não veria isso na
 * contagem.
 */
export function pertenceAo(cliente: ClienteResumo, criterios: readonly Criterio[], agora: number): boolean {
  return criterios.every(criterio => {
    switch (criterio.kind) {
      case 'nunca_comprou':
        return cliente.ultima_compra === null

      case 'inativo_dias': {
        // Quem nunca comprou não é "inativo": é outro segmento. Misturar os dois faria a campanha de
        // reativação mandar mensagem para quem nunca foi cliente.
        if (cliente.ultima_compra === null) return false

        const dias = typeof criterio.valor === 'number' ? criterio.valor : 0

        return (agora - cliente.ultima_compra) / DIA >= dias
      }

      case 'tag':
        return (cliente.tags ?? []).includes(String(criterio.valor ?? ''))

      case 'valor_minimo':
        return cliente.total_cents >= (typeof criterio.valor === 'number' ? criterio.valor : 0)

      default:
        return false
    }
  })
}

/** Clientes do segmento, ordenados do maior gasto para o menor. */
export function clientesDoSegmento(
  clientes: readonly ClienteResumo[],
  segmento: Segmento,
  agora: number
): ClienteResumo[] {
  return clientes
    .filter(c => pertenceAo(c, segmento.criterios, agora))
    .sort((a, b) => b.total_cents - a.total_cents)
}

export interface Composicao {
  /** Quantos clientes o segmento tem. */
  total: number
  /** Quanto o segmento já gastou, somado. */
  total_cents: number
  /** Quantos nunca compraram — a parte do segmento que campanha de venda não pode tratar igual. */
  nunca_compraram: number
}

/**
 * Retrato do segmento antes de disparar a campanha.
 *
 * `nunca_compraram` existe porque um segmento de 500 clientes com 400 que nunca compraram não é "500 clientes
 * para reativar": é 100 para reativar e 400 para converter. A distinção muda a mensagem.
 */
export function composicao(
  clientes: readonly ClienteResumo[],
  segmento: Segmento,
  agora: number
): Composicao {
  const doSegmento = clientesDoSegmento(clientes, segmento, agora)

  return {
    nunca_compraram: doSegmento.filter(c => c.ultima_compra === null).length,
    total: doSegmento.length,
    total_cents: doSegmento.reduce((soma, c) => soma + c.total_cents, 0)
  }
}

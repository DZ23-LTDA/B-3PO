// Movimento de caixa: sangria e suprimento (rodada 120).
//
// O QUE FALTAVA PARA A GAVETA FECHAR
//
// O fechamento da r117 soma as vendas por forma de pagamento. Mas o dinheiro na gaveta não é só venda:
//
//   suprimento  troco que o operador coloca no início do turno
//   sangria     dinheiro retirado (depósito, segurança, pagamento de despesa)
//
// Sem esses dois, o operador conta a gaveta, compara com o sistema e a diferença aparece — e ele não sabe se
// errou a contagem ou se esqueceu de registrar a retirada.
//
// O SINAL É O PONTO
//
// Suprimento SOMA, sangria SUBTRAI. Guardar os dois como "movimento" e tratar o sinal no cálculo é o que
// permite auditar: o histórico mostra o que aconteceu, não o efeito já aplicado.

import type { PaymentMethod, Sale } from './sales-store'

export const MOVIMENTO_KINDS = ['sangria', 'suprimento'] as const

export type MovimentoKind = (typeof MOVIMENTO_KINDS)[number]

export function isMovimentoKind(value: unknown): value is MovimentoKind {
  return typeof value === 'string' && (MOVIMENTO_KINDS as readonly string[]).includes(value)
}

export interface MovimentoCaixa {
  /** Em centavos, sempre positivo. O sinal vem de `kind`. */
  amount_cents: number
  created_at: number
  id: string
  kind: MovimentoKind
  /** Por que o dinheiro entrou ou saiu. Sangria sem motivo é dinheiro desaparecido. */
  motivo: string
  tenant_id: string
}

/** Só dinheiro em espécie afeta a gaveta. PIX e cartão não estão nela. */
const NA_GAVETA: ReadonlySet<PaymentMethod> = new Set<PaymentMethod>(['dinheiro'])

export interface SaldoGaveta {
  /** Vendas em dinheiro no período. */
  dinheiro_vendas_cents: number
  /** Quanto deveria haver na gaveta: vendas + suprimentos - sangrias. */
  esperado_cents: number
  /** Movimentos que tocaram a gaveta no período. */
  movimentos: number
  sangrias_cents: number
  suprimentos_cents: number
  /**
   * Vendas faturadas sem forma de pagamento dentro do período.
   *
   * Não entram no esperado — não se sabe se foram em dinheiro. Mas o número aparece: se for alto, o
   * "esperado" está subestimado e o operador precisa saber disso antes de culpar a contagem.
   */
  vendas_sem_forma: number
}

/**
 * Saldo esperado da gaveta.
 *
 * O período recorta por `created_at` nos dois lados: uma sangria de ontem não pertence ao fechamento de
 * hoje, mesmo que tenha sido digitada agora.
 */
export function saldoDaGaveta(
  vendas: readonly Sale[],
  movimentos: readonly MovimentoCaixa[],
  periodo: { de: number; ate: number }
): SaldoGaveta {
  let dinheiroVendas = 0
  let semForma = 0

  for (const venda of vendas) {
    if (venda.status !== 'faturado') continue
    if (venda.created_at < periodo.de || venda.created_at > periodo.ate) continue

    if (!venda.payment_method) {
      semForma++
      continue
    }

    if (NA_GAVETA.has(venda.payment_method)) dinheiroVendas += venda.total_cents
  }

  let sangrias = 0
  let suprimentos = 0
  let contados = 0

  for (const movimento of movimentos) {
    if (movimento.created_at < periodo.de || movimento.created_at > periodo.ate) continue

    contados++

    if (movimento.kind === 'sangria') sangrias += movimento.amount_cents
    else suprimentos += movimento.amount_cents
  }

  return {
    dinheiro_vendas_cents: dinheiroVendas,
    esperado_cents: dinheiroVendas + suprimentos - sangrias,
    movimentos: contados,
    sangrias_cents: sangrias,
    suprimentos_cents: suprimentos,
    vendas_sem_forma: semForma
  }
}

export interface Conferencia {
  /** Diferença entre o contado e o esperado. Negativo = falta dinheiro. */
  diferenca_cents: number
  /** `true` quando bate exatamente. */
  fecha: boolean
  /** `sobra`, `falta` ou `exato` — o rótulo que a tela mostra. */
  situacao: 'exato' | 'falta' | 'sobra'
}

/**
 * Confronta o que o operador contou com o que o sistema espera.
 *
 * A diferença é `contado - esperado`: positiva é sobra, negativa é falta. Devolver o sinal em vez do módulo
 * é o que permite a tela dizer "faltam R$ 20" em vez de "diferença de R$ 20".
 */
export function conferirGaveta(contadoCents: number, esperadoCents: number): Conferencia {
  const diferenca = Math.round(contadoCents) - Math.round(esperadoCents)

  return {
    diferenca_cents: diferenca,
    fecha: diferenca === 0,
    situacao: diferenca === 0 ? 'exato' : diferenca > 0 ? 'sobra' : 'falta'
  }
}

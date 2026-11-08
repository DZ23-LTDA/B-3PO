// Reconciliação do recebimento de compra (r38 do GOAL V2).
//
// O RISCO QUE ELE TORNA VISÍVEL
//
// O §14 diz: *"Se arquivos por domínio não permitem transação atômica entre domínios, projetar
// saga/outbox/reconciliação e explicitar risco."*
//
// O recebimento grava em TRÊS domínios, em sequência, sem transação:
//
//   1. `saveOrder(status: 'recebido')`   — o pedido é marcado como recebido
//   2. `inventory.append(...)`           — o estoque entra
//   3. `finance.append(...)`             — a conta a pagar nasce
//
// Se o passo 2 falhar, o código **retorna o erro** — mas o passo 1 **já foi gravado**. O pedido diz
// "recebido", o estoque está vazio, e a tela não oferece receber de novo (o pedido não está mais em
// `pedido`).
//
// Se o passo 3 falhar, o estoque entrou e a conta a pagar não existe: mercadoria no depósito **sem
// passivo registrado**.
//
// O QUE ESTE MÓDULO FAZ, E O QUE NÃO FAZ
//
// **Não conserta com transação** — não há transação entre arquivos JSON de domínios diferentes, e
// inventar uma seria mentir sobre a garantia. O que ele faz é **encontrar os pedidos cuja trilha está
// incompleta**, para que alguém decida o que fazer.
//
// **Não grava nada.** É leitura pura: uma reconciliação que escreve sozinha vira um segundo caminho de
// escrita com as mesmas garantias que o primeiro, e o dobro de estado para divergir.
//
// **Não chuta o que aconteceu.** `ref_duplicado` significa "já estava lá" — e é sucesso, não falha. A
// diferença entre "entrou agora" e "já tinha entrado" não muda o que o pedido tem.

import type { FinanceEntry } from './finance-store'
import type { PurchaseOrder } from './purchases-store'
import { refCompra, refCompraItem } from './refs'

/** O que se sabe sobre um domínio para um pedido. `null` = a consulta não respondeu. */
export type Presenca = 'ausente' | 'presente'

export type AchadoReconciliacao =
  | { tipo: 'estoque_ausente'; pedido: string }
  | { tipo: 'financeiro_ausente'; pedido: string }
  | { tipo: 'valor_divergente'; financeiro_cents: number; pedido: string; pedido_cents: number }

/**
 * Compara o que o pedido diz com o que os outros domínios têm.
 *
 * Recebe as listas **já carregadas**: quem chama sabe como buscá-las, e este módulo não decide se o
 * estoque vem do ledger inteiro ou de uma janela. Uma função que busca por conta própria esconderia
 * uma leitura cara dentro de um laço.
 */
export function reconciliarPedidos(input: {
  financeiro: readonly FinanceEntry[]
  /** `ref` de cada movimento de estoque existente. */
  refsEstoque: readonly string[]
  pedidos: readonly PurchaseOrder[]
}): AchadoReconciliacao[] {
  const achados: AchadoReconciliacao[] = []
  const refs = new Set(input.refsEstoque)

  for (const pedido of input.pedidos) {
    // Só pedido RECEBIDO deveria ter estoque e financeiro. Um rascunho não deve nada a ninguém, e
    // cobrar dele encheria o relatório de ruído até ninguém ler.
    if (pedido.status !== 'recebido') continue

    // A entrada de estoque depende de ter itens com quantidade. Um pedido recebido sem itens não tem o
    // que entrar, e isso é raro a ponto de merecer ser dito em vez de silenciado — mas não é o caso
    // comum, então a checagem só roda quando há item.
    const temItens = pedido.items.some(item => item.quantity_milli > 0 && item.product_sku)

    if (temItens) {
      const faltando = pedido.items
        .filter(item => item.quantity_milli > 0 && item.product_sku)
        .some(item => !refs.has(refCompraItem(pedido.id, item.product_sku)))

      if (faltando) achados.push({ pedido: pedido.id, tipo: 'estoque_ausente' })
    }

    const conta = input.financeiro.find(e => e.ref === refCompra(pedido.id))

    if (!conta) {
      achados.push({ pedido: pedido.id, tipo: 'financeiro_ausente' })
    } else if (typeof conta.amount_cents === 'number' && conta.amount_cents !== pedido.total_cents) {
      // Valor diferente não é necessariamente erro (frete, desconto), mas é sempre algo que alguém
      // precisa olhar — e um relatório que omite a diferença não serve para achar fraude.
      achados.push({
        financeiro_cents: conta.amount_cents,
        pedido: pedido.id,
        pedido_cents: pedido.total_cents,
        tipo: 'valor_divergente'
      })
    }
  }

  return achados
}

/**
 * O resumo, em linguagem que quem lê entende.
 *
 * Uma lista de códigos obriga a tradução mental; um texto com contagem permite decidir em dois
 * segundos se vale abrir o detalhe.
 */
export function resumoDaReconciliacao(achados: readonly AchadoReconciliacao[]): string {
  if (achados.length === 0) return 'Nenhuma inconsistência encontrada nos pedidos recebidos.'

  const porTipo = new Map<string, number>()

  for (const a of achados) porTipo.set(a.tipo, (porTipo.get(a.tipo) ?? 0) + 1)

  const partes: string[] = []

  for (const [tipo, n] of porTipo) {
    const rotulo =
      tipo === 'estoque_ausente'
        ? 'pedido(s) recebido(s) sem entrada no estoque'
        : tipo === 'financeiro_ausente'
          ? 'pedido(s) recebido(s) sem conta a pagar'
          : 'pedido(s) com valor diferente da conta a pagar'

    partes.push(`${n} ${rotulo}`)
  }

  return partes.join('; ') + '.'
}

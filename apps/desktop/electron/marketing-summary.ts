// Resumo de cliente para segmentação (rodada 137).
//
// FECHA A CADEIA
//
// A r136 fez o segmento funcionar recebendo um resumo pronto. Faltava quem monta esse resumo a partir das
// vendas. Sem ele, a segmentação existia e ninguém conseguia usá-la.
//
// A REGRA QUE DECIDE TUDO: SÓ VENDA FATURADA CONTA
//
// É o mesmo critério da conta a receber, da baixa de estoque e da comissão. Um cliente com três orçamentos e
// nenhuma venda não "comprou três vezes" — e colocá-lo no segmento de reativação criaria uma campanha para
// quem nunca foi cliente.
//
// CLIENTE SEM VENDA ENTRA NA LISTA
//
// Quem está no CRM e nunca comprou aparece com `compras: 0` e `ultima_compra: null`. Ele é justamente o
// público de conversão. Deixá-lo de fora esconderia metade de qualquer segmento que o marketing queira montar.

import type { Sale } from './sales-store'
import type { ClienteResumo } from './marketing-segments'

/** O mínimo que o resumo precisa do contato do CRM. */
export interface ContatoResumo {
  tags?: readonly string[]
  telefone: string
}

/**
 * Um resumo por telefone.
 *
 * A chave é o telefone porque é a chave do CRM desde a r80 — e porque a mesma pessoa pode comprar várias
 * vezes sem se identificar. Venda sem telefone (balcão anônimo) não entra em resumo de cliente: não há a quem
 * atribuir.
 */
export function resumoDeClientes(
  vendas: readonly Sale[],
  contatos: readonly ContatoResumo[] = []
): ClienteResumo[] {
  const porTelefone = new Map<string, { compras: number; total: number; ultima: number | null }>()

  for (const venda of vendas) {
    if (venda.status !== 'faturado') continue

    const telefone = (venda.contact_phone ?? '').trim()

    if (!telefone) continue

    const atual = porTelefone.get(telefone) ?? { compras: 0, total: 0, ultima: null }

    atual.compras++
    atual.total += venda.total_cents
    // `max`, não "a última do array": a ordem do arquivo não é garantia de ordem cronológica.
    atual.ultima = atual.ultima === null ? venda.created_at : Math.max(atual.ultima, venda.created_at)

    porTelefone.set(telefone, atual)
  }

  // Contatos do CRM que nunca compraram também entram: são o público de conversão.
  for (const contato of contatos) {
    const telefone = (contato.telefone ?? '').trim()

    if (!telefone || porTelefone.has(telefone)) continue

    porTelefone.set(telefone, { compras: 0, total: 0, ultima: null })
  }

  const tagsPorTelefone = new Map<string, readonly string[]>()

  for (const contato of contatos) {
    const telefone = (contato.telefone ?? '').trim()

    if (telefone && contato.tags?.length) tagsPorTelefone.set(telefone, contato.tags)
  }

  return [...porTelefone.entries()].map(([telefone, dados]) => ({
    compras: dados.compras,
    tags: tagsPorTelefone.get(telefone) ?? [],
    telefone,
    total_cents: dados.total,
    ultima_compra: dados.ultima
  }))
}

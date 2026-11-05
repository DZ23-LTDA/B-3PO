// A LIGACAO ATENDIMENTO -> POS-VENDA (r151 do GOAL V2).
//
// A NECESSIDADE COMPROVADA
//
//   o `Ticket` tem `satisfaction` (1 a 5) e `status` (resolvido/fechado)
//   o `FollowUp` tem `kind: 'satisfacao'`, com prazo de 2 dias
//   `after-sales-store` escreve o ciclo em COMENTARIO ("venda -> entrega -> atendimento -> pos-venda")
//   E AS DUAS PONTAS NAO SE CONHECEM: `service-desk-store` tem ZERO referencias a pos-venda
//
// O efeito: **o cliente da nota 1 ou 2, o ticket fecha, e ninguem o procura**. O pos-venda existe, tem o tipo
// certo (`satisfacao`, 2 dias) e **nunca e criado por causa de uma reclamacao**.
//
// A LICAO DAS LIGACOES 5, 6 E 7 - aplicada antes de escrever
//
// A r134, a r141 e a r146 descobriram na montagem que o tipo real nao tinha os campos que a funcao pura pedia. E a
// r147 descobriu que o `upsert` com `null` apagava o campo da outra ligacao.
//
// Aqui a medicao veio primeiro, e ela achou **um campo que existe**: o `sale_at` do FollowUp e a base do prazo, e o
// ticket tem `closed_at` - **a data em que o atendimento terminou e a data que a satisfacao mede**. Usar `sale_at`
// com a data do ticket seria mentir sobre o que o prazo significa.
//
// AS TRES DECISOES
//
// 1. **So satisfacao BAIXA (<= 2) abre follow-up.** Nota 5 e um cliente satisfeito, e procura-lo e ruido; nota 3
//    e neutra, e o proprio atendimento ja pode ter resolvido. **O corte e 2 porque o `service-desk-store` ja
//    define que <= 2 escala para humano** - a mesma linha, usada de novo em vez de inventada.
//
// 2. **Sem telefone nao cria.** Um follow-up sem contato e uma tarefa que ninguem executa.
//
// 3. **O `ref` e o TICKET, nao a venda.** A r146 descobriu que `ref` e a chave de idempotencia do follow-up; usar
//    `venda:<id>` faria uma reclamacao de uma venda que ja tem follow-up de recompra **colidir com ele** e nao
//    criar nada. `ticket:<id>` e a origem certa.

/** O que o ticket resolvido diz ao pos-venda. */
export interface TicketResolvido {
  contact_phone?: null | string
  /** Quando o atendimento terminou. **E a base do prazo**, nao a data da venda. */
  closed_at?: null | number
  satisfaction?: null | number
  tenant_id: string
  ticket_id: string
}

export type IntencaoDePosVenda =
  | { tipo: 'nada'; motivo: 'sem_telefone' | 'satisfacao_boa' | 'sem_satisfacao' }
  | { tipo: 'criar'; contact_phone: string; kind: 'satisfacao'; nota: number; ref: string; baseEm: number }

/**
 * O corte da satisfacao.
 *
 * **2 e o mesmo numero que o `service-desk-store` usa para "escala para humano"** — e o reaproveitamento e de
 * proposito: duas regras com cortes diferentes para a mesma pergunta fariam o produto discordar de si mesmo.
 */
export const SATISFACAO_BAIXA_MAX = 2

export function intencaoDePosVenda(ticket: TicketResolvido): IntencaoDePosVenda {
  if (typeof ticket.satisfaction !== 'number') return { motivo: 'sem_satisfacao', tipo: 'nada' }

  if (ticket.satisfaction > SATISFACAO_BAIXA_MAX) return { motivo: 'satisfacao_boa', tipo: 'nada' }

  const telefone = typeof ticket.contact_phone === 'string' ? ticket.contact_phone.replace(/\D/g, '') : ''

  if (telefone.length < 8) return { motivo: 'sem_telefone', tipo: 'nada' }

  return {
    baseEm: typeof ticket.closed_at === 'number' ? ticket.closed_at : Date.now(),
    contact_phone: telefone,
    kind: 'satisfacao',
    nota: ticket.satisfaction,
    // O `ref` e o TICKET: uma reclamacao nao colide com o follow-up de recompra da mesma venda.
    ref: `ticket:${ticket.ticket_id}`,
    tipo: 'criar'
  }
}

/**
 * A nota que a tela do pos-venda mostra.
 *
 * **Existe para o follow-up dizer POR QUE foi criado.** Um `satisfacao` sem a nota obriga o atendente a abrir o
 * ticket para descobrir se foi 1 ou 2 — e a diferenca muda a abordagem.
 */
export function notaDoFollowUp(intencao: Extract<IntencaoDePosVenda, { tipo: 'criar' }>): string {
  return intencao.nota <= 1
    ? 'O cliente deu nota 1. Ligar hoje: alguem insatisfeito que nao e procurado nao volta.'
    : 'O cliente deu nota 2. Ligar hoje: a reclamacao foi resolvida no papel, nao necessariamente na pratica.'
}

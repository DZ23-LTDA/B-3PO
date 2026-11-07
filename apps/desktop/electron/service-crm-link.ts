// A LIGACAO ATENDIMENTO -> CRM (r146 do GOAL V2).
//
// A NECESSIDADE COMPROVADA
//
//   o `Ticket` TEM `contact_phone` (o telefone de quem reclamou)
//   `service-desk-store` / `service-desk-ipc`: ZERO referencias a CRM
//   `crm-contacts-store`: tem `upsert` com a chave `(phone, tenant_id)`
//
// O efeito: **o cliente reclama, o ticket fica registrado com o telefone dele, e a ficha dele no CRM nao mostra
// que ele reclamou**. Quem abre o contato ve so a ultima compra — e nao ve que houve tres chamados no mes.
//
// A LICAO DAS LIGACOES ANTERIORES, APLICADA ANTES DE ESCREVER
//
// A r134 e a r141 descobriram na MONTAGEM que o tipo real nao tinha os campos que a funcao pura pedia. Aqui a
// medicao veio primeiro: **`Ticket` tem `contact_phone`, `subject`, `priority`, `status`, `satisfaction` e
// `opened_at`** — e nao tem nome. A funcao pura usa **so o que existe**.
//
// AS TRES DECISOES
//
// 1. **Sem telefone, nao cria contato.** Um ticket sem telefone nao identifica ninguem; criar um contato vazio
//    faria a proxima reclamacao do mesmo numero cair nele.
//
// 2. **O CRM nao ganha um nome inventado.** O `CrmContact` exige `name` (r134 descobriu), e o ticket nao tem
//    nome. Entao o contato nasce com **`Cliente do atendimento`** — e a tela de contatos pode mostrar que o nome
//    veio dai, em vez de parecer confirmado.
//
// 3. **O que o CRM aprende e o FATO, nao o julgamento.** `last_ticket_at` e `last_ticket_id`: quando foi o
//    ultimo chamado e qual. Uma contagem de reclamacoes seria uma opiniao; a data e um fato.

/** O que o ticket diz ao CRM. So os campos que o `Ticket` tem. */
export interface TicketParaCrm {
  contact_phone?: null | string
  opened_at: number
  tenant_id: string
  ticket_id: string
}

export type IntencaoParaContato =
  | { tipo: 'nada'; motivo: 'sem_telefone' }
  | {
      tipo: 'registrar'
      telefone: string
      nomeSugerido: string
      ultimoTicketEm: number
      ticketId: string
    }

/**
 * Normaliza o telefone para a chave do CRM.
 *
 * **A mesma regra da venda (r133), repetida de proposito**: se as duas ligacoes normalizassem diferente, o mesmo
 * cliente viraria dois contatos dependendo de quem o criou primeiro.
 */
export function telefoneDoContato(bruto: unknown): null | string {
  if (typeof bruto !== 'string') return null

  const digitos = bruto.replace(/\D/g, '')

  if (digitos.length < 8) return null

  return digitos
}

/**
 * Decide o que registrar no CRM quando um ticket abre.
 */
export function intencaoParaContato(ticket: TicketParaCrm): IntencaoParaContato {
  const telefone = telefoneDoContato(ticket.contact_phone)

  if (!telefone) return { motivo: 'sem_telefone', tipo: 'nada' }

  return {
    nomeSugerido: 'Cliente do atendimento',
    telefone,
    ticketId: ticket.ticket_id,
    tipo: 'registrar',
    ultimoTicketEm: ticket.opened_at
  }
}

/**
 * O patch que o atendimento aplica ao contato.
 *
 * **Nao inclui `name`**: se o contato ja existe com um nome confirmado, o atendimento nao o troca. O chamador
 * passa o nome do contato existente quando houver — como a venda faz desde a r134.
 *
 * **`last_purchase_*` nao esta aqui**: o atendimento nao sabe de compras. Cada ligacao escreve o seu campo.
 */
export function patchDoContatoPorAtendimento(
  intencao: Extract<IntencaoParaContato, { tipo: 'registrar' }>
): { last_ticket_at: number; last_ticket_id: string } {
  return { last_ticket_at: intencao.ultimoTicketEm, last_ticket_id: intencao.ticketId }
}

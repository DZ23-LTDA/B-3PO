// A LIGACAO ENTREGA -> ATENDIMENTO (r140/r141 do GOAL V2).
//
// A NECESSIDADE COMPROVADA (r140)
//
//   ENTREGA_STATUS = ['pendente','em_rota','entregue','recusada']
//   delivery-store / delivery-ipc: ZERO referencias a ticket
//   service-desk-store: zero referencias a entrega (so um comentario)
//
// O cliente recusa o bujao na porta - e ninguem abre um ticket. A entrega fica `recusada` e o atendimento nao
// sabe; na segunda tentativa, o mesmo endereco, a mesma recusa.
//
// O QUE A r141 DESCOBRIU - e por que a forma mudou
//
// A primeira versao desta ligacao pedia `contact_phone`, `motivo` e `total_cents`. **A `Entrega` nao tem NENHUM
// dos tres.** Ela carrega `id`, `order_id`, `destino`, `status`, `entregador` e `comprovante`.
//
// O telefone e o valor estao na VENDA, apontada por `order_id`. Entao o ticket nasce **com o pedido** e o
// atendente abre a venda - em vez de a ligacao inventar campos que o produto nao tem.
//
// AS TRES DECISOES
//
// 1. **So `recusada` abre ticket.** `pendente`, `em_rota` e `entregue` sao o caminho normal.
//
// 2. **A prioridade NAO vem do valor** - ela nao pode, porque a entrega nao tem valor. Vem do **destino
//    conhecido**: uma recusa com endereco e reagendavel; uma sem endereco precisa de uma ligacao antes.
//    **E a prioridade e o que a entrega sabe**, nao o que ela gostaria de saber.
//
// 3. **O ticket nao culpa ninguem.** O assunto e o FATO e a descricao diz o que fazer.

/** O que a entrega diz ao ser recusada. */
export interface EntregaRecusada {
  entrega_id: string
  /** A venda que esta entrega cumpria. E por ela que o atendente chega ao cliente. */
  order_id: string
  destino?: null | string
  tenant_id: string
}

export type IntencaoDeAtendimento =
  | { tipo: 'nada'; motivo: 'status_normal' }
  | {
      tipo: 'abrir_ticket'
      assunto: string
      descricao: string
      prioridade: 'alta' | 'baixa' | 'media' | 'urgente'
      order_id: string
      destino: null | string
    }

/**
 * A prioridade a partir do que a entrega TEM.
 *
 * **Destino vazio e mais urgente que destino conhecido**: sem endereco nao ha como reagendar, e a fila precisa
 * de alguem ligando - nao de um segundo despacho que vai falhar no mesmo lugar.
 */
export function prioridadeDaRecusa(destino: null | string | undefined): 'alta' | 'baixa' | 'media' | 'urgente' {
  if (typeof destino !== 'string' || !destino.trim()) return 'urgente'

  return 'media'
}

/**
 * Decide se a transicao de entrega vira ticket.
 *
 * **Recebe o status NOVO e o ANTERIOR**, porque `recusada -> recusada` nao e um fato novo: e a mesma recusa
 * vista duas vezes, e abrir o segundo ticket faria a fila crescer sem que nada tivesse acontecido.
 */
export function intencaoDeAtendimento(
  statusNovo: string,
  statusAnterior: string | null,
  entrega: EntregaRecusada
): IntencaoDeAtendimento {
  if (statusNovo !== 'recusada') return { motivo: 'status_normal', tipo: 'nada' }

  if (statusAnterior === 'recusada') return { motivo: 'status_normal', tipo: 'nada' }

  const destino = typeof entrega.destino === 'string' && entrega.destino.trim() ? entrega.destino.trim() : null

  return {
    assunto: 'Entrega recusada',
    // A descricao diz O QUE FAZER, e nomeia o pedido - e por ele que o atendente abre a venda e acha o cliente.
    descricao: destino
      ? `O cliente recusou a entrega no destino "${destino}". Abrir o pedido ${entrega.order_id} para achar o contato e confirmar antes de reagendar.`
      : `O cliente recusou a entrega e o destino nao foi informado. Abrir o pedido ${entrega.order_id} e ligar para o cliente antes de reagendar.`,
    destino,
    order_id: entrega.order_id,
    prioridade: prioridadeDaRecusa(destino),
    tipo: 'abrir_ticket'
  }
}

/**
 * Se o ticket consegue chegar ao cliente sozinho.
 *
 * **Ele nao consegue**: a entrega nao tem telefone. Este predicado existe para a tela poder dizer **"abra o
 * pedido para achar o contato"** em vez de mostrar um campo vazio que parece um defeito.
 */
export function ticketTemContato(entrega: EntregaRecusada): boolean {
  // Sempre `false` hoje - e de proposito: `Entrega` nao carrega telefone. O dia em que carregar, este e o
  // unico lugar a mudar, e os chamadores nao precisam saber.
  return typeof (entrega as { contact_phone?: unknown }).contact_phone === 'string'
}

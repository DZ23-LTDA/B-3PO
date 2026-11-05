// A LIGACAO ENTREGA -> ATENDIMENTO (r140 do GOAL V2).
//
// A NECESSIDADE COMPROVADA
//
// A medicao desta rodada:
//
//   `ENTREGA_STATUS = ['pendente', 'em_rota', 'entregue', 'recusada']`
//   `delivery-store` / `delivery-ipc`: ZERO referencias a ticket
//   `service-desk-store`: zero referencias a entrega (so um comentario)
//
// O efeito no vertical: **o cliente recusa o bujao na porta** — e ninguem abre um ticket. A entrega fica
// `recusada` e o atendimento nao sabe que houve um problema; na segunda tentativa, o mesmo endereco, a mesma
// recusa.
//
// O §13 do proprio `service-desk-store` ja dizia o ciclo: *"venda -> entrega -> suporte -> pos-venda"*. A seta
// `entrega -> suporte` era a que faltava.
//
// AS TRES DECISOES
//
// 1. **So `recusada` abre ticket.** `pendente`, `em_rota` e `entregue` sao o caminho normal — e `entregue` e o
//    sucesso. Um ticket para cada transicao encheria a fila de ruido.
//
// 2. **A prioridade vem do valor, nao do gosto.** Uma recusa de R$ 20 e uma de R$ 2.000 nao tem a mesma urgencia
//    para o negocio, e a fila do atendimento precisa saber a diferenca sem que alguem a digite.
//
// 3. **O ticket nao culpa ninguem.** O assunto e o FATO (`entrega recusada`) e a descricao diz o que fazer. Um
//    ticket que diz "o motorista errou" fecha a investigacao antes de ela comecar.

/** O que a entrega diz ao ser recusada. */
export interface EntregaRecusada {
  entrega_id: string
  /** `null` quando a entrega foi registrada sem cliente identificado. */
  contact_phone?: null | string
  motivo?: null | string
  tenant_id: string
  total_cents?: null | number
}

export type IntencaoDeAtendimento =
  | { tipo: 'nada'; motivo: 'status_normal' }
  | {
      tipo: 'abrir_ticket'
      assunto: string
      descricao: string
      prioridade: 'alta' | 'baixa' | 'media' | 'urgente'
      contact_phone: null | string
    }

/**
 * A prioridade a partir do valor da entrega.
 *
 * **O corte e em reais, e o numero e dito**: R$ 500 e o ponto em que uma recusa deixa de ser um contratempo e
 * vira um prejuizo que alguem precisa Olhar hoje.
 */
export const LIMITE_ALTA_CENTS = 50_000
export const LIMITE_URGENTE_CENTS = 200_000

export function prioridadeDaRecusa(totalCents: null | number | undefined): 'alta' | 'baixa' | 'media' | 'urgente' {
  if (typeof totalCents !== 'number') return 'media'

  if (totalCents >= LIMITE_URGENTE_CENTS) return 'urgente'
  if (totalCents >= LIMITE_ALTA_CENTS) return 'alta'

  return 'baixa'
}

/**
 * Decide se a transicao de entrega vira ticket.
 *
 * **Recebe o status NOVO e o anterior**, porque `recusada -> recusada` nao e um fato novo: e a mesma recusa
 * vista duas vezes, e abrir o segundo ticket faria a fila crescer sem que nada tivesse acontecido.
 */
export function intencaoDeAtendimento(
  statusNovo: string,
  statusAnterior: string | null,
  entrega: EntregaRecusada
): IntencaoDeAtendimento {
  if (statusNovo !== 'recusada') return { motivo: 'status_normal', tipo: 'nada' }

  // A mesma recusa ja registrada: o ticket ja existe.
  if (statusAnterior === 'recusada') return { motivo: 'status_normal', tipo: 'nada' }

  const motivo = typeof entrega.motivo === 'string' && entrega.motivo.trim() ? entrega.motivo.trim() : null

  return {
    assunto: 'Entrega recusada',
    // A descricao diz O QUE FAZER. Um ticket que so registra o fato deixa a fila parada.
    descricao: motivo
      ? `O cliente recusou a entrega. Motivo informado: ${motivo}. Confirmar com o cliente antes de reagendar.`
      : 'O cliente recusou a entrega e o motivo nao foi informado. Ligar para confirmar antes de reagendar.',
    contact_phone: typeof entrega.contact_phone === 'string' && entrega.contact_phone ? entrega.contact_phone : null,
    prioridade: prioridadeDaRecusa(entrega.total_cents),
    tipo: 'abrir_ticket'
  }
}

/**
 * Se a recusa tem telefone.
 *
 * **Existe separado porque a resposta muda o que o canal faz**: com telefone, o ticket nasce ligado ao
 * contato do CRM; sem, ele nasce solto e o atendente precisa descobrir de quem e. **Dizer isso e melhor que
 * fingir que todo ticket tem dono.**
 */
export function recusaTemDono(entrega: EntregaRecusada): boolean {
  return typeof entrega.contact_phone === 'string' && entrega.contact_phone.trim().length > 0
}

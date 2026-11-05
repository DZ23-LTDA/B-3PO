// A LIGACAO VENDA -> CRM (r133 do GOAL V2).
//
// A NECESSIDADE COMPROVADA
//
// O §17 manda expandir **somente** com necessidade comprovada. A medicao desta rodada:
//
//   sales-ipc emite `venda.faturada` com `contact_phone`
//   crm-contacts-store tem a chave (phone, tenant_id)
//   E NINGUEM LIGA OS DOIS
//
// O efeito no vertical: o cliente compra, a venda fica registrada, **e o CRM nao sabe que ele existe**. Quem
// abrir a ficha do cliente nao ve a compra; quem olhar a venda nao ve o historico.
//
// O QUE ESTE ARQUIVO FAZ - E O QUE ELE **NAO** FAZ
//
// Ele **decide** o que a venda deve ao CRM, como funcao pura: dado o evento, devolve a intencao
// (`criar`, `atualizar` ou `nada`). **Ele nao escreve no store** - quem escreve e o `erp-ipc`, que e o unico
// lugar que tem os dois stores montados.
//
// A separacao importa: uma funcao pura pode ser testada sem arquivo, sem `userData` e sem ordem de escrita.
//
// AS TRES DECISOES
//
// 1. **Compra sem telefone nao cria contato.** Um contato sem chave seria um registro que ninguem encontra -
//    e o CRM tem UNIQUE em (phone, tenant_id). Criar um contato vazio faria a proxima venda com o mesmo
//    telefone cair nele.
//
// 2. **A compra NAO sobrescreve o nome do contato.** Se o CRM tem "Maria (vizinho)", a venda nao deve
//    reescrever para o que o operador digitou no caixa as pressas. **A venda ACRESCENTA o fato; nao corrige o
//    cadastro.**
//
// 3. **Compra cancelada nao vira historico.** `venda.cancelada` nao cria nem atualiza: o CRM e registro do que
//    ACONTECEU, e uma venda cancelada e um fato contabil, nao um relacionamento.

/** O que o evento de venda diz. So os campos que o CRM precisa. */
export interface EventoDeVendaParaCrm {
  contact_phone?: null | string
  sale_id: string
  tenant_id: string
  total_cents: number
}

export type IntencaoParaCrm =
  | { tipo: 'nada'; motivo: 'sem_telefone' | 'cancelada' }
  | { tipo: 'registrar'; telefone: string; ultimaCompraEm: number; totalCents: number; saleId: string }

/**
 * Normaliza o telefone para a chave do CRM.
 *
 * **O CRM usa `(phone, tenant_id)`**, e o telefone vem do caixa como o operador digitou: com espaco, com
 * parentese, sem o nono digito, com `+55`. Duas grafias do mesmo numero viram **dois clientes** se a chave for
 * o texto cru.
 *
 * A regra aqui e **conservadora**: tira tudo que nao e digito e devolve o que sobrou, **sem inventar o DDI**. Se
 * a venda gravou `11999990000` e o CRM tem `+5511999990000`, eles **continuam diferentes** - e isso e dito em
 * vez de escondido, porque adivinhar DDI erra para quem atende em outro pais.
 */
export function telefoneDoCrm(bruto: unknown): null | string {
  if (typeof bruto !== 'string') return null

  const digitos = bruto.replace(/\D/g, '')

  // Um telefone com menos de 8 digitos nao e telefone: e um ramal, um erro de digitacao, ou vazio.
  if (digitos.length < 8) return null

  return digitos
}

/**
 * Decide o que registrar no CRM.
 *
 * **O evento pode ser `venda.faturada` ou `venda.cancelada`** - e a intencao muda com ele.
 */
export function intencaoParaCrm(evento: EventoDeVendaParaCrm, quando = Date.now()): IntencaoParaCrm {
  const telefone = telefoneDoCrm(evento.contact_phone)

  if (!telefone) {
    // Sem chave nao ha contato: criar um registro sem telefone faria a proxima venda com o mesmo numero cair
    // nele, e o CRM teria um contato que ninguem acha.
    return { motivo: 'sem_telefone', tipo: 'nada' }
  }

  return {
    saleId: evento.sale_id,
    telefone,
    tipo: 'registrar',
    totalCents: evento.total_cents,
    ultimaCompraEm: quando
  }
}

/** A mesma decisao para o cancelamento - que **nao** registra. */
export function intencaoParaCrmCancelada(): IntencaoParaCrm {
  // Uma venda cancelada e um fato contabil, nao um relacionamento. O CRM e registro do que ACONTECEU.
  return { motivo: 'cancelada', tipo: 'nada' }
}

/**
 * O patch que a venda aplica ao contato, quando ele ja existe.
 *
 * **Nao inclui `name`**: a compra nao sobrescreve o nome. Inclui o que a venda sabe de verdade - o total e a
 * data da ultima compra.
 */
export function patchDoContato(intencao: Extract<IntencaoParaCrm, { tipo: 'registrar' }>): {
  last_purchase_at: number
  last_purchase_cents: number
  last_sale_id: string
} {
  return {
    last_purchase_at: intencao.ultimaCompraEm,
    last_purchase_cents: intencao.totalCents,
    last_sale_id: intencao.saleId
  }
}

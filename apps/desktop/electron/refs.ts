// O contrato das referências cruzadas entre domínios (r12 do GOAL V2).
//
// O PROBLEMA QUE ESTE ARQUIVO RESOLVE
//
// Cinco domínios se cruzam por `ref`: vendas, estoque, financeiro, fiscal, comissão, devolução, pós-venda e
// inventário. Até esta rodada, **cada call site montava a string à mão**:
//
//   sales-store.ts:241        `venda:${sale.id}:${item.product_sku}`
//   finance-store.ts:247      `venda:${sale.id}`
//   sales-commission.ts:62    `venda:${sale.id}:comissao`
//   sales-return.ts:84        `venda:${sale.id}:devolucao:${item.product_sku}`
//   after-sales-store.ts:91   `venda:${saleId}:${kind}`
//   purchases-store.ts:217    `compra:${order.id}:${item.product_sku}`
//   inventory-count.ts:117    `inventario:${inventarioId}:${ajuste.product_sku}`
//
// Cada um estava certo. O problema é que **a única coisa que os ligava era a memória de quem escreveu** — e
// o consumidor em `after-sales-store.ts:152` fazia `ref.split(':')[1]`, assumindo que o id da venda está
// sempre na posição 1. Mudar um formato de `venda:<id>:<x>` para `venda:<x>:<id>` quebraria o vínculo
// **sem nenhum erro de tipo**, porque `ref` é `string` em todos eles.
//
// O QUE ESTE ARQUIVO GARANTE
//
//   1. Um lugar decide o formato. Os call sites chamam função, não concatenam.
//   2. `idDaVenda(ref)` lê o id por POSIÇÃO SEMÂNTICA (prefixo conhecido + primeiro segmento), não por
//      índice mágico espalhado no código.
//   3. Um ref de outro domínio devolve `null` em vez de lixo — o chamador precisa tratar.
//
// O QUE ELE NÃO GARANTE
//
// Não valida que a venda existe. `ref` é chave de idempotência, não integridade referencial: o banco é um
// arquivo JSON por domínio, e não há transação entre eles (ver o comentário em purchases-store.ts).

/** Prefixos. Um só lugar. */
export const REF = {
  compra: 'compra',
  inventario: 'inventario',
  venda: 'venda'
} as const

export type RefDomain = (typeof REF)[keyof typeof REF]

/**
 * `venda:<id>` — a chave natural da venda.
 *
 * É a mesma ref usada por estoque, financeiro, fiscal e pós-venda para a venda **como um todo**. Quando o
 * efeito é por item ou por tipo, use as variantes abaixo: refs diferentes não deduplicam entre si.
 */
export function refVenda(id: string): string {
  return `${REF.venda}:${id}`
}

/** `venda:<id>:<sku>` — a saída de estoque de um item da venda. */
export function refVendaItem(id: string, sku: string): string {
  return `${REF.venda}:${id}:${sku}`
}

/** `venda:<id>:comissao` — o lançamento de comissão da venda. */
export function refVendaComissao(id: string): string {
  return `${REF.venda}:${id}:comissao`
}

/** `venda:<id>:devolucao` — a conta a pagar do estorno. */
export function refVendaDevolucao(id: string): string {
  return `${REF.venda}:${id}:devolucao`
}

/** `venda:<id>:devolucao:<sku>` — a entrada em estoque da devolução de um item. */
export function refVendaDevolucaoItem(id: string, sku: string): string {
  return `${REF.venda}:${id}:devolucao:${sku}`
}

/** `venda:<id>:<kind>` — o follow-up de pós-venda. Uma venda pode ter um de cada tipo. */
export function refVendaFollowUp(id: string, kind: string): string {
  return `${REF.venda}:${id}:${kind}`
}

/** `compra:<id>` — a conta a pagar do pedido. */
export function refCompra(id: string): string {
  return `${REF.compra}:${id}`
}

/** `compra:<id>:<sku>` — a entrada em estoque de um item recebido. */
export function refCompraItem(id: string, sku: string): string {
  return `${REF.compra}:${id}:${sku}`
}

/** `inventario:<id>:<sku>` — o ajuste de um item contado. */
export function refInventario(id: string, sku: string): string {
  return `${REF.inventario}:${id}:${sku}`
}

/**
 * Lê o domínio e o id de uma ref.
 *
 * `venda:abc:comissao` → `{ domain: 'venda', id: 'abc' }`
 *
 * `null` quando não é um ref conhecido. O chamador tem de tratar: uma ref que não casa é sinal de dado de
 * outra versão, e inventar um id a partir dela ligaria registros que não têm relação.
 */
export function parseRef(ref: string): { domain: RefDomain; id: string } | null {
  const [domain, id] = ref.split(':')

  if (!domain || !id) return null
  if (domain !== REF.venda && domain !== REF.compra && domain !== REF.inventario) return null

  return { domain, id }
}

/**
 * O id da venda numa ref, ou `null`.
 *
 * Substitui `ref.split(':')[1]` — que funcionava por acidente de formato e quebrava em silêncio se alguém
 * mudasse a ordem dos segmentos.
 */
export function idDaVenda(ref: string): null | string {
  const parsed = parseRef(ref)

  return parsed?.domain === REF.venda ? parsed.id : null
}

/** O id da compra numa ref, ou `null`. */
export function idDaCompra(ref: string): null | string {
  const parsed = parseRef(ref)

  return parsed?.domain === REF.compra ? parsed.id : null
}

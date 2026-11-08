// Lógica pura do formulário de produto.
//
// Separada do componente para poder ser testada sem DOM: a tela só liga os campos a estas funções. A
// validação que vale é a do processo principal; esta existe para o usuário ver o erro antes de enviar,
// e nunca como substituta daquela.

import type { ProductRow } from '@/api/catalog'

export interface ProductDraft {
  barcode: string
  category: string
  cost: string
  name: string
  price: string
  sku: string
  unit: string
}

export function emptyDraft(): ProductDraft {
  return { barcode: '', category: '', cost: '', name: '', price: '', sku: '', unit: 'un' }
}

/** Preenche o formulário a partir de um produto existente, para editar sem redigitar. */
export function draftFrom(product: ProductRow): ProductDraft {
  return {
    barcode: product.barcode,
    category: product.category,
    cost: centavosParaTexto(product.cost_cents),
    name: product.name,
    price: centavosParaTexto(product.price_cents),
    sku: product.sku,
    unit: product.unit || 'un'
  }
}

/** 2490 → "24,90". Campo de preço é texto em pt-BR, não float. */
export function centavosParaTexto(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) {
    return ''
  }

  return (cents / 100).toFixed(2).replace('.', ',')
}

/**
 * Valida o rascunho antes de enviar. Devolve a chave do primeiro problema, ou null.
 *
 * Preço e custo **vazios** são aceitos (produto ainda sem preço); preço **inválido** não é.
 */
export function validateDraft(draft: ProductDraft): null | string {
  if (!draft.name.trim()) {
    return 'name_required'
  }

  if (!draft.sku.trim()) {
    return 'sku_required'
  }

  if (draft.price.trim() && !numeroValido(draft.price)) {
    return 'price_invalid'
  }

  if (draft.cost.trim() && !numeroValido(draft.cost)) {
    return 'cost_invalid'
  }

  return null
}

export function numeroValido(texto: string): boolean {
  const limpo = texto.trim().replace(/\s/g, '')

  if (!limpo) {
    return false
  }

  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo

  return Number.isFinite(Number.parseFloat(normalizado))
}

/** Payload para o processo principal. Preço e custo vão como centavos inteiros. */
export function draftToPayload(draft: ProductDraft, id?: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    barcode: draft.barcode.trim(),
    category: draft.category.trim(),
    cost_cents: textoParaCentavos(draft.cost),
    name: draft.name.trim(),
    price_cents: textoParaCentavos(draft.price),
    sku: draft.sku.trim(),
    unit: draft.unit
  }

  if (id) {
    payload['id'] = id
  }

  return payload
}

export function textoParaCentavos(texto: string): number {
  const limpo = texto.trim().replace(/\s/g, '')

  if (!limpo) {
    return 0
  }

  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const parsed = Number.parseFloat(normalizado)

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0
}

/**
 * Filtro da lista. Busca por nome, SKU ou código de barras — os três jeitos pelos quais alguém procura um
 * produto no balcão.
 */
export function filterProducts(products: readonly ProductRow[], query: string): ProductRow[] {
  const termo = query.trim().toLowerCase()

  if (!termo) {
    return [...products]
  }

  return products.filter(product =>
    [product.name, product.sku, product.barcode].some(campo => campo.toLowerCase().includes(termo))
  )
}

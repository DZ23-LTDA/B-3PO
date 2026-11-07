// O fornecedor vencedor da cotação de um produto (r48 do GOAL V2).
//
// A LIGAÇÃO QUE A r47 TORNOU POSSÍVEL
//
// Antes da r47 a cotação não sabia de que produto era. As duas pontas agora têm `product_sku`, e esta
// função responde "qual fornecedor ganhou para o SKU-1".

import { describe, expect, it } from 'vitest'

import { fornecedorVencedor, type CotacaoGravadaRow } from './purchases'

function proposta(supplier_id: string, preco: number, sku = 'SKU-1'): CotacaoGravadaRow {
  return {
    created_at: 0,
    id: `cot-${supplier_id}`,
    prazo_dias: 5,
    preco_unit_cents: preco,
    product_sku: sku,
    quantidade_disponivel: 100,
    supplier_id,
    tenant_id: 'local'
  }
}

describe('o vencedor', () => {
  it('a proposta mais barata do produto vence', () => {
    const cotacoes = [proposta('alfa', 1_200), proposta('beta', 1_000), proposta('gama', 1_500)]

    expect(fornecedorVencedor(cotacoes, 'SKU-1')).toBe('beta')
  })

  it('proposta de OUTRO produto é ignorada', () => {
    // Sem isto, uma cotação de areia poderia "vencer" a compra de parafuso — o erro da r47.
    const cotacoes = [proposta('alfa', 1_200, 'SKU-1'), proposta('barata', 100, 'SKU-2')]

    expect(fornecedorVencedor(cotacoes, 'SKU-1')).toBe('alfa')
  })

  it('cotação antiga sem produto NÃO casa', () => {
    // `product_sku: ''` é a cotação gravada antes da r47. Usá-la seria voltar ao erro corrigido.
    const cotacoes = [proposta('antiga', 100, ''), proposta('nova', 1_200, 'SKU-1')]

    expect(fornecedorVencedor(cotacoes, 'SKU-1')).toBe('nova')
  })
})

describe('as recusas', () => {
  it('sem proposta para o produto, não há vencedor', () => {
    expect(fornecedorVencedor([], 'SKU-1')).toBeNull()
    expect(fornecedorVencedor([proposta('alfa', 1_000, 'SKU-2')], 'SKU-1')).toBeNull()
  })

  it('SKU vazio não tem vencedor — não há produto para procurar', () => {
    expect(fornecedorVencedor([proposta('alfa', 1_000)], '')).toBeNull()
    expect(fornecedorVencedor([proposta('alfa', 1_000)], '   ')).toBeNull()
  })

  it('preço inválido não vence', () => {
    // Um preço zero ou negativo é dado ruim, não oferta gratuita.
    expect(fornecedorVencedor([proposta('zero', 0)], 'SKU-1')).toBeNull()
    expect(fornecedorVencedor([proposta('negativo', -100)], 'SKU-1')).toBeNull()
  })
})

describe('o desempate', () => {
  it('empate vai para o supplier_id menor — dois cliques não podem sugerir fornecedores diferentes', () => {
    const cotacoes = [proposta('zebra', 1_000), proposta('alfa', 1_000)]

    // `alfa` < `zebra`, em ordem determinística.
    expect(fornecedorVencedor(cotacoes, 'SKU-1')).toBe('alfa')
    // E a ordem de entrada não muda o resultado.
    expect(fornecedorVencedor([...cotacoes].reverse(), 'SKU-1')).toBe('alfa')
  })
})

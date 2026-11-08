// Cotacao: contratos (rodada 188).
//
// A ultima das 6 ausencias medidas na r183.

import { describe, expect, it } from 'vitest'

import { escolherCotacao, type Cotacao, type Escolha } from './purchase-quotation'

const c = (over: Partial<Cotacao> = {}): Cotacao => ({
  prazo_dias: 7,
  preco_unit_cents: 2_000,
  quantidade_disponivel: 10,
  supplier_id: 'forn-a',
  ...over
})

// `Escolha` e uniao: `motivo` so existe nos casos sem proposta. Centralizar o narrowing aqui evita repetir a
// mesma verificacao em cada teste — e evita o `as` que desligaria a checagem de forma.
const motivoDe = (r: Escolha): string | null => ('motivo' in r ? r.motivo : null)

describe('escolha', () => {
  it('escolhe o menor preco total', () => {
    const r = escolherCotacao(
      [c({ preco_unit_cents: 2_500, supplier_id: 'caro' }), c({ preco_unit_cents: 1_800, supplier_id: 'barato' })],
      5
    )

    expect(motivoDe(r)).toBeNull()
    if ('proposta' in r) expect(r.proposta.supplier_id).toBe('barato')
  })

  it('compara o TOTAL, nao o preco unitario', () => {
    const r = escolherCotacao([c({ preco_unit_cents: 1_800 }), c({ preco_unit_cents: 2_000, supplier_id: 'b' })], 5)

    if ('proposta' in r) expect(r.proposta.preco_total_cents).toBe(9_000)
  })

  it('preco total e em CENTAVOS de unidades, nao de milesimos', () => {
    // A r195 fotografou a tela mostrando R\$ 105.000,00 para uma compra de R\$ 105,00 porque o painel passou
    // milesimos onde este modulo espera unidades. Este teste fixa o contrato: 10 unidades a R\$ 10,50 = R\$ 105,00.
    const r = escolherCotacao([c({ preco_unit_cents: 1_050, quantidade_disponivel: 10 })], 10)

    if ('proposta' in r) {
      expect(r.proposta.preco_total_cents).toBe(10_500)
      expect(r.proposta.quantidade).toBe(10)
    }
  })

  it('quantidade em milesimos NAO e aceita como unidades', () => {
    // Se alguem passar 10000 querendo dizer 10 unidades, o total sai mil vezes maior. O modulo nao adivinha:
    // ele multiplica pelo que recebe, e e por isso que o painel converte antes.
    const r = escolherCotacao([c({ preco_unit_cents: 1_050, quantidade_disponivel: 10 })], 10_000)

    // Proposta parcial: 10 disponiveis nao atendem 10000 pedidos.
    expect('motivo' in r && r.motivo).toBe('sem_proposta_valida')
  })
  it('devolve quanto economiza contra a segunda', () => {
    // "Escolhi o A" nao convence; "o A custa 200 a menos que o B" justifica a decisao.
    const r = escolherCotacao(
      [c({ preco_unit_cents: 2_000, supplier_id: 'a' }), c({ preco_unit_cents: 2_040, supplier_id: 'b' })],
      5
    )

    if ('proposta' in r) expect(r.economia_contra_segunda_cents).toBe(200)
  })

  it('com uma so proposta, a economia e desconhecida (null), nao zero', () => {
    // Zero diria "nao economizei nada", que e diferente de "nao havia com o que comparar".
    const r = escolherCotacao([c()], 5)

    if ('proposta' in r) {
      expect(r.economia_contra_segunda_cents).toBeNull()
      expect(r.segunda).toBeNull()
    }
  })
})

describe('desempate', () => {
  it('mesmo preco: vence o prazo mais curto', () => {
    const r = escolherCotacao(
      [c({ prazo_dias: 15, supplier_id: 'lento' }), c({ prazo_dias: 3, supplier_id: 'rapido' })],
      5
    )

    if ('proposta' in r) expect(r.proposta.supplier_id).toBe('rapido')
  })

  it('prazo desconhecido perde para prazo conhecido', () => {
    // `null` nao e "imediato": e "nao sei", e nao pode ganhar de quem informou.
    const r = escolherCotacao([c({ prazo_dias: null, supplier_id: 'nao-sei' }), c({ prazo_dias: 30, supplier_id: 'sei' })], 5)

    if ('proposta' in r) expect(r.proposta.supplier_id).toBe('sei')
  })

  it('empate total decide pelo id, para a escolha ser reproduzivel', () => {
    const r = escolherCotacao([c({ supplier_id: 'zzz' }), c({ supplier_id: 'aaa' })], 5)

    if ('proposta' in r) expect(r.proposta.supplier_id).toBe('aaa')
  })
})

describe('o que e recusado', () => {
  it('proposta parcial nao atende o pedido', () => {
    // Aceitar faria a compra chegar incompleta e o estoque ficar abaixo do planejado sem ninguem decidir.
    expect(motivoDe(escolherCotacao([c({ quantidade_disponivel: 3 })], 5))).toBe('sem_proposta_valida')
  })

  it('quantidade exatamente igual ao pedido atende', () => {
    expect(motivoDe(escolherCotacao([c({ quantidade_disponivel: 5 })], 5))).toBeNull()
  })

  it('preco zero ou negativo nao e oferta', () => {
    expect(motivoDe(escolherCotacao([c({ preco_unit_cents: 0 })], 5))).toBe('sem_proposta_valida')
    expect(motivoDe(escolherCotacao([c({ preco_unit_cents: -100 })], 5))).toBe('sem_proposta_valida')
  })

  it('preco invalido nao ganha a comparacao por acidente', () => {
    // Sem esta regra, o NaN viraria "o mais barato" e o pedido iria para um fornecedor sem preco.
    const r = escolherCotacao(
      [c({ preco_unit_cents: Number.NaN, supplier_id: 'quebrado' }), c({ preco_unit_cents: 2_000, supplier_id: 'ok' })],
      5
    )

    if ('proposta' in r) expect(r.proposta.supplier_id).toBe('ok')
  })

  it('sem cotacoes e diferente de sem proposta valida', () => {
    // A primeira e "ninguem cotou"; a segunda e "todos cotaram e nenhum serve". Sao acoes diferentes.
    expect(motivoDe(escolherCotacao([], 5))).toBe('sem_cotacoes')
    expect(motivoDe(escolherCotacao([c({ quantidade_disponivel: 1 })], 5))).toBe('sem_proposta_valida')
  })

  it('quantidade pedida invalida nao escolhe nada', () => {
    expect(motivoDe(escolherCotacao([c()], 0))).toBe('sem_proposta_valida')
    expect(motivoDe(escolherCotacao([c()], -5))).toBe('sem_proposta_valida')
  })

  it('fornecedor sem id e ignorado', () => {
    expect(motivoDe(escolherCotacao([c({ supplier_id: '' })], 5))).toBe('sem_proposta_valida')
  })
})

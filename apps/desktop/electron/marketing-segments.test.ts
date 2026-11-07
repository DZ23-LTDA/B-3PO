// Segmentação de marketing (rodada 136).
//
// O que estes testes travam: critérios são conjunção (E), quem nunca comprou não é "inativo", e ausência de
// compra é `null` — nunca zero, que viraria 1970.

import { describe, expect, it } from 'vitest'

import {
  clientesDoSegmento,
  composicao,
  pertenceAo,
  type ClienteResumo,
  type Segmento
} from './marketing-segments'

const DIA = 86_400_000
const AGORA = 1_700_000_000_000

function cliente(over: Partial<ClienteResumo> = {}): ClienteResumo {
  return {
    compras: 3,
    telefone: '5511999998888',
    tags: [],
    total_cents: 10000,
    ultima_compra: AGORA - 10 * DIA,
    ...over
  }
}

const seg = (...criterios: Segmento['criterios']): Segmento => ({ criterios, nome: 'teste' })

describe('pertenceAo', () => {
  it('segmento vazio inclui todos', () => {
    expect(pertenceAo(cliente(), [], AGORA)).toBe(true)
  })

  it('inativo_dias: 90 dias pega quem esta ha 100', () => {
    expect(pertenceAo(cliente({ ultima_compra: AGORA - 100 * DIA }), [{ kind: 'inativo_dias', valor: 90 }], AGORA)).toBe(true)
    expect(pertenceAo(cliente({ ultima_compra: AGORA - 89 * DIA }), [{ kind: 'inativo_dias', valor: 90 }], AGORA)).toBe(false)
  })

  it('NAO trate quem nunca comprou como inativo', () => {
    // Mandar campanha de reativacao para quem nunca foi cliente e o erro que queima a lista.
    expect(pertenceAo(cliente({ ultima_compra: null }), [{ kind: 'inativo_dias', valor: 1 }], AGORA)).toBe(false)
  })

  it('nunca_comprou e segmento proprio', () => {
    expect(pertenceAo(cliente({ compras: 0, total_cents: 0, ultima_compra: null }), [{ kind: 'nunca_comprou' }], AGORA)).toBe(true)
    expect(pertenceAo(cliente(), [{ kind: 'nunca_comprou' }], AGORA)).toBe(false)
  })

  it('tag casa pelo nome exato', () => {
    expect(pertenceAo(cliente({ tags: ['vip', 'atacado'] }), [{ kind: 'tag', valor: 'vip' }], AGORA)).toBe(true)
    expect(pertenceAo(cliente({ tags: ['vip'] }), [{ kind: 'tag', valor: 'VIP' }], AGORA)).toBe(false)
  })

  it('valor_minimo usa o total acumulado', () => {
    expect(pertenceAo(cliente({ total_cents: 50000 }), [{ kind: 'valor_minimo', valor: 50000 }], AGORA)).toBe(true)
    expect(pertenceAo(cliente({ total_cents: 49999 }), [{ kind: 'valor_minimo', valor: 50000 }], AGORA)).toBe(false)
  })

  it('criterios sao CONJUNCAO: precisa satisfazer todos', () => {
    const vip = cliente({ tags: ['vip'], total_cents: 60000, ultima_compra: AGORA - 100 * DIA })

    expect(pertenceAo(vip, [{ kind: 'tag', valor: 'vip' }, { kind: 'valor_minimo', valor: 50000 }], AGORA)).toBe(true)
    expect(pertenceAo(vip, [{ kind: 'tag', valor: 'vip' }, { kind: 'valor_minimo', valor: 999999 }], AGORA)).toBe(false)
  })

  it('criterio desconhecido nunca casa, em vez de casar tudo', () => {
    // Um erro de digitacao no criterio nao pode virar "todos os clientes" numa campanha.
    expect(pertenceAo(cliente(), [{ kind: 'inexistente' as never }], AGORA)).toBe(false)
  })
})

describe('clientesDoSegmento', () => {
  it('ordena do maior gasto para o menor', () => {
    const lista = clientesDoSegmento(
      [
        cliente({ telefone: 'a', total_cents: 1000 }),
        cliente({ telefone: 'b', total_cents: 90000 }),
        cliente({ telefone: 'c', total_cents: 50000 })
      ],
      seg(),
      AGORA
    )

    expect(lista.map(c => c.telefone)).toEqual(['b', 'c', 'a'])
  })

  it('filtra pelo criterio', () => {
    const lista = clientesDoSegmento(
      [cliente({ telefone: 'a', ultima_compra: AGORA - 200 * DIA }), cliente({ telefone: 'b' })],
      seg({ kind: 'inativo_dias', valor: 90 }),
      AGORA
    )

    expect(lista).toHaveLength(1)
    expect(lista[0]!.telefone).toBe('a')
  })

  it('lista vazia devolve vazio', () => {
    expect(clientesDoSegmento([], seg({ kind: 'tag', valor: 'x' }), AGORA)).toEqual([])
  })
})

describe('composicao', () => {
  it('separa quem nunca comprou', () => {
    // 500 clientes com 400 que nunca compraram nao e "500 para reativar": e 100 para reativar e 400 para
    // converter. A distincao muda a mensagem.
    const c = composicao(
      [
        cliente({ telefone: 'a', ultima_compra: null, compras: 0, total_cents: 0 }),
        cliente({ telefone: 'b', ultima_compra: null, compras: 0, total_cents: 0 }),
        cliente({ telefone: 'c', total_cents: 30000 })
      ],
      seg(),
      AGORA
    )

    expect(c.total).toBe(3)
    expect(c.nunca_compraram).toBe(2)
    expect(c.total_cents).toBe(30000)
  })

  it('soma o total do segmento, nao de todos', () => {
    const c = composicao(
      [cliente({ telefone: 'a', total_cents: 1000, tags: ['vip'] }), cliente({ telefone: 'b', total_cents: 99999 })],
      seg({ kind: 'tag', valor: 'vip' }),
      AGORA
    )

    expect(c.total).toBe(1)
    expect(c.total_cents).toBe(1000)
  })

  it('segmento vazio de clientes devolve zeros honestos', () => {
    expect(composicao([], seg(), AGORA)).toEqual({ nunca_compraram: 0, total: 0, total_cents: 0 })
  })
})

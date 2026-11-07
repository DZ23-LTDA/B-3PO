// Retencao de dados pessoais: contratos (rodada 212).

import { describe, expect, it } from 'vitest'

import { resumoPorCategoria, vencidos, type Registro } from './privacy-retention'

const DIA = 24 * 60 * 60 * 1000
const AGORA = 1_800_000_000_000

const reg = (id: string, categoria: Registro['categoria'], diasAtras: number): Registro => ({
  categoria,
  criado_em: AGORA - diasAtras * DIA,
  id
})

describe('o que vence', () => {
  it('registro alem do prazo vence', () => {
    const r = vencidos([reg('a', 'cadastro', 400)], { cadastro: 365 }, AGORA)

    expect(r.vencidos).toEqual([{ categoria: 'cadastro', dias_alem: 35, id: 'a' }])
  })

  it('registro dentro do prazo nao vence', () => {
    expect(vencidos([reg('a', 'cadastro', 100)], { cadastro: 365 }, AGORA).vencidos).toEqual([])
  })

  it('no limite exato ainda NAO venceu', () => {
    // Prazo de 365 dias: no dia 365 o dado ainda esta dentro. Vence no 366.
    expect(vencidos([reg('a', 'cadastro', 365)], { cadastro: 365 }, AGORA).vencidos).toEqual([])
  })

  it('vencido hoje tem dias_alem 0', () => {
    // 366 dias atras com prazo 365 = 1 dia alem. Para dar 0, o registro tem que estar 365 dias e 1 hora atras.
    const quase = { categoria: 'cadastro' as const, criado_em: AGORA - 365 * DIA - 1000, id: 'a' }

    expect(vencidos([quase], { cadastro: 365 }, AGORA).vencidos[0]!.dias_alem).toBe(0)
  })
})

describe('categoria sem prazo nunca vence', () => {
  it('prazo null nao marca nada', () => {
    // `null` e ausencia de politica, nao "prazo zero". Tratar como zero marcaria todo o banco no primeiro dia.
    const r = vencidos([reg('a', 'conversa', 5000)], { conversa: null }, AGORA)

    expect(r.vencidos).toEqual([])
    expect(r.sem_prazo).toBe(1)
  })

  it('categoria ausente do mapa conta como sem prazo', () => {
    const r = vencidos([reg('a', 'rh', 5000)], {}, AGORA)

    expect(r.vencidos).toEqual([])
    expect(r.sem_prazo).toBe(1)
  })

  it('prazo negativo ou invalido conta como sem prazo', () => {
    // Um `-1` digitado por engano nao pode virar "vencido sempre".
    expect(vencidos([reg('a', 'rh', 10)], { rh: -1 }, AGORA).sem_prazo).toBe(1)
    expect(vencidos([reg('a', 'rh', 10)], { rh: Number.NaN }, AGORA).sem_prazo).toBe(1)
  })

  it('o relatorio separa vencidos de sem-prazo', () => {
    const r = vencidos([reg('a', 'cadastro', 400), reg('b', 'rh', 10)], { cadastro: 365 }, AGORA)

    expect(r.vencidos).toHaveLength(1)
    expect(r.sem_prazo).toBe(1)
  })
})

describe('ordem e determinismo', () => {
  it('mais antigo primeiro', () => {
    const r = vencidos([reg('novo', 'cadastro', 400), reg('velho', 'cadastro', 800)], { cadastro: 365 }, AGORA)

    expect(r.vencidos.map(v => v.id)).toEqual(['velho', 'novo'])
  })

  it('empate resolve pelo id, para dois relatorios concordarem', () => {
    const r = vencidos([reg('zzz', 'cadastro', 400), reg('aaa', 'cadastro', 400)], { cadastro: 365 }, AGORA)

    expect(r.vencidos.map(v => v.id)).toEqual(['aaa', 'zzz'])
  })

  it('a mesma entrada com o mesmo agora da a mesma saida', () => {
    const registros = [reg('a', 'cadastro', 400), reg('b', 'conversa', 900)]

    expect(vencidos(registros, { cadastro: 365, conversa: 730 }, AGORA)).toEqual(
      vencidos(registros, { cadastro: 365, conversa: 730 }, AGORA)
    )
  })
})

describe('resumo', () => {
  it('conta por categoria e guarda o mais antigo', () => {
    const r = vencidos(
      [reg('a', 'cadastro', 400), reg('b', 'cadastro', 500), reg('c', 'marketing', 800)],
      { cadastro: 365, marketing: 180 },
      AGORA
    )

    expect(resumoPorCategoria(r)).toEqual({
      cadastro: { mais_antigo_dias: 135, quantidade: 2 },
      marketing: { mais_antigo_dias: 620, quantidade: 1 }
    })
  })

  it('sem vencidos, resumo vazio', () => {
    expect(resumoPorCategoria(vencidos([], {}, AGORA))).toEqual({})
  })
})

describe('a retencao NAO apaga', () => {
  it('devolve dados, nunca executa remocao', () => {
    // O contrato e do tipo: a funcao devolve uma lista. Quem apaga e `privacy.aplicarAnonimizacao`, com
    // confirmacao humana - porque o armazenamento nao tem lixeira.
    const r = vencidos([reg('a', 'cadastro', 400)], { cadastro: 365 }, AGORA)

    expect(Array.isArray(r.vencidos)).toBe(true)
    expect(r).not.toHaveProperty('removidos')
  })
})

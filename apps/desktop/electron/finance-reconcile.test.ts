// Conciliação bancária (rodada 115).
//
// O que estes testes travam: um lançamento casa uma vez só, a direção importa, e o que sobra aparece dos
// DOIS lados — conciliação que esconde pendência é pior que nenhuma.

import { describe, expect, it } from 'vitest'

import { conciliar, resumoConciliacao, type ExtratoItem, type LancamentoConciliável } from './finance-reconcile'

const DIA = 86_400_000
const BASE = 1_700_000_000_000

const linha = (over: Partial<ExtratoItem> = {}): ExtratoItem => ({
  data: BASE,
  descricao: 'PIX recebido',
  entrada: true,
  id: 'e1',
  valor_cents: 10000,
  ...over
})

const lancamento = (over: Partial<LancamentoConciliável> = {}): LancamentoConciliável => ({
  amount_cents: 10000,
  description: 'Venda 7',
  due_at: BASE,
  id: 'l1',
  kind: 'receber',
  ...over
})

describe('conciliar', () => {
  it('casa valor igual na mesma direcao e data', () => {
    const r = conciliar([linha()], [lancamento()])

    expect(r.conciliados).toHaveLength(1)
    expect(r.conciliados[0]!.lancamento.id).toBe('l1')
    expect(r.so_no_extrato).toEqual([])
    expect(r.so_no_sistema).toEqual([])
  })

  it('aceita diferenca de alguns dias: o banco lanca em D+1', () => {
    const r = conciliar([linha({ data: BASE + DIA })], [lancamento({ due_at: BASE })])

    expect(r.conciliados).toHaveLength(1)
    expect(r.conciliados[0]!.dias_de_diferenca).toBe(1)
  })

  it('recusa fora da janela: 10 dias nao e o mesmo lancamento', () => {
    const r = conciliar([linha({ data: BASE + 10 * DIA })], [lancamento({ due_at: BASE })])

    expect(r.conciliados).toEqual([])
    expect(r.so_no_extrato).toHaveLength(1)
    expect(r.so_no_sistema).toHaveLength(1)
  })

  it('a DIRECAO importa: entrada nao casa com conta a pagar', () => {
    // 100 reais que entraram nao sao a mesma coisa que 100 reais que sairam.
    const r = conciliar([linha({ entrada: true })], [lancamento({ kind: 'pagar' })])

    expect(r.conciliados).toEqual([])
  })

  it('saida casa com pagar', () => {
    const r = conciliar([linha({ entrada: false })], [lancamento({ kind: 'pagar' })])

    expect(r.conciliados).toHaveLength(1)
  })

  it('um lancamento casa UMA vez: dois de 100 e uma linha casam um so', () => {
    // Sem essa regra, a mesma linha do extrato "conciliaria" dois lancamentos e o total fecharia por
    // acidente.
    const r = conciliar([linha()], [lancamento({ id: 'a' }), lancamento({ id: 'b' })])

    expect(r.conciliados).toHaveLength(1)
    expect(r.so_no_sistema).toHaveLength(1)
  })

  it('uma linha do extrato casa uma vez', () => {
    const r = conciliar([linha({ id: 'a' }), linha({ id: 'b' })], [lancamento()])

    expect(r.conciliados).toHaveLength(1)
    expect(r.so_no_extrato).toHaveLength(1)
  })

  it('valor diferente nao casa', () => {
    expect(conciliar([linha({ valor_cents: 9999 })], [lancamento()]).conciliados).toEqual([])
  })

  it('com dois candidatos, escolhe o mais proximo no tempo', () => {
    const r = conciliar(
      [linha({ data: BASE + 2 * DIA })],
      [lancamento({ due_at: BASE, id: 'longe' }), lancamento({ due_at: BASE + 2 * DIA, id: 'perto' })]
    )

    expect(r.conciliados[0]!.lancamento.id).toBe('perto')
    expect(r.so_no_sistema.map(l => l.id)).toEqual(['longe'])
  })

  it('extrato vazio: tudo do sistema fica pendente', () => {
    const r = conciliar([], [lancamento({ id: 'a' }), lancamento({ id: 'b' })])

    expect(r.conciliados).toEqual([])
    expect(r.so_no_sistema).toHaveLength(2)
  })

  it('sistema vazio: tudo do extrato fica pendente', () => {
    const r = conciliar([linha()], [])

    expect(r.so_no_extrato).toHaveLength(1)
  })

  it('janela zero exige a mesma data', () => {
    const r = conciliar([linha({ data: BASE + DIA })], [lancamento({ due_at: BASE })], 0)

    expect(r.conciliados).toEqual([])
  })
})

describe('resumoConciliacao', () => {
  it('conta os dois lados e soma o pendente', () => {
    const r = conciliar(
      [linha({ id: 'a' }), linha({ id: 'b', valor_cents: 5000 })],
      [lancamento({ id: 'x' }), lancamento({ id: 'y', amount_cents: 3000 })]
    )

    const resumo = resumoConciliacao(r)

    expect(resumo.conciliados).toBe(1)
    expect(resumo.so_no_extrato).toBe(1)
    expect(resumo.so_no_sistema).toBe(1)
    // O valor pendente soma os DOIS lados: 5000 do extrato + 3000 do sistema.
    expect(resumo.pendente_cents).toBe(8000)
  })

  it('tudo conciliado zera o pendente', () => {
    const resumo = resumoConciliacao(conciliar([linha()], [lancamento()]))

    expect(resumo).toEqual({ conciliados: 1, pendente_cents: 0, so_no_extrato: 0, so_no_sistema: 0 })
  })
})

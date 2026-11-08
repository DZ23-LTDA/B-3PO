// Limite de compra: contratos (rodada 182).
//
// O GOAL §15 pede que compras acima do limite exijam aprovacao. A r181 mediu que nada disso existia. Estes
// testes fixam o mecanismo — e, tao importante quanto, fixam o que acontece quando o limite NAO esta configurado.

import { describe, expect, it } from 'vitest'

import {
  segregaçãoPermite,
  configuracaoUtil,
  decidirAprovacao,
  SEM_LIMITE,
  situacaoDaCompra,
  type LimiteDeCompra
} from './purchase-approval'

const limite = (cents: number | null, aprovadores: string[] = ['dono']): LimiteDeCompra => ({ aprovadores, cents })

describe('sem limite configurado', () => {
  it('nada exige aprovacao', () => {
    const r = situacaoDaCompra(50_000_00, SEM_LIMITE)

    expect(r.precisa).toBe(false)
    expect(r.motivo).toBe('sem_limite')
  })

  it('um pedido de dez milhoes de reais tambem nao exige', () => {
    // Sem limite, o controle nao existe — e o modulo diz isso em vez de fingir que existe.
    expect(situacaoDaCompra(1_000_000_000, SEM_LIMITE).precisa).toBe(false)
  })

  it('a configuracao padrao e sem limite', () => {
    // Um numero inventado por mim daria impressao de controle sem exercer nenhum.
    expect(SEM_LIMITE.cents).toBeNull()
  })
})

describe('com limite configurado', () => {
  it('compra abaixo do limite passa direto', () => {
    const r = situacaoDaCompra(9_999_99, limite(10_000_00))

    expect(r.precisa).toBe(false)
    expect(r.motivo).toBe('abaixo_do_limite')
  })

  it('compra EXATAMENTE no limite passa — o limite e o teto, nao o gatilho', () => {
    expect(situacaoDaCompra(10_000_00, limite(10_000_00)).precisa).toBe(false)
  })

  it('um centavo acima do limite exige aprovacao', () => {
    const r = situacaoDaCompra(10_000_01, limite(10_000_00))

    expect(r.precisa).toBe(true)
    expect(r.motivo).toBe('acima_do_limite')
    if (r.motivo === 'acima_do_limite') expect(r.excedente_cents).toBe(1)
  })

  it('devolve quanto passou do limite', () => {
    const r = situacaoDaCompra(15_000_00, limite(10_000_00))

    if (r.motivo === 'acima_do_limite') expect(r.excedente_cents).toBe(5_000_00)
  })

  it('limite zero ou negativo nao vira "revisar tudo"', () => {
    // Tratar 0 como "sempre exige" seria uma armadilha: o dono limpou o campo e o ERP parou de receber compra.
    expect(situacaoDaCompra(5_000_00, limite(0)).precisa).toBe(false)
    expect(situacaoDaCompra(5_000_00, limite(-100)).precisa).toBe(false)
  })

  it('limite nao finito nao vira limite', () => {
    expect(situacaoDaCompra(5_000_00, limite(Number.POSITIVE_INFINITY)).precisa).toBe(false)
    expect(situacaoDaCompra(5_000_00, limite(Number.NaN)).precisa).toBe(false)
  })
})

describe('a configuracao protege alguem?', () => {
  it('limite com aprovador e util', () => {
    expect(configuracaoUtil(limite(10_000_00))).toBe(true)
  })

  it('limite SEM aprovador nao protege — ninguem poderia aprovar', () => {
    expect(configuracaoUtil(limite(10_000_00, []))).toBe(false)
  })

  it('sem limite nao e util, mesmo com aprovadores', () => {
    expect(configuracaoUtil(limite(null, ['dono']))).toBe(false)
  })
})

describe('quem aprova', () => {
  const base = { aprovadores: ['dono', 'gerente'], precisa: true, solicitante: 'comprador' }

  it('o dono aprova', () => {
    expect(decidirAprovacao({ ...base, decisor: 'dono' })).toEqual({ aprovada: true })
  })

  it('quem pediu NAO aprova o proprio pedido', () => {
    expect(decidirAprovacao({ ...base, decisor: 'comprador' })).toEqual({ erro: 'mesmo_solicitante' })
    expect(decidirAprovacao({ ...base, aprovadores: ['comprador'], decisor: 'comprador' })).toEqual({
      erro: 'mesmo_solicitante'
    })
  })

  it('quem nao esta na lista nao aprova', () => {
    expect(decidirAprovacao({ ...base, decisor: 'estagiario' })).toEqual({ erro: 'nao_e_aprovador' })
  })

  it('compra que nao precisa nao pode ser aprovada', () => {
    // Aprovar o que nao exigia aprovacao criaria um registro de aprovacao sem objeto.
    expect(decidirAprovacao({ ...base, decisor: 'dono', precisa: false })).toEqual({ erro: 'compra_nao_precisa' })
  })
})
describe('a segregação de funções (r53 do §15)', () => {
  it('DESLIGADA por padrão: não há regra, e "não há regra" não é "pode"', () => {
    // Um dono de instalação pequena é as três pessoas. Devolver `true` aqui esconderia que a pergunta
    // nunca foi feita.
    expect(segregaçãoPermite({ aprovador: 'dono', recebedor: 'dono' })).toBeNull()
  })

  it('ligada: quem aprovou não recebe', () => {
    expect(segregaçãoPermite({ aprovador: 'chefe', exige_segregacao: true, recebedor: 'chefe' })).toEqual({
      erro: 'aprovador_nao_recebe'
    })
  })

  it('ligada: outra pessoa recebe', () => {
    expect(segregaçãoPermite({ aprovador: 'chefe', exige_segregacao: true, recebedor: 'estoquista' })).toEqual({
      ok: true
    })
  })

  it('ligada, mas sem aprovador registrado: não há segregação a violar', () => {
    // O pedido nunca passou por assinatura — não há dois papéis para separar.
    expect(segregaçãoPermite({ aprovador: null, exige_segregacao: true, recebedor: 'dono' })).toEqual({ ok: true })
  })
})

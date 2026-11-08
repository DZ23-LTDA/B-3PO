// Ciclo de vida do colaborador: contratos (rodada 187).
//
// O GOAL §19 pede offboarding e treinamentos. A r183 mediu que nenhum dos dois existia.

import { describe, expect, it } from 'vitest'

import {
  avaliarOffboarding,
  bloqueiaPorAcesso,
  situacaoDoTreinamento,
  treinamentosImpeditivos,
  type Treinamento
} from './hr-lifecycle'

const DIA = 24 * 60 * 60 * 1000
const AGORA = 1_800_000_000_000

describe('offboarding', () => {
  it('sem pendencias, pode encerrar', () => {
    const r = avaliarOffboarding({ concluidos: ['cracha', 'acesso_sistemas'], exigidos: ['cracha', 'acesso_sistemas'] })

    expect(r.pode_encerrar).toBe(true)
  })

  it('lista o que falta, na ordem dos exigidos', () => {
    const r = avaliarOffboarding({ concluidos: ['cracha'], exigidos: ['acesso_sistemas', 'cracha', 'equipamento'] })

    expect(r.pode_encerrar).toBe(false)
    if (r.pode_encerrar === false) expect(r.pendentes).toEqual(['acesso_sistemas', 'equipamento'])
  })

  it('item devolvido que NAO era exigido nao conta a favor', () => {
    // Alguem devolveu o cracha, mas o acesso ao sistema continua aberto: o checklist nao pode parecer
    // completo por causa de um item que nao estava na lista.
    const r = avaliarOffboarding({ concluidos: ['cracha'], exigidos: ['acesso_sistemas'] })

    expect(r.pode_encerrar).toBe(false)
    if (r.pode_encerrar === false) expect(r.pendentes).toEqual(['acesso_sistemas'])
  })

  it('sem itens exigidos, esta completo', () => {
    // Nao ha o que devolver para um prestador que nunca recebeu nada da empresa.
    expect(avaliarOffboarding({ concluidos: [], exigidos: [] }).pode_encerrar).toBe(true)
  })

  it('acesso a sistemas pendente e o que mais importa', () => {
    // Cracha e perda patrimonial; acesso continua permitindo agir em nome da empresa.
    expect(bloqueiaPorAcesso(['cracha', 'equipamento'])).toBe(false)
    expect(bloqueiaPorAcesso(['acesso_sistemas'])).toBe(true)
  })
})

describe('treinamento', () => {
  const base: Treinamento = { concluido_em: AGORA, id: 'nr-35', obrigatorio: true, validade_dias: 365 }

  it('nunca concluido e pendente', () => {
    expect(situacaoDoTreinamento({ ...base, concluido_em: null }, AGORA)).toEqual({
      id: 'nr-35',
      situacao: 'pendente'
    })
  })

  it('sem validade nunca vence', () => {
    expect(situacaoDoTreinamento({ ...base, validade_dias: null }, AGORA + 100 * DIA)).toEqual({
      id: 'nr-35',
      situacao: 'ok'
    })
  })

  it('dentro da validade e ok', () => {
    expect(situacaoDoTreinamento(base, AGORA + 10 * DIA).situacao).toBe('ok')
  })

  it('perto de vencer avisa quantos dias restam', () => {
    const r = situacaoDoTreinamento(base, AGORA + 350 * DIA)

    expect(r.situacao).toBe('vencendo')
    if (r.situacao === 'vencendo') expect(r.dias_restantes).toBe(15)
  })

  it('dias restantes usa teto: 2,4 dias ainda e 3 para quem vai agendar', () => {
    const r = situacaoDoTreinamento({ ...base, validade_dias: 10 }, AGORA + 7.6 * DIA)

    expect(r.situacao).toBe('vencendo')
    if (r.situacao === 'vencendo') expect(r.dias_restantes).toBe(3)
  })

  it('vencido diz ha quantos dias', () => {
    const r = situacaoDoTreinamento(base, AGORA + 370 * DIA)

    expect(r.situacao).toBe('vencido')
    if (r.situacao === 'vencido') expect(r.vencido_ha_dias).toBe(5)
  })

  it('no instante exato do vencimento ja conta como vencido', () => {
    const r = situacaoDoTreinamento(base, AGORA + 365 * DIA)

    expect(r.situacao).toBe('vencido')
  })

  it('a janela de aviso e configuravel', () => {
    // Com 90 dias de antecedencia, o mesmo treinamento passa a avisar bem antes.
    expect(situacaoDoTreinamento(base, AGORA + 300 * DIA, 90).situacao).toBe('vencendo')
  })
})

describe('treinamentos que impedem o trabalho', () => {
  const lista: Treinamento[] = [
    { concluido_em: null, id: 'pendente', obrigatorio: true, validade_dias: 365 },
    { concluido_em: AGORA - 400 * DIA, id: 'vencido', obrigatorio: true, validade_dias: 365 },
    { concluido_em: AGORA, id: 'ok', obrigatorio: true, validade_dias: 365 },
    { concluido_em: null, id: 'opcional', obrigatorio: false, validade_dias: null }
  ]

  it('so os obrigatorios pendentes ou vencidos', () => {
    const r = treinamentosImpeditivos(lista, AGORA)

    expect(r.map(t => t.id).sort()).toEqual(['pendente', 'vencido'])
  })

  it('treinamento opcional nunca impede', () => {
    // Exigir um curso opcional travaria a operacao por um requisito que ninguem pediu.
    expect(treinamentosImpeditivos([{ ...lista[3]! }], AGORA)).toEqual([])
  })

  it('tudo em dia, ninguem impedido', () => {
    expect(treinamentosImpeditivos([lista[2]!], AGORA)).toEqual([])
  })
})

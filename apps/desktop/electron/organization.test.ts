// O Organization Builder (r81 do GOAL V2).
//
// O §12: "estrutura empresas conforme setor" e "não criar equipe enorme para tarefa simples".

import { describe, expect, it } from 'vitest'

import {
  dimensionar,
  estruturaPara,
  podeOperar,
  resumoDaOrganizacao,
  SETORES,
  SETOR_LABEL,
  validarOrganizacao,
  type Organizacao
} from './organization'

function org(extra: Partial<Organizacao> = {}): Organizacao {
  return {
    departamentos: [{ faz: 'atende', nome: 'Atendimento' }],
    setor: 'distribuidora_gas',
    tenant_id: 'local',
    unidades: [],
    ...extra
  }
}

describe('o catálogo é fechado, e isso é a decisão', () => {
  it('3 setores — os que o produto serve', () => {
    expect(SETORES).toEqual(['distribuidora_gas', 'varejo', 'servico'])
    expect(Object.keys(SETOR_LABEL)).toHaveLength(3)
  })

  it('setor desconhecido devolve NULL — "não sei este negócio, monte você"', () => {
    // UMA SUGESTÃO ERRADA É PIOR QUE NENHUMA: ela vira a estrutura real de uma empresa.
    expect(estruturaPara('padaria')).toBeNull()
    expect(estruturaPara(undefined)).toBeNull()
    expect(estruturaPara(42)).toBeNull()
  })

  it('a estrutura da distribuidora tem 3 departamentos, e cada um diz o que FAZ', () => {
    const e = estruturaPara('distribuidora_gas')

    expect(e).toHaveLength(3)
    expect(e?.every(d => d.faz.length > 0)).toBe(true)
  })

  it('devolve CÓPIA — quem receber pode editar sem alterar o catálogo', () => {
    const a = estruturaPara('varejo')

    a![0]!.nome = 'Mudado'

    expect(estruturaPara('varejo')?.[0]?.nome).not.toBe('Mudado')
  })

  it('a estrutura tem no máximo 3 departamentos — organograma de apresentação não serve', () => {
    for (const setor of SETORES) {
      expect(estruturaPara(setor)!.length).toBeLessThanOrEqual(3)
    }
  })
})

describe('validar', () => {
  it('setor inválido recusa', () => {
    expect(validarOrganizacao({ departamentos: [], setor: 'padaria' })).toEqual({ error: 'setor_invalido' })
  })

  it('departamento sem nome recusa', () => {
    expect(
      validarOrganizacao({ departamentos: [{ faz: 'x', nome: '  ' }], setor: 'varejo' })
    ).toEqual({ error: 'departamento_sem_nome' })
  })

  it('DUPLICATA recusada mesmo com caixa diferente — "Financeiro" e "financeiro" são o mesmo lugar', () => {
    expect(
      validarOrganizacao({
        departamentos: [{ faz: 'a', nome: 'Financeiro' }, { faz: 'b', nome: 'financeiro' }],
        setor: 'varejo'
      })
    ).toEqual({ error: 'departamento_duplicado' })
  })

  it('unidade duplicada recusa', () => {
    expect(validarOrganizacao({ departamentos: [], setor: 'varejo', unidades: ['Centro', 'centro'] })).toEqual({
      error: 'unidade_duplicada'
    })
  })

  it('sem departamento é VÁLIDO — a organização pode nascer vazia e ser montada', () => {
    expect(validarOrganizacao({ departamentos: [], setor: 'varejo' })).toMatchObject({
      organizacao: { departamentos: [] }
    })
  })
})

describe('dimensionar — o §12: "não criar equipe enorme para tarefa simples"', () => {
  it('2 departamentos para 1 frente é razoável', () => {
    const r = dimensionar(org({ departamentos: [{ faz: 'a', nome: 'A' }, { faz: 'b', nome: 'B' }] }), 1)

    expect(r.razoavel).toBe(true)
    expect(r.aviso).toBeNull()
  })

  it('6 departamentos para 1 frente AVISA — e diz o número', () => {
    const muitos = Array.from({ length: 6 }, (_, i) => ({ faz: 'x', nome: `D${i}` }))
    const r = dimensionar(org({ departamentos: muitos }), 1)

    expect(r.razoavel).toBe(false)
    expect(r.aviso).toContain('6 departamentos')
    expect(r.aviso).toContain('1 frente')
    // O aviso cita o §12: é a regra que o justifica, não a opinião de quem escreveu.
    expect(r.aviso).toContain('§12')
  })

  it('a mesma estrutura com 4 frentes é razoável — o trabalho cresceu, não a régua', () => {
    const muitos = Array.from({ length: 6 }, (_, i) => ({ faz: 'x', nome: `D${i}` }))

    expect(dimensionar(org({ departamentos: muitos }), 4).razoavel).toBe(true)
  })

  it('AVISA, não recusa — quem sabe da ambição é o dono', () => {
    const muitos = Array.from({ length: 9 }, (_, i) => ({ faz: 'x', nome: `D${i}` }))
    const r = dimensionar(org({ departamentos: muitos }), 0)

    // `razoavel: false` é informação; não há campo `error`, e a função não lança.
    expect(r).toHaveProperty('razoavel', false)
    expect(r).not.toHaveProperty('error')
  })

  it('organização vazia é razoável', () => {
    expect(dimensionar(org({ departamentos: [] }), 0).razoavel).toBe(true)
  })
})

describe('podeOperar', () => {
  it('com setor, departamento e função, opera', () => {
    expect(podeOperar(org())).toEqual({ ok: true })
  })

  it('SEM DEPARTAMENTO não opera — não há onde o trabalho acontecer', () => {
    expect(podeOperar(org({ departamentos: [] }))).toEqual({ motivo: 'sem_departamento', ok: false })
  })

  it('DEPARTAMENTO SEM FUNÇÃO não opera — é uma caixa no organograma', () => {
    expect(podeOperar(org({ departamentos: [{ faz: '', nome: 'X' }] }))).toEqual({
      motivo: 'departamento_sem_funcao',
      ok: false
    })
  })

  it('setor inválido (dado antigo) não opera', () => {
    expect(podeOperar(org({ setor: 'padaria' as never }))).toEqual({ motivo: 'sem_setor', ok: false })
  })
})

describe('o resumo', () => {
  it('conta departamentos e unidades', () => {
    const s = resumoDaOrganizacao(org({ unidades: ['Centro', 'Zona Sul'] }))

    expect(s).toContain('1 departamento')
    expect(s).toContain('2 unidade')
  })

  it('SEM FUNÇÃO é dito pelo NOME — "2 sem função" obrigaria a procurar quais', () => {
    const s = resumoDaOrganizacao(
      org({
        departamentos: [
          { faz: '', nome: 'Financeiro' },
          { faz: '', nome: 'Compras' }
        ]
      })
    )

    expect(s).toContain('Financeiro')
    expect(s).toContain('Compras')
  })

  it('vazio é dito', () => {
    expect(resumoDaOrganizacao(org({ departamentos: [] }))).toContain('Nenhum departamento')
  })
})

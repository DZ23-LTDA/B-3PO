// O Agent Factory (r82 do GOAL V2).
//
// O §12: "reutiliza agentes... existentes" e "não criar bots duplicados para cada tarefa".

import { describe, expect, it } from 'vitest'

import { candidatos, cobertura, contratar, recomendacao, validarProposta } from './agent-factory'
import { AGENTES } from './agent-roster'

const NECESSIDADE = { descricao: 'fechar uma venda', dominio: 'sales', nivel: 'EXECUTE_ALLOWED' as const }

describe('candidatos', () => {
  it('acha quem cobre o domínio', () => {
    expect(candidatos('sales').length).toBeGreaterThan(0)
  })

  it('domínio sem dono devolve vazio — e vazio é a resposta para "posso criar aqui"', () => {
    expect(candidatos('foguetes')).toHaveLength(0)
  })

  it('a ordem é ESTÁVEL entre chamadas — lista que muda faz a tela parecer quebrada', () => {
    const a = candidatos('finance').map(x => x.id)
    const b = candidatos('finance').map(x => x.id)

    expect(a).toEqual(b)
    expect(a).toEqual([...a].sort())
  })
})

describe('contratar — o Factory reaproveita', () => {
  it('domínio coberto devolve o AGENTE EXISTENTE, não um novo', () => {
    const r = contratar(NECESSIDADE)

    expect('agente' in r).toBe(true)
    expect('agente' in r && AGENTES.some(a => a.id === r.agente.id)).toBe(true)
  })

  it('o motivo é dito', () => {
    expect(contratar(NECESSIDADE)).toMatchObject({ motivo: 'dominio_coberto' })
  })

  it('o nível devolvido é o DO AGENTE — o pedido maior não eleva o teto', () => {
    // O teto é por domínio (r142). Pedir SUPERVISED_AUTONOMY não transforma o agente em supervisor.
    const r = contratar({ ...NECESSIDADE, nivel: 'SUPERVISED_AUTONOMY' })

    expect('nivelDoAgente' in r && r.nivelDoAgente).not.toBe('SUPERVISED_AUTONOMY')
  })

  it('DOMÍNIO SEM DONO: devolve sugestão, não cria — quem decide é uma pessoa', () => {
    const r = contratar({ descricao: 'x', dominio: 'foguetes', nivel: 'READ' })

    expect('error' in r).toBe(true)
    expect('suggestion' in r && r.suggestion).toContain('foguetes')
    // Não existe caminho em que `contratar` devolva um agente novo: o Factory não cria.
    expect('agente' in r).toBe(false)
  })

  it('domínio vazio recusa', () => {
    expect(contratar({ descricao: 'x', dominio: '   ', nivel: 'READ' })).toMatchObject({ error: 'dominio_ja_coberto' })
  })
})

describe('validarProposta — as quatro recusas', () => {
  it('id repetido é DUPLICATA', () => {
    expect(validarProposta({ capacidades: [], id: 'business_manager' })).toEqual({ error: 'duplicata' })
  })

  it('id vazio é duplicata (dois agentes sem identidade)', () => {
    expect(validarProposta({ capacidades: [], id: '  ' })).toEqual({ error: 'duplicata' })
  })

  it('DOMÍNIO JÁ COBERTO é recusado — "não criar bots duplicados para cada tarefa"', () => {
    expect(validarProposta({ capacidades: [{ dominio: 'sales', nivel: 'READ' }], id: 'agente_novo' })).toEqual({
      error: 'dominio_ja_coberto'
    })
  })

  it('domínio NOVO com nível normal é aceito', () => {
    expect(validarProposta({ capacidades: [{ dominio: 'foguetes', nivel: 'EXECUTE_ALLOWED' }], id: 'novo' })).toEqual({
      ok: true
    })
  })

  it('NÍVEL ACIMA DO PERMITIDO é recusado — um agente novo não nasce no topo', () => {
    // Um agente que já nascesse em SUPERVISED_AUTONOMY passaria por cima da decisão humana de conceder.
    expect(validarProposta({ capacidades: [{ dominio: 'foguetes', nivel: 'SUPERVISED_AUTONOMY' }], id: 'novo' })).toEqual({
      error: 'nivel_acima_do_permitido'
    })
  })

  it('nível inválido também é recusado', () => {
    expect(validarProposta({ capacidades: [{ dominio: 'foguetes', nivel: 'DEUS' }], id: 'novo' })).toEqual({
      error: 'nivel_acima_do_permitido'
    })
  })

  it('sem capacidade nenhuma é aceito — o agente pode nascer vazio', () => {
    expect(validarProposta({ capacidades: [], id: 'novo' })).toEqual({ ok: true })
  })
})

describe('recomendacao — a frase começa pelo que NÃO vai acontecer', () => {
  it('domínio coberto: diz qual agente, e manda não criar outro', () => {
    const r = recomendacao(NECESSIDADE)

    expect(r).toContain('Não crie outro')
    // A razão: dois donos do mesmo domínio duplicam permissão e erro.
    expect(r).toContain('duplica')
  })

  it('domínio sem dono: diz o que falta', () => {
    expect(recomendacao({ descricao: 'x', dominio: 'foguetes', nivel: 'READ' })).toContain('foguetes')
  })
})

describe('cobertura', () => {
  it('conta os candidatos', () => {
    expect(cobertura('sales')).toBe(candidatos('sales').length)
    expect(cobertura('foguetes')).toBe(0)
  })
})

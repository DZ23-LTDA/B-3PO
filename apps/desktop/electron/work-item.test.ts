// O trabalho pontual (r83 do GOAL V2) — o terceiro tipo do §12.
//
// A decisão que define o tipo: ELE EXPIRA. Organização não expira, projeto tem prazo como meta, trabalho
// pontual ACABA.

import { describe, expect, it } from 'vitest'

import {
  emAberto,
  expirado,
  mudarTrabalho,
  normalizarTrabalho,
  PRAZO_PADRAO_MS,
  resumoDosTrabalhos,
  TIPO_LABEL,
  TRABALHO_TIPOS,
  vencidos,
  type TrabalhoPontual
} from './work-item'

const CTX = { agora: 1_000, tenant_id: 'local' }

function item(extra: Partial<TrabalhoPontual> = {}): TrabalhoPontual {
  return {
    created_at: 0,
    entrega: null,
    expira_em: 1_000 + PRAZO_PADRAO_MS,
    id: 'tp-1',
    pedido: 'pesquisar concorrentes',
    status: 'pedido',
    tenant_id: 'local',
    tipo: 'pesquisa',
    updated_at: 0,
    ...extra
  }
}

describe('os 6 tipos do §12', () => {
  it('documento, pesquisa, apresentação, análise, código, artefato', () => {
    expect(TRABALHO_TIPOS).toEqual(['documento', 'pesquisa', 'apresentacao', 'analise', 'codigo', 'artefato'])
    expect(Object.keys(TIPO_LABEL)).toHaveLength(6)
  })
})

describe('normalizar', () => {
  it('nasce em PEDIDO, com prazo', () => {
    const r = normalizarTrabalho({ pedido: 'x', tipo: 'analise' }, CTX)

    expect('trabalho' in r && r.trabalho.status).toBe('pedido')
    expect('trabalho' in r && r.trabalho.expira_em).toBe(1_000 + PRAZO_PADRAO_MS)
  })

  it('tipo inválido recusa', () => {
    expect(normalizarTrabalho({ pedido: 'x', tipo: 'poema' }, CTX)).toEqual({ error: 'tipo_invalido' })
  })

  it('PEDIDO VAZIO recusa — um pedido sem pedido não é um pedido', () => {
    expect(normalizarTrabalho({ pedido: '  ', tipo: 'analise' }, CTX)).toEqual({ error: 'descricao_obrigatoria' })
  })

  it('prazo inválido recusa', () => {
    expect(normalizarTrabalho({ pedido: 'x', tipo: 'analise' }, { ...CTX, prazo_ms: 0 })).toEqual({
      error: 'prazo_invalido'
    })
  })

  it('o status do payload é ignorado', () => {
    const r = normalizarTrabalho({ pedido: 'x', status: 'entregue', tipo: 'analise' }, CTX)

    expect('trabalho' in r && r.trabalho.status).toBe('pedido')
  })
})

describe('a expiração — o que define o tipo', () => {
  it('pedido vencido expirou', () => {
    expect(expirado(item({ expira_em: 1_500 }), 2_000)).toBe(true)
  })

  it('pedido dentro do prazo não expirou', () => {
    expect(expirado(item({ expira_em: 5_000 }), 2_000)).toBe(false)
  })

  it('ENTREGUE não expira — o desfecho já aconteceu', () => {
    expect(expirado(item({ expira_em: 1_500, status: 'entregue' }), 2_000)).toBe(false)
  })

  it('DESCARTADO não expira — apagar o registro apagaria a decisão', () => {
    expect(expirado(item({ expira_em: 1_500, status: 'descartado' }), 2_000)).toBe(false)
  })
})

describe('as transições', () => {
  it('pedido → entregue, com onde e resumo', () => {
    const r = mudarTrabalho(item(), 'entregue', { onde: 'docs/pesquisa.md', resumo: '3 concorrentes' }, 2_000)

    expect(r).toMatchObject({ trabalho: { entrega: { onde: 'docs/pesquisa.md' }, status: 'entregue' } })
  })

  it('ENTREGA INCOMPLETA recusa — sem lugar não é entrega, é promessa', () => {
    expect(mudarTrabalho(item(), 'entregue', { onde: '', resumo: 'x' }, 2_000)).toEqual({
      error: 'entrega_incompleta'
    })
    expect(mudarTrabalho(item(), 'entregue', { onde: 'x', resumo: '  ' }, 2_000)).toEqual({
      error: 'entrega_incompleta'
    })
    expect(mudarTrabalho(item(), 'entregue', {}, 2_000)).toEqual({ error: 'entrega_incompleta' })
  })

  it('pedido → descartado, sem exigir entrega', () => {
    expect(mudarTrabalho(item(), 'descartado', null, 2_000)).toMatchObject({ trabalho: { status: 'descartado' } })
  })

  it('ENTREGUE e DESCARTADO são finais', () => {
    expect(mudarTrabalho(item({ status: 'entregue' }), 'descartado', null, 2_000)).toEqual({
      error: 'trabalho_finalizado'
    })
    expect(mudarTrabalho(item({ status: 'descartado' }), 'entregue', { onde: 'x', resumo: 'y' }, 2_000)).toEqual({
      error: 'trabalho_finalizado'
    })
  })

  it('ENTREGAR UM VENCIDO é permitido — vencer não é motivo para recusar o que ficou pronto', () => {
    const r = mudarTrabalho(item({ expira_em: 1_500 }), 'entregue', { onde: 'x', resumo: 'y' }, 2_000)

    expect(r).toMatchObject({ trabalho: { status: 'entregue' } })
  })

  it('não dá para voltar a pedido', () => {
    expect(mudarTrabalho(item(), 'pedido', null, 2_000)).toMatchObject({ trabalho: { status: 'pedido' } })
  })
})

describe('as duas listas — e por que têm nomes diferentes', () => {
  it('emAberto NÃO inclui vencido', () => {
    const lista = [item({ id: 'a' }), item({ expira_em: 1_500, id: 'b' })]

    expect(emAberto(lista, 2_000).map(t => t.id)).toEqual(['a'])
  })

  it('vencidos é a outra pergunta, e tem nome próprio', () => {
    const lista = [item({ id: 'a' }), item({ expira_em: 1_500, id: 'b' })]

    expect(vencidos(lista, 2_000).map(t => t.id)).toEqual(['b'])
  })

  it('entregue não aparece em nenhuma das duas', () => {
    const lista = [item({ status: 'entregue' })]

    expect(emAberto(lista, 2_000)).toHaveLength(0)
    expect(vencidos(lista, 2_000)).toHaveLength(0)
  })
})

describe('o resumo', () => {
  it('separa em aberto, entregue e vencido', () => {
    const lista = [
      item({ id: 'a' }),
      item({ id: 'b', status: 'entregue' }),
      item({ expira_em: 1_500, id: 'c' })
    ]

    const s = resumoDosTrabalhos(lista, 2_000)

    expect(s).toContain('1 em aberto')
    expect(s).toContain('1 entregue')
    // A vencida é dita separada: NÃO conta como trabalho, e alguém precisa resolver.
    expect(s).toContain('1 vencido')
  })

  it('vazio é dito', () => {
    expect(resumoDosTrabalhos([], 2_000)).toContain('Nenhum trabalho')
  })
})

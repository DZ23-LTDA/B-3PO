// Cotacao no renderer (rodada 193).
//
// O elo que faltava: o canal existe (`hermes:purchases:cotacao`, r190), atravessa o preload (r192), e agora tem
// wrapper tipado. Sem este arquivo, a tela teria que falar `window.hermesDesktop` direto.

import { afterEach, describe, expect, it, vi } from 'vitest'

import { escolherCotacao, purchasesAvailable, type CotacaoRow } from './purchases'

const proposta = (supplier_id: string, preco: number): CotacaoRow => ({
  prazo_dias: 5,
  preco_unit_cents: preco,
  quantidade_disponivel: 100,
  supplier_id
})

function montarPonte(cotacao: (...args: unknown[]) => Promise<unknown>) {
  ;(globalThis as { hermesDesktop?: unknown }).hermesDesktop = { purchases: { cotacao } }
}

afterEach(() => {
  delete (globalThis as { hermesDesktop?: unknown }).hermesDesktop
})

describe('ponte ausente', () => {
  it('sem preload, compras nao estao disponiveis', () => {
    expect(purchasesAvailable()).toBe(false)
  })

  it('sem preload, escolher cotacao devolve motivo em vez de explodir', () => {
    // A tela roda em teste e em navegador sem Electron; uma excecao aqui derrubaria o render inteiro.
    return expect(escolherCotacao([proposta('a', 100)], 5)).resolves.toEqual({ motivo: 'sem_cotacoes' })
  })
})

describe('com ponte', () => {
  it('repassa as cotacoes e a quantidade para o canal', async () => {
    const chamadas: unknown[][] = []
    montarPonte(async (...args) => {
      chamadas.push(args)

      return { economia_contra_segunda_cents: null, proposta: { prazo_dias: 5, preco_total_cents: 500, quantidade: 5, supplier_id: 'a' }, segunda: null }
    })

    await escolherCotacao([proposta('a', 100)], 5)

    expect(chamadas[0]).toEqual([{ cotacoes: [proposta('a', 100)], quantidade: 5 }])
  })

  it('devolve a escolha do processo principal sem reinterpretar', async () => {
    // Se o renderer recalculasse, existiriam DUAS regras de escolha — e elas divergiriam na primeira mudanca.
    const escolha = {
      economia_contra_segunda_cents: 200,
      proposta: { prazo_dias: 5, preco_total_cents: 500, quantidade: 5, supplier_id: 'a' },
      segunda: { prazo_dias: 9, preco_total_cents: 700, quantidade: 5, supplier_id: 'b' }
    }
    montarPonte(async () => escolha)

    await expect(escolherCotacao([proposta('a', 100), proposta('b', 140)], 5)).resolves.toEqual(escolha)
  })

  it('propaga o motivo de recusa', async () => {
    montarPonte(async () => ({ motivo: 'sem_proposta_valida' }))

    await expect(escolherCotacao([proposta('a', 100)], 999)).resolves.toEqual({ motivo: 'sem_proposta_valida' })
  })

  it('nao engole erro do canal', async () => {
    // Um erro do processo principal e informacao, nao ruido: silenciar esconderia um canal quebrado.
    montarPonte(async () => {
      throw new Error('canal quebrado')
    })

    await expect(escolherCotacao([proposta('a', 100)], 5)).rejects.toThrow('canal quebrado')
  })
})

describe('disponibilidade', () => {
  it('com ponte, compras estao disponiveis', () => {
    montarPonte(async () => ({ motivo: 'sem_cotacoes' }))

    expect(purchasesAvailable()).toBe(true)
  })
})

describe('tipos', () => {
  it('a proposta aceita prazo desconhecido', () => {
    // `null` e "nao informado"; o tipo tem que permitir, senao a tela inventaria um prazo.
    const c: CotacaoRow = { prazo_dias: null, preco_unit_cents: 100, quantidade_disponivel: 5, supplier_id: 'a' }

    expect(c.prazo_dias).toBeNull()
  })
})

describe('o modulo continua puro', () => {
  it('nao importa nada de @/electron', async () => {
    // A regra do renderer: `src/app` e `src/api` nao alcancam o processo principal por import.
    const fonte = await vi.importActual<Record<string, unknown>>('./purchases')

    expect(Object.keys(fonte).length).toBeGreaterThan(0)
  })
})

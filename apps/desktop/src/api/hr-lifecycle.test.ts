// Offboarding e treinamentos no renderer (rodada 202).
//
// A r191 criou os canais de RH e nao havia wrapper em `src/api`: mesma divida da cotacao, um dominio ao lado.

import { afterEach, describe, expect, it, vi } from 'vitest'

import { avaliarOffboarding, hrAvailable, treinamentosImpeditivos } from './hr'

afterEach(() => {
  delete (globalThis as { hermesDesktop?: unknown }).hermesDesktop
})

describe('sem preload', () => {
  it('hr nao esta disponivel', () => {
    expect(hrAvailable()).toBe(false)
  })

  it('offboarding devolve "nada a fazer" em vez de lancar', () => {
    // A tela roda em teste e em navegador sem Electron. Uma excecao aqui derrubaria o render inteiro.
    return expect(avaliarOffboarding(['cracha'], [])).resolves.toEqual({
      bloqueia_acesso: false,
      pendentes: [],
      pode_encerrar: true
    })
  })

  it('treinamentos devolve lista vazia em vez de lancar', () => {
    return expect(treinamentosImpeditivos([], 1000)).resolves.toEqual([])
  })
})

describe('com preload', () => {
  it('offboarding repassa exigidos e concluidos', async () => {
    const chamadas: unknown[] = []
    ;(globalThis as { hermesDesktop?: unknown }).hermesDesktop = {
      hr: {
        offboarding: async (p: unknown) => {
          chamadas.push(p)

          return { bloqueia_acesso: true, pendentes: ['acesso_sistemas'], pode_encerrar: false }
        }
      }
    }

    await avaliarOffboarding(['acesso_sistemas', 'cracha'], ['cracha'])

    expect(chamadas[0]).toEqual({ concluidos: ['cracha'], exigidos: ['acesso_sistemas', 'cracha'] })
  })

  it('offboarding devolve o resultado do processo principal sem reinterpretar', async () => {
    // Se o renderer recalculasse, existiriam DUAS regras de desligamento.
    const esperado = { bloqueia_acesso: false, pendentes: ['cracha'], pode_encerrar: false }
    ;(globalThis as { hermesDesktop?: unknown }).hermesDesktop = { hr: { offboarding: async () => esperado } }

    await expect(avaliarOffboarding(['cracha'], [])).resolves.toEqual(esperado)
  })

  it('treinamentos repassa o `agora` recebido', async () => {
    const chamadas: unknown[] = []
    ;(globalThis as { hermesDesktop?: unknown }).hermesDesktop = {
      hr: {
        treinamentos: async (p: unknown) => {
          chamadas.push(p)

          return { impeditivos: [{ id: 'nr-35', situacao: 'vencido' }] }
        }
      }
    }

    const r = await treinamentosImpeditivos(
      [{ concluido_em: 1, id: 'nr-35', obrigatorio: true, validade_dias: 365 }],
      1_800_000_000_000
    )

    expect(chamadas[0]).toMatchObject({ agora: 1_800_000_000_000 })
    expect(r).toEqual([{ id: 'nr-35', situacao: 'vencido' }])
  })

  it('resposta sem a lista nao explode', async () => {
    ;(globalThis as { hermesDesktop?: unknown }).hermesDesktop = { hr: { treinamentos: async () => ({}) } }

    await expect(treinamentosImpeditivos([], 1)).resolves.toEqual([])
  })

  it('hr fica disponivel com preload', () => {
    ;(globalThis as { hermesDesktop?: unknown }).hermesDesktop = { hr: { departments: async () => ({ departments: [] }) } }

    expect(hrAvailable()).toBe(true)
  })
})

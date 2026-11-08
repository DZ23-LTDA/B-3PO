/**
 * O ponto de encontro entre o contexto e o transporte (r274).
 *
 * **O que este arquivo prova**: o `api/client.ts` não conhece o produto, e o produto não conhece o
 * transporte. Eles se encontram numa variável de módulo que o app instala — e **sem instalação não
 * há chave enviada**, que é o estado correto para a TUI, o web e os testes.
 */

import { afterEach, describe, expect, it } from 'vitest'

import {
  contextoDoProduto,
  instalarContextoDoProduto,
  limparContextoDoProduto
} from './contexto-do-produto'

afterEach(() => {
  limparContextoDoProduto()
})

describe('o contexto do produto no envio', () => {
  it('sem provider instalado não há contexto — e nenhuma chave viaja', () => {
    expect(contextoDoProduto()).toBeNull()
  })

  it('o provider instalado é quem responde', () => {
    instalarContextoDoProduto(() => 'Empresa · 3 escopos')

    expect(contextoDoProduto()).toBe('Empresa · 3 escopos')
  })

  it('o provider é lido A CADA chamada, não capturado', () => {
    let ambiente = 'Empresa'

    instalarContextoDoProduto(() => ambiente)

    expect(contextoDoProduto()).toBe('Empresa')

    // A troca de ambiente no seletor precisa aparecer no PRÓXIMO envio, sem reinstalar nada.
    ambiente = 'Administração'
    expect(contextoDoProduto()).toBe('Administração')
  })

  it('desinstalar devolve o estado "sem contexto"', () => {
    const desinstalar = instalarContextoDoProduto(() => 'Engenharia')

    expect(contextoDoProduto()).toBe('Engenharia')

    desinstalar()
    expect(contextoDoProduto()).toBeNull()
  })

  it('desinstalar é idempotente e não derruba um provider mais novo', () => {
    const primeiro = instalarContextoDoProduto(() => 'primeiro')
    const segundo = instalarContextoDoProduto(() => 'segundo')

    // O desinstalador do primeiro não pode apagar o segundo: cada provider só remove a si mesmo.
    primeiro()
    expect(contextoDoProduto()).toBe('segundo')

    segundo()
    expect(contextoDoProduto()).toBeNull()
  })

  it('provider que devolve null não vira a string "null"', () => {
    instalarContextoDoProduto(() => null)

    expect(contextoDoProduto()).toBeNull()
  })
})

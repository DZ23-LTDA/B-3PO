/**
 * O enriquecimento do `prompt.submit` com o contexto do produto (r274).
 *
 * **O que este teste guarda é a FORMA do que viaja** — e três invariantes que um refactor
 * apressado quebraria em silêncio:
 *
 * 1. só `prompt.submit` é enriquecido (nenhum outro RPC herda um conceito que não é dele);
 * 2. sem contexto, **nenhuma chave** é enviada (campo vazio diria "sabe que não há nada");
 * 3. os params originais voltam **intactos** (o enriquecimento não é uma reescrita).
 */

import { afterEach, describe, expect, it } from 'vitest'

import { comContextoDoProduto } from './client'
import { instalarContextoDoProduto, limparContextoDoProduto } from './contexto-do-produto'

afterEach(() => {
  limparContextoDoProduto()
})

describe('o contexto no prompt.submit', () => {
  it('acrescenta o campo ao submit, sem tocar no resto', () => {
    instalarContextoDoProduto(() => 'Empresa · 3 escopos')

    const params = { session_id: 's1', text: 'qual o faturamento?', submission_id: 'x' }
    const enviado = comContextoDoProduto('prompt.submit', params)

    expect(enviado.produto_contexto).toBe('Empresa · 3 escopos')
    expect(enviado.session_id).toBe('s1')
    expect(enviado.text).toBe('qual o faturamento?')
    expect(enviado.submission_id).toBe('x')
    // O original não é mutado: o chamador pode reusar os params.
    expect(params).not.toHaveProperty('produto_contexto')
  })

  it('NENHUM outro método é enriquecido', () => {
    instalarContextoDoProduto(() => 'Empresa')

    for (const method of ['session.list', 'session.resume', 'clarify.respond', 'slash.exec']) {
      expect(comContextoDoProduto(method, { a: 1 })).toEqual({ a: 1 })
    }
  })

  it('sem contexto, nenhuma chave viaja', () => {
    instalarContextoDoProduto(() => null)

    const params = { session_id: 's1' }
    expect(comContextoDoProduto('prompt.submit', params)).toEqual(params)
    expect(comContextoDoProduto('prompt.submit', params)).not.toHaveProperty('produto_contexto')
  })

  it('sem provider, nenhuma chave viaja (TUI, web, teste)', () => {
    expect(comContextoDoProduto('prompt.submit', { text: 'oi' })).toEqual({ text: 'oi' })
  })
})

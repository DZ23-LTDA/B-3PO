import { describe, expect, it } from 'vitest'

import { isStaleSession } from './session-guard'

describe('guarda de geracao da sessao', () => {
  it('pedido da geracao atual nao e velho', () => {
    expect(isStaleSession(3, 3)).toBe(false)
  })

  it('desconectar no meio do caminho invalida o pedido em voo', () => {
    // connect() comecou na geracao 3; o usuario tocou em Desconectar e a geracao virou 4.
    expect(isStaleSession(3, 4)).toBe(true)
  })

  it('qualquer geracao diferente conta como velha (nao so a imediatamente anterior)', () => {
    expect(isStaleSession(1, 9)).toBe(true)
    expect(isStaleSession(9, 1)).toBe(true)
  })
})

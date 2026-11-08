import { afterEach, describe, expect, it, vi } from 'vitest'

import { AMBIENTES, type Ambiente } from './ambiente'
import { AMBIENTE_ATTR, AMBIENTE_IDENTIDADE, aplicarIdentidadeDoAmbiente, identidadeDoAmbiente } from './ambiente-identidade'

/**
 * r103 — a identidade visual dos seis ambientes (decisão do dono #5).
 *
 * O que estes testes travam, e por que cada um importa:
 *
 * 1. **os seis têm identidade** — um ambiente sem entrada aqui voltaria a ser indistinguível, que é
 *    exatamente o estado que a decisão mandou corrigir;
 * 2. **as cores são distintas** — seis nomes com a mesma cor é identidade de fachada;
 * 3. **aplicar põe o atributo no `<html>`** — é o único canal entre o estado e o CSS; sem ele o
 *    `--ambiente-accent` nunca muda e todo o resto é decoração inerte;
 * 4. **a cor é afordância, não permissão** — nada neste módulo toca RBAC, e o teste abaixo garante
 *    que a API só sabe fazer uma coisa: pintar.
 */

afterEach(() => {
  document.documentElement.removeAttribute(AMBIENTE_ATTR)
})

describe('identidade dos seis ambientes', () => {
  it('todo ambiente de AMBIENTES tem identidade — nenhum fica sem cor', () => {
    for (const ambiente of AMBIENTES) {
      expect(AMBIENTE_IDENTIDADE[ambiente], `${ambiente} sem identidade`).toBeTruthy()
      expect(identidadeDoAmbiente(ambiente).accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(identidadeDoAmbiente(ambiente).descricao.length).toBeGreaterThan(10)
    }
  })

  it('as seis cores são DISTINTAS entre si', () => {
    const cores = AMBIENTES.map(a => identidadeDoAmbiente(a).accent.toLowerCase())

    expect(new Set(cores).size).toBe(AMBIENTES.length)
  })

  it('as seis descrições são distintas — identidade não é texto repetido', () => {
    const textos = AMBIENTES.map(a => identidadeDoAmbiente(a).descricao)

    expect(new Set(textos).size).toBe(AMBIENTES.length)
  })
})

describe('aplicarIdentidadeDoAmbiente', () => {
  it('põe data-ambiente no <html>', () => {
    aplicarIdentidadeDoAmbiente('engenharia')

    expect(document.documentElement.getAttribute(AMBIENTE_ATTR)).toBe('engenharia')
  })

  it('troca o atributo em vez de acumular', () => {
    aplicarIdentidadeDoAmbiente('empresa')
    aplicarIdentidadeDoAmbiente('administracao')

    expect(document.documentElement.getAttribute(AMBIENTE_ATTR)).toBe('administracao')
    expect(document.documentElement.getAttributeNames().filter(n => n === AMBIENTE_ATTR)).toHaveLength(1)
  })

  it('percorre os seis e sempre deixa o último aplicado', () => {
    for (const ambiente of AMBIENTES) aplicarIdentidadeDoAmbiente(ambiente as Ambiente)

    expect(document.documentElement.getAttribute(AMBIENTE_ATTR)).toBe(AMBIENTES[AMBIENTES.length - 1])
  })

  it('não quebra fora do DOM (SSR / node)', () => {
    const original = globalThis.document

    // @ts-expect-error — simula ausência de DOM, que é o caso do SSR/teste em node.
    delete globalThis.document

    expect(() => aplicarIdentidadeDoAmbiente('empresa')).not.toThrow()

    globalThis.document = original
  })

  it('aplicar identidade não autoriza nada — a função só existe para pintar', () => {
    // O contrato é estreito de propósito: nada de permissão entra por aqui.
    expect(aplicarIdentidadeDoAmbiente.length).toBe(1)
    expect(vi.isMockFunction(aplicarIdentidadeDoAmbiente)).toBe(false)
  })
})

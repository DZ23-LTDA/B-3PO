// O ambiente ativo (r123 do GOAL V2).

import { beforeEach, describe, expect, it } from 'vitest'

import {
  $ambiente,
  AMBIENTE_STORAGE_KEY,
  alternarAmbiente,
  recarregarAmbiente,
  setAmbiente
} from './ambiente'

beforeEach(() => {
  localStorage.clear()
  $ambiente.set('empresa')
})

describe('o padrão', () => {
  it('EMPESA é o padrão — quem abre o produto para tocar o negócio é a maioria', () => {
    expect($ambiente.get()).toBe('empresa')
  })
})

describe('trocar', () => {
  it('setAmbiente grava e muda o átomo', () => {
    setAmbiente('engenharia')

    expect($ambiente.get()).toBe('engenharia')
    expect(localStorage.getItem(AMBIENTE_STORAGE_KEY)).toBe('engenharia')
  })

  it('alternarAmbiente vai e volta', () => {
    alternarAmbiente()
    expect($ambiente.get()).toBe('engenharia')

    alternarAmbiente()
    expect($ambiente.get()).toBe('empresa')
  })
})

describe('valor inválido não vira ambiente', () => {
  it('qualquer coisa que não seja os dois vira o PADRÃO, não um terceiro estado', () => {
    // Um valor corrompido no localStorage não pode deixar a tela sem ambiente nenhum.
    for (const ruim of ['outro', '', 'EMPRESA', null, undefined, 42, {}]) {
      setAmbiente(ruim)

      expect($ambiente.get()).toBe('empresa')
    }
  })
})

describe('recarregar lê o que está gravado', () => {
  it('outra janela trocou — recarregar adota', () => {
    // O evento `storage` não dispara na aba que escreveu: quem quer o valor de fora relê.
    localStorage.setItem(AMBIENTE_STORAGE_KEY, 'engenharia')

    recarregarAmbiente()

    expect($ambiente.get()).toBe('engenharia')
  })

  it('gravado com lixo — recarregar volta ao padrão', () => {
    localStorage.setItem(AMBIENTE_STORAGE_KEY, 'nao-existe')

    recarregarAmbiente()

    expect($ambiente.get()).toBe('empresa')
  })
})

describe('a chave é versionada', () => {
  it('tem .v1 — uma mudança de forma não lê o antigo como novo', () => {
    expect(AMBIENTE_STORAGE_KEY).toContain('.v1')
  })
})

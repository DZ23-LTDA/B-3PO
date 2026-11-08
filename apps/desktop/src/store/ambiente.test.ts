// O ambiente ativo (r123 do GOAL V2).

import { beforeEach, describe, expect, it } from 'vitest'

import { AMBIENTES } from '@/lib/ambiente'

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

  /**
   * r271: com SEIS ambientes, "vai e volta" deixou de ser verdade — e o teste antigo afirmava
   * exatamente isso. **Ele não foi removido**: foi trocado pelo que a função passou a prometer —
   * **ciclar por todos**, na ordem de `AMBIENTES`, e voltar ao primeiro depois do último.
   *
   * O caso que o teste antigo não pegava: quem estava em `ia` apertava e caía em `empresa`,
   * deixando `automacao`, `estrategico` e `administracao` **inalcançáveis pelo botão**.
   */
  it('alternarAmbiente CICLA pelos seis e volta ao primeiro', () => {
    setAmbiente('empresa')

    const visitados: string[] = []

    for (let i = 0; i < AMBIENTES.length; i++) {
      alternarAmbiente()
      visitados.push($ambiente.get())
    }

    // Um ciclo completo passa por todos, sem repetir e sem pular — e termina no primeiro.
    expect(visitados).toEqual([...AMBIENTES.slice(1), AMBIENTES[0]])
    expect($ambiente.get()).toBe('empresa')

    // E de um ambiente do MEIO também avança: era isto que o interruptor de duas posições errava.
    setAmbiente('ia')
    alternarAmbiente()
    expect($ambiente.get()).toBe('estrategico')
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

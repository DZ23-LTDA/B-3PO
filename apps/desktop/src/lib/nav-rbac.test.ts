// O menu conforme o RBAC (r170 do GOAL V2, §13).

import { describe, expect, it } from 'vitest'

import type { ActorRow } from '@/api/admin'
import { ORDEM_DO_NIVEL, menuDoAtor, podeLer } from './nav-rbac'

const ATOR = (nivel: null | string): ActorRow => ({
  active: true,
  id: 'a1',
  kind: 'human',
  level: nivel,
  name: 'Dono',
  role: 'owner',
  scopes: []
})

describe('o menu segue o nivel do ator', () => {
  it('READ ve o menu', () => {
    expect(podeLer(ATOR('READ'))).toBe(true)
  })

  it('quem executa tambem le — executar implica ler', () => {
    for (const nivel of ['RECOMMEND', 'PREPARE', 'EXECUTE_ALLOWED', 'SUPERVISED_AUTONOMY']) {
      expect(podeLer(ATOR(nivel))).toBe(true)
    }
  })

  it('nivel null NAO le — null nao e "todos os poderes"', () => {
    expect(podeLer(ATOR(null))).toBe(false)
  })

  it('nivel desconhecido nao le', () => {
    expect(podeLer(ATOR('NIVEL_QUE_NAO_EXISTE'))).toBe(false)
  })
})

describe('sem ator, o menu aparece inteiro', () => {
  it('null devolve a lista — um menu vazio por erro de carga e menos diagnostico', () => {
    // O `whoami` devolve null quando a ponte ainda nao esta pronta (janela abrindo, teste). Esconder tudo
    // nesse instante deixaria a barra vazia por um erro de carregamento, e um menu vazio nao e mais seguro.
    expect(podeLer(null)).toBe(true)
    expect(menuDoAtor([{ label: 'a' }, { label: 'b' }], null)).toHaveLength(2)
  })

  it('e com ator sem nivel, a lista fica vazia', () => {
    expect(menuDoAtor([{ label: 'a' }, { label: 'b' }], ATOR(null))).toHaveLength(0)
  })
})

describe('a ordem dos niveis e a do rbac.ts', () => {
  it('EXECUTE_ALLOWED e 3 e SUPERVISED_AUTONOMY e 4 — nao o que eu inventei', () => {
    // A primeira versao deste arquivo tinha EXECUTE_ALLOWED: 4 e WRITE: 3. Nao existe nivel WRITE.
    expect(ORDEM_DO_NIVEL['EXECUTE_ALLOWED']).toBe(3)
    expect(ORDEM_DO_NIVEL['SUPERVISED_AUTONOMY']).toBe(4)
    expect(ORDEM_DO_NIVEL['READ']).toBe(0)
    expect(ORDEM_DO_NIVEL['READ']).toBeLessThan(ORDEM_DO_NIVEL['RECOMMEND'] as number)
    expect(ORDEM_DO_NIVEL['RECOMMEND']).toBeLessThan(ORDEM_DO_NIVEL['PREPARE'] as number)
    expect(ORDEM_DO_NIVEL['PREPARE']).toBeLessThan(ORDEM_DO_NIVEL['EXECUTE_ALLOWED'] as number)
    expect(ORDEM_DO_NIVEL['EXECUTE_ALLOWED']).toBeLessThan(ORDEM_DO_NIVEL['SUPERVISED_AUTONOMY'] as number)
  })

  it('e nao tem WRITE', () => {
    expect(ORDEM_DO_NIVEL['WRITE']).toBeUndefined()
  })
})

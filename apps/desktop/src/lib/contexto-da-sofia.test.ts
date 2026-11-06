/**
 * O contrato do contexto da Sofia (r270).
 *
 * **O teste que importa é o do caso NEGADO**: o contexto é descritivo, e a garantia que este
 * arquivo precisa provar é que ele **nunca descreve mais do que o ator pode ler**. Se algum dia
 * alguém "otimizar" o `podeLer` daqui para fora, é este teste que cai.
 */

import { describe, expect, it } from 'vitest'

import type { ActorRow } from '@/api/admin'

import { contextoDaSofia, descreverContexto, PROJETO_TODOS } from './contexto-da-sofia'

const ATOR: ActorRow = {
  active: true,
  id: 'u1',
  kind: 'human',
  level: 'EXECUTE_ALLOWED',
  name: 'Leandro',
  role: 'proprietario',
  scopes: ['catalog', 'finance', 'sales']
}

const SEM_LEITURA: ActorRow = { ...ATOR, level: null }

describe('contexto da Sofia', () => {
  it('descreve o ambiente pelo rótulo humano, não pelo id', () => {
    const c = contextoDaSofia({ ambiente: 'administracao', ator: ATOR, projeto: null })

    expect(c.ambiente).toBe('administracao')
    expect(c.ambienteRotulo).toBe('Administração')
  })

  it('leva os escopos do ator quando ele pode ler', () => {
    const c = contextoDaSofia({ ambiente: 'empresa', ator: ATOR, projeto: null })

    expect(c.acesso).toBe('autorizado')
    expect(c.escopos).toEqual(['catalog', 'finance', 'sales'])
  })

  it('NÃO leva escopo nenhum quando o ator não pode ler', () => {
    const c = contextoDaSofia({ ambiente: 'empresa', ator: SEM_LEITURA, projeto: null })

    // A garantia central: descrever menos é a única coisa que este arquivo pode fazer.
    expect(c.acesso).toBe('negado')
    expect(c.escopos).toEqual([])
  })

  it('separa "ainda não sei" de "não pode" — as duas pedem reações diferentes', () => {
    const desconhecido = contextoDaSofia({ ambiente: 'empresa', ator: null, projeto: null })
    const negado = contextoDaSofia({ ambiente: 'empresa', ator: SEM_LEITURA, projeto: null })

    expect(desconhecido.acesso).toBe('desconhecido')
    expect(negado.acesso).toBe('negado')
    expect(desconhecido.escopos).toEqual([])
    expect(negado.escopos).toEqual([])
  })

  it('"todos os projetos" vira null, não o sentinela', () => {
    expect(contextoDaSofia({ ambiente: 'empresa', ator: ATOR, projeto: PROJETO_TODOS }).projeto).toBeNull()
    expect(contextoDaSofia({ ambiente: 'empresa', ator: ATOR, projeto: null }).projeto).toBeNull()
    expect(contextoDaSofia({ ambiente: 'empresa', ator: ATOR, projeto: 'obra-42' }).projeto).toBe('obra-42')
  })

  it('a frase mostrada diz onde a pessoa está, e o impedimento quando há', () => {
    expect(descreverContexto(contextoDaSofia({ ambiente: 'empresa', ator: ATOR, projeto: null }))).toBe(
      'Empresa · 3 escopos'
    )
    // Autorizado sem escopo diz isso: 0 escopo é informação, não ausência de frase.
    expect(
      descreverContexto(contextoDaSofia({ ambiente: 'empresa', ator: { ...ATOR, scopes: [] }, projeto: null }))
    ).toBe('Empresa · nenhum escopo liberado')
    expect(descreverContexto(contextoDaSofia({ ambiente: 'ia', ator: ATOR, projeto: 'bot-7' }))).toBe(
      'IA e Agentes · projeto bot-7 · 3 escopos'
    )
    expect(descreverContexto(contextoDaSofia({ ambiente: 'empresa', ator: SEM_LEITURA, projeto: null }))).toContain(
      'sem permissão'
    )
    expect(descreverContexto(contextoDaSofia({ ambiente: 'empresa', ator: null, projeto: null }))).toContain(
      'ainda não resolvida'
    )
  })
})

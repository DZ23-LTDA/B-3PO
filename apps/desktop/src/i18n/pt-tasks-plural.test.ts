import { describe, expect, it } from 'vitest'

import { pt } from './pt'

// A rodada 152 corrigiu "1 atrasada(s)" para plural real. O teste de cobertura compara apenas NOMES de
// placeholder, entao ele nao prova que a palavra flexiona — este arquivo prova o texto renderizado.
describe('contagem de tarefas em português', () => {
  const resumo = pt.settings.crmTasks.summaryLate

  it('usa singular com uma tarefa atrasada', () => {
    expect(resumo(2, 1)).toBe('2 abertas · 1 atrasada')
  })

  it('usa plural com duas ou mais atrasadas', () => {
    expect(resumo(3, 2)).toBe('3 abertas · 2 atrasadas')
  })

  it('usa plural no zero (nada de "0 atrasada")', () => {
    expect(resumo(1, 0)).toBe('1 abertas · 0 atrasadas')
  })

  it('nao deixa parênteses de gênero no texto', () => {
    expect(resumo(5, 3)).not.toContain('(s)')
  })
})

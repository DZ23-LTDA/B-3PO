// Fronteira de acesso à máquina (r9 do GOAL V2).
//
// POR QUE ESTA FRONTEIRA É DIFERENTE DE `exigirAtor`
//
// `exigirAtor` responde "esta pessoa pode lançar no financeiro?" — decide por **recurso de negócio**.
// `git:review:push` e `createPr` não são recursos de negócio: são **publicação para fora da máquina**.
//
// Se as duas usassem o mesmo critério, um operador de vendas com nível alto no domínio `sales` passaria a
// poder dar `git push` no repositório da empresa — porque a guarda só olharia o nível.

import { describe, expect, it } from 'vitest'

import { podeOperarMaquina, RECUSA_MAQUINA } from './machine-access'
import type { Actor, Level, Role } from './rbac'

function ator(level: Level | null, role: Role): Actor {
  return { id: 'a', kind: 'human', level, role }
}

describe('fronteira de máquina', () => {
  it('sem ator, nada é permitido', () => {
    expect(podeOperarMaquina(null, 'leitura')).toBe(false)
    expect(podeOperarMaquina(null, 'escrita')).toBe(false)
    expect(podeOperarMaquina(null, 'externo')).toBe(false)
  })

  it('nível nulo não é "acesso padrão"', () => {
    expect(podeOperarMaquina(ator(null, 'owner'), 'leitura')).toBe(false)
    expect(podeOperarMaquina(ator(null, 'owner'), 'externo')).toBe(false)
  })

  it('leitura de máquina basta com qualquer nível efetivo', () => {
    // status, diff e lista de branches já aparecem na tela de revisão: não publicam, não alteram.
    expect(podeOperarMaquina(ator('READ', 'viewer'), 'leitura')).toBe(true)
    expect(podeOperarMaquina(ator('EXECUTE_ALLOWED', 'owner'), 'leitura')).toBe(true)
  })

  it('escrita exige poder de execução', () => {
    expect(podeOperarMaquina(ator('READ', 'viewer'), 'escrita')).toBe(false)
    expect(podeOperarMaquina(ator('PREPARE', 'operator'), 'escrita')).toBe(false)
    expect(podeOperarMaquina(ator('EXECUTE_ALLOWED', 'operator'), 'escrita')).toBe(true)
    expect(podeOperarMaquina(ator('SUPERVISED_AUTONOMY', 'manager'), 'escrita')).toBe(true)
  })

  it('externo exige executar E responder pela empresa', () => {
    // O operador pode escrever no repositório local, mas não publicar.
    expect(podeOperarMaquina(ator('EXECUTE_ALLOWED', 'operator'), 'externo')).toBe(false)
    expect(podeOperarMaquina(ator('SUPERVISED_AUTONOMY', 'manager'), 'externo')).toBe(false)

    // Só o dono publica: `git push` e `createPr` saem em nome da empresa.
    expect(podeOperarMaquina(ator('EXECUTE_ALLOWED', 'owner'), 'externo')).toBe(true)
    expect(podeOperarMaquina(ator('SUPERVISED_AUTONOMY', 'owner'), 'externo')).toBe(true)
  })

  it('leitura ampla não implica escrita: os três níveis são degraus reais', () => {
    const leitor = ator('READ', 'viewer')

    expect(podeOperarMaquina(leitor, 'leitura')).toBe(true)
    expect(podeOperarMaquina(leitor, 'escrita')).toBe(false)
    expect(podeOperarMaquina(leitor, 'externo')).toBe(false)
  })

  it('a recusa nomeia o motivo, não é um erro genérico', () => {
    expect(RECUSA_MAQUINA).toEqual({ error: 'sem_permissao', reason: 'capacidade_de_maquina' })
  })
})

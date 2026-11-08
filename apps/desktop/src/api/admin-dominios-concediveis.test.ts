// r8 do V5 — o invariante que a r7 violou.
//
// A r7 passou a exigir escopo de domínio para um bot operar a máquina. Certo. Mas `SCOPE_OPTIONS`
// (a lista que a tela de Agentes oferece) só tinha domínios de negócio: **ninguém conseguia conceder**
// terminal, git, fs ou plugin-files. Proteger o recurso destruindo o acesso a ele é o que o rubric do
// repositório chama de fix que destrói o que protege.
//
// Este teste não lê fonte: compara dois valores exportados.
import { expect, test } from 'vitest'
import { SCOPE_OPTIONS } from './admin'
import { DOMINIOS_DE_MAQUINA } from '../../electron/machine-access'

test('todo domínio de máquina é concedível pela interface', () => {
  const concediveis = new Set<string>(SCOPE_OPTIONS)
  const semConcessao = DOMINIOS_DE_MAQUINA.filter(dominio => !concediveis.has(dominio))

  expect(semConcessao).toEqual([])
})

test('os domínios de máquina são nomes distintos e não vazios', () => {
  expect(DOMINIOS_DE_MAQUINA.length).toBe(new Set(DOMINIOS_DE_MAQUINA).size)
  expect(DOMINIOS_DE_MAQUINA.every(d => typeof d === 'string' && d.trim() === d && d.length > 0)).toBe(true)
})

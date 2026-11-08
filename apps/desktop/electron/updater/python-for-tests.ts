// Resolvedor do interpretador Python para os testes de atualização (r14 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// `checkout-legacy.test.ts` montava o probe assim:
//
//   python: process.env.HERMES_PYTHON || 'python3'
//
// No Windows, `python3` é o **stub da Microsoft Store**: um executável de 0 byte que imprime
// "Python não foi encontrado; executar sem argumentos para instalar do Microsoft Store" e sai com 9009.
//
// O teste então falhava com:
//
//   Error: Command failed: python3 -c from pathlib import Path; ...
//   Python não foi encontrado; ...
//
// Não é bug do produto: é o teste **assumindo um executável que não existe nesta máquina**. A r247
// classificou 13 das 40 falhas do suite exatamente assim — e esta é uma delas.
//
// O QUE ELE FAZ
//
// Ordem de preferência, cada candidato VALIDADO por execução (não basta existir no PATH):
//
//   1. `HERMES_PYTHON` — o ambiente de teste do projeto, quando definido
//   2. `python`        — o nome correto no Windows moderno
//   3. `python3`       — o nome correto no Linux/macOS
//
// A validação executa `-c "import sys"`: o stub da Store EXISTE no PATH e mesmo assim falha, então só
// a execução prova. Um candidato que não responde é descartado e o próximo é tentado.
//
// QUANDO NINGUÉM RESPONDE
//
// Devolve `null`. O teste que chamar pula com mensagem explícita em vez de falhar com um erro de spawn
// que não diz nada sobre o produto.

import { execFileSync } from 'node:child_process'

/** Candidatos na ordem em que são tentados. */
export function candidatosPython(env: NodeJS.ProcessEnv = process.env): string[] {
  const lista: string[] = []

  if (env['HERMES_PYTHON']) lista.push(env['HERMES_PYTHON'])

  // `python` primeiro no Windows (onde `python3` costuma ser o stub da Store); `python3` primeiro nos
  // outros, onde `python` pode ser Python 2 ou nem existir.
  if (process.platform === 'win32') {
    lista.push('python', 'python3')
  } else {
    lista.push('python3', 'python')
  }

  return lista
}

/** `true` quando o executável responde de verdade a um `import sys`. */
export function pythonResponde(exe: string): boolean {
  try {
    execFileSync(exe, ['-c', 'import sys'], { stdio: 'ignore', timeout: 10_000, windowsHide: true })

    return true
  } catch {
    return false
  }
}

/**
 * O primeiro Python que responde, ou `null`.
 *
 * `null` não é falha do produto — é ausência de insumo. Quem chama decide pular.
 */
export function resolverPython(env: NodeJS.ProcessEnv = process.env): null | string {
  for (const candidato of candidatosPython(env)) {
    if (pythonResponde(candidato)) return candidato
  }

  return null
}

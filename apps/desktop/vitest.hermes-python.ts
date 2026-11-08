/**
 * HERMES_PYTHON for the electron contracts that drive real hermes_cli / pm code
 * (mac-sign, source-backend, checkout-source). CI exports the PM test
 * environment's interpreter; a developer's plain `npx vitest` does not, and the
 * PATH python3 lacks the application dependencies. Resolve the checkout's test
 * interpreter the way scripts/run_tests.sh does. Workers inherit process.env.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const repo = path.resolve(import.meta.dirname, '../..')

/**
 * r188 do GOAL V2: o Windows também resolve, e o `HERMES_PYTHON` ganhou um lugar a mais.
 *
 * **O `globalSetup` existia desde antes desta sessão e pulava no Windows:**
 *
 * ```ts
 * if (process.env.HERMES_PYTHON || process.platform === 'win32') return
 * ```
 *
 * **O comentário acima dizia por quê**: `scripts/run-in-hermes-env` é **bash**, e o Windows não tem o equivalente.
 * **O efeito** era o inverso do pretendido: **no Windows, onde `python3` é o stub da Store e o `python` do PATH não
 * tem as dependências, ninguém resolvia nada** — e os três contratos que precisam do interpretador
 * (`checkout-source`, `mac-sign`, `source-backend`) falhavam com `ModuleNotFoundError`.
 *
 * **A resolução aqui não decide nada por conta própria**: ela procura o venv do projeto nos lugares onde ele é
 * criado (`<repo>/.venv` ou ao lado do repo, como `b3po-testenv`), **valida por execução** e **só então** exporta.
 * **Se nenhum responder, a mensagem nomeia `HERMES_PYTHON`** — que continua sendo a saída para quem sabe onde o
 * interpretador está.
 */
function resolverNoWindows(): null | string {
  const candidatos = [
    path.join(repo, '.venv', 'Scripts', 'python.exe'),
    path.join(repo, '..', 'b3po-testenv', 'Scripts', 'python.exe')
  ]

  for (const candidato of candidatos) {
    if (!existsSync(candidato)) continue

    try {
      // Valida com a DEPENDÊNCIA do projeto, não só `import sys`: é ela que falta no python do PATH.
      execFileSync(candidato, ['-c', 'from hermes_cli.config import get_config_path'], {
        cwd: repo,
        env: { ...process.env, PYTHONPATH: repo },
        stdio: 'ignore',
        timeout: 30_000,
        windowsHide: true
      })

      return candidato
    } catch {
      // O próximo candidato.
    }
  }

  return null
}

export default function setup(): void {
  if (process.env.HERMES_PYTHON) {
    return
  }

  if (process.platform === 'win32') {
    const python = resolverNoWindows()

    if (python) {
      process.env.HERMES_PYTHON = python
    } else {
      console.warn(
        'vitest: no working Python for the Hermes contracts on Windows. ' +
          'Set HERMES_PYTHON to an interpreter that can import hermes_cli.'
      )
    }

    return
  }

  try {
    const python = execFileSync(
      'bash',
      [path.join(repo, 'scripts', 'run-in-hermes-env'), 'sh', '-c', 'printf %s "$__HERMES_TEST_PYTHON"'],
      { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
    )

    if (python) {
      process.env.HERMES_PYTHON = python
    }
  } catch (error: unknown) {
    // Electron tests that need no Python still run; only the contracts above fail, naming HERMES_PYTHON.
    console.warn(`vitest: could not resolve the Hermes test interpreter: ${String(error)}`)
  }
}

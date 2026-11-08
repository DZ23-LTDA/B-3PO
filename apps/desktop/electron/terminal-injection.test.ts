// Injecao de comando pelo `cwd` do terminal remoto (rodada 157).
//
// O CAMINHO QUE PARECIA PERIGOSO
//
// `hermes:terminal:start` recebe `payload.cwd` do renderer. No terminal LOCAL esse valor passa por
// `safeTerminalCwd`. No REMOTO, `payload.cwd` cru vai para `buildWindowsInteractiveCommand(cwd)`, que monta uma
// linha de PowerShell executada via SSH.
//
// Se aquela funcao concatenasse o caminho sem escapar, um renderer comprometido (ou um `cwd` vindo de um link)
// executaria comando arbitrario no computador remoto. Estes testes verificam o escape.

import { describe, expect, it } from 'vitest'

import { buildWindowsInteractiveCommand } from './windows-remote-lifecycle'

/**
 * O comando sai em -EncodedCommand (base64, UTF-16LE). Isso ja e uma barreira: nao ha parsing de aspas na
 * linha de comando. Para inspecionar o script, decodificamos.
 */
function scriptDecodificado(argv: string): string {
  const base64 = argv.match(/-EncodedCommand\s+([A-Za-z0-9+/=]+)/)?.[1] ?? ''

  return Buffer.from(base64, 'base64').toString('utf16le')
}

describe('buildWindowsInteractiveCommand', () => {
  it('nao inclui Set-Location quando o cwd e vazio', () => {
    expect(scriptDecodificado(buildWindowsInteractiveCommand(''))).not.toContain('Set-Location')
    expect(scriptDecodificado(buildWindowsInteractiveCommand('   '))).not.toContain('Set-Location')
  })

  it('usa Test-Path antes de mudar de diretorio', () => {
    const cmd = scriptDecodificado(buildWindowsInteractiveCommand('C:\\empresa\\projetos'))

    expect(cmd).toContain('Test-Path')
    expect(cmd).toContain('Set-Location')
  })

  it('ASPAS SIMPLES no caminho sao dobradas, nao fecham o literal', () => {
    // O escape canonico de literal PowerShell: cada `'` vira `''`. Sem isso, um caminho como
    // `C:\x'; Remove-Item C:\ -Recurse; '` fecharia o literal e o resto viraria comando.
    const cmd = scriptDecodificado(buildWindowsInteractiveCommand("C:\\dir'; Remove-Item C:\\ -Recurse; '"))

    // Dobrado, e o ataque fica dentro do literal.
    expect(cmd).toContain("''")
    // E nao ha literal fechado prematuramente seguido de comando solto.
    expect(cmd).not.toMatch(/Test-Path -LiteralPath '[^']*'; Remove-Item/)
  })

  it('nao interpola `$()` ou backtick como executavel', () => {
    const cmd = scriptDecodificado(buildWindowsInteractiveCommand('$(Calc.exe)'))

    // O `$` fica DENTRO do literal; o script nao contem um subexpressao propria.
    expect(cmd).toContain("'$(Calc.exe)'")
  })

  it('o titulo da janela e do produto, nao do runtime upstream', () => {
    // Achado da auditoria: o titulo dizia "Hermes SSH", marca visivel de upstream numa janela do produto.
    const cmd = scriptDecodificado(buildWindowsInteractiveCommand('C:\\x'))

    expect(cmd).toContain('B-3PO')
    expect(cmd).not.toContain('Hermes SSH')
  })
})

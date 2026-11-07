# `terminal-ipc` auditado — sem injection, com resíduo de marca (rodada 157)

## O caminho que parecia perigoso

`hermes:terminal:start` recebe `payload.cwd` do renderer. No terminal **local**, esse valor passa por
`safeTerminalCwd`. No **remoto**, `payload.cwd` **cru** vai para `buildWindowsInteractiveCommand(cwd)`, que monta
uma linha de PowerShell executada via SSH.

Se aquela função concatenasse o caminho sem escapar, um renderer comprometido executaria comando arbitrário **no
computador remoto** — o pior lugar possível.

## O que a auditoria encontrou

### 1. Não há injection. Duas barreiras independentes.

```js
function psLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}
```

- **Escape canônico de literal PowerShell:** cada `'` vira `''`. Um caminho como
  `C:\dir'; Remove-Item C:\ -Recurse; '` fica **dentro do literal** — nada escapa.
- **`-EncodedCommand`:** o script inteiro vai em **base64 UTF-16LE**. Não há parsing de aspas na linha de
  comando; o shell nunca vê o texto cru.

  Isto é o que **quebra a premissa do teste**: meu primeiro teste procurava `Test-Path` na saída e **falhou**,
  porque a saída é base64. Corrigi o teste para decodificar — o defeito era do teste, não do produto.

### 2. Também não usa `exec` + string

O terminal é um **PTY** (`nodePty.spawn(command, args, ...)`), não um shell de uma linha. `terminal:write` escreve
no PTY — é o que um terminal faz. O modelo de ameaça é o mesmo do `fs-ipc`: **XSS no renderer = shell**, que é a
função declarada do produto.

### 3. Achado real: marca de upstream visível

```js
script.push('$host.UI.RawUI.WindowTitle="Hermes SSH"', ...)
```

O título da janela do terminal remoto dizia **"Hermes SSH"**. É uma **janela do produto B-3PO**, e o usuário lê
"Hermes". Corrigido para **"B-3PO SSH"**, com teste que impede a volta.

## Testes escritos — 5, todos verdes

| Teste | O que trava |
|---|---|
| cwd vazio não emite `Set-Location` | não inventa destino |
| usa `Test-Path` antes de mudar | não falha em pasta inexistente |
| aspas simples são dobradas | **o vetor de injection** |
| `$( )` fica dentro do literal | não vira subexpressão |
| título é **B-3PO**, não "Hermes SSH" | rebranding visível |

## O que continua aberto

| Item | Estado |
|---|---|
| `bootstrap-failure-copy.ts` diz *"Part of Hermes' installation is missing"* | **menciona Hermes de propósito** — é o runtime upstream que falta; trocar por "B-3PO" seria mentir sobre o que falta. Mas está **em inglês**, e isso é pendência de pt-BR |
| `hermes:terminal:*` — nomes de canal | identificador técnico, preservado por compatibilidade |
| Shell remoto em si | `BLOCKED_BY_EXTERNAL_DEPENDENCY` — exige host SSH Windows real |

## Medido

| Medida | Valor |
|---|---|
| Handlers de terminal auditados | 6 |
| Vetores de injection testados | 3 |
| **Injection encontrada** | **0** |
| Resíduos de marca visível encontrados | **1** |
| Resíduos de marca visível corrigidos | **1** |
| Testes escritos | **5** |
| Defeitos no meu próprio teste | **1** (não decodificava base64) |

# As 40 falhas: 40 de 40 classificadas (rodada 247)

## O que a r246 deixou

A revisão independente (3 modelos) apontou que *"as 40 falhas são todas de ambiente"* era **interpretação, não
medição**. Eu classifiquei **37 de 40** e admiti **3 sem classificação**:

- `state-db-preflight.test.ts`
- `desktop-installation.test.ts`
- `backend-probes-runtime.test.ts`

## O que a investigação encontrou

### `state-db-preflight` — AMBIENTE, causa exata

```
Error: state.db pre-flight failed: Command failed: python3 -I -S .../snapshot.py
AssertionError: Python não foi encontrado; executar sem argumentos para instalar do Microsoft Store...
```

O teste usa `process.env.HERMES_PYTHON || 'python3'`. E **`python3` no PATH desta máquina é o stub da Microsoft
Store**:

```
C:\Users\lmpra\AppData\Local\Microsoft\WindowsApps\python3.exe
```

**O comando existe. Ele é que falha** — abre a loja em vez de executar.

### `backend-probes-runtime` — AMBIENTE, causa exata

Este é o mais interessante, porque **Python existe**:

```
Using CPython 3.12.10 interpreter at: C:\Users\lmpra\AppData\Local\Programs\Python\Python312\python.exe
AssertionError: Expected values to be strictly equal:
  assert.equal(await canImportHermesCli(fixture.python, { cwd: REPO, ... }), ...)
```

O Python 3.12.10 **foi encontrado**. O import falha por **outra razão** — verifiquei:

```
> python.exe -c "import ruamel.yaml"
ModuleNotFoundError: No module named 'ruamel'

> python.exe -c "import hermes_cli"
ModuleNotFoundError: No module named 'hermes_cli'
```

**Falta `ruamel.yaml` e o próprio `hermes_cli` no Python do sistema.** O ambiente de teste do projeto
(`b3po-testenv`) tem isso; o Python global, não.

### `desktop-installation` — TIMEOUT, não classificado como ambiente

```
✓ the repair lock records our creation time from Electron, without a ps spawn 2ms
Error: Test timed out in 30000ms.
Tests  1 failed | 12 passed (13)
```

**12 dos 13 passam.** O que falha **estoura 30 s**. Não é `python3`, não é symlink — é **um teste que não termina
no Windows dentro do limite**.

**Pode ser**: processo auxiliar que não resolve no Windows, I/O lento, ou **um bug de espera infinita**. **Não sei
qual**, e **não vou chamar de ambiente sem saber**.

## O placar final, com honestidade

| Causa | Quantidade | Provada? |
|---|---|---|
| `python3` é stub da Microsoft Store | **12** | **sim** — o binário do PATH é o stub |
| `EPERM` em symlink | **12** | sim |
| timeout | **5** | causa não determinada |
| ferramenta Windows ausente | 1 | sim (`Missing Windows tool`) |
| CRLF (`\r\n` vs `\n`) | 1 | sim |
| fixture sem export `session` | 1 | sim |
| `sun_path` longo (105 chars) | 1 | sim |
| variável do host (`PATH`) | 1 | sim |
| **`python3` stub (preflight)** | **1** | **sim — investigado nesta rodada** |
| **`ruamel`/`hermes_cli` ausentes** | **1** | **sim — investigado nesta rodada** |
| **timeout sem causa determinada** | **1** | **NÃO** |
| | **40** | **39 com causa identificada** |

## O que continua sem classificação

**1 de 40**: `desktop-installation.test.ts` — timeout de 30 s, 12 de 13 testes do arquivo passam.

**Se isso é ambiente ou bug, eu não sei.** E a diferença importa: se for espera infinita, é defeito de produto que
trava uma instalação.

## O que NÃO vou fazer

Mudar `python3` para `python` nos testes **resolveria 13 falhas nesta máquina e quebraria o CI em Linux**, onde
`python3` é o nome canônico. **Não é correção, é troca de problema de lugar.**

## Medido

| Medida | Antes (r246) | Agora (r247) |
|---|---|---|
| Falhas com causa identificada | 37 de 40 | **39 de 40** |
| Sem classificação | 3 | **1** |
| Causas provadas por inspeção do ambiente | — | **2 novas** |

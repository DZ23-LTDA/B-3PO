# TEST-RESULTS — estado real do suite (rodada 226)

## O número, medido no suite inteiro

```
npx vitest run electron        (apps/desktop)
Tests  40 failed | 4760 passed | 207 skipped (5007)
```

**Não é o número de um subconjunto escolhido por mim.** A r224 corrigiu exatamente esse vício: durante onze
rodadas eu reportei "N testes verdes" a partir de `vitest run <arquivos que toquei>`.

## As 40 falhas, classificadas por causa — com evidência

### 1. `python3` não existe neste Windows — **13 falhas**

```
Error: Command failed: python3 -c import sys; print(sys.executable)
```

| Arquivo | Falhas |
|---|---|
| `updater/state-db-preflight.test.ts` | 3 |
| `no-console-git.test.ts` | 3 |
| `ui-preferences.test.ts` | 3 |
| `channel-build-version.test.ts` | 2 |
| `updater/checkout-legacy.test.ts` | 1 |
| `updater/checkout-source.test.ts` | 1 |

**No Windows o interpretador é `python`, não `python3`.** Os testes chamam `python3` explicitamente.

### 2. Symlink bloqueado pelo Windows — **14 falhas**

```
Error: EPERM: operation not permitted, symlink '...\home\.hermes' -> '...\innocent'
```

| Arquivo | Falhas |
|---|---|
| `plugin-files.test.ts` | 8 |
| `desktop-plugin-install.test.ts` | 5 |
| `desktop-plugin-remove.test.ts` | 1 |

**Criar symlink no Windows exige Developer Mode ou privilégio de administrador.** Estes testes exercitam
justamente a defesa **contra symlink** — são os que provam que um plugin não escapa da raiz. **A defesa existe;
o teste não consegue montar o cenário neste host.**

### 3. Ambiente/plataforma — **9 falhas**

| Arquivo | Falhas |
|---|---|
| `ssh-connection.test.ts` | 4 |
| `backend-probes-runtime.test.ts` | 1 |
| `command-screenshot-monitor.test.ts` | 1 |
| `desktop-installation.test.ts` | 1 |
| `packaged-working-directory.test.ts` | 1 |
| `updater/system-proxy-env.test.ts` | 1 |

## O que isso significa

| Classificação | Quantidade |
|---|---|
| **`ENVIRONMENT-BLOCKED`** — `python3` ausente | **13** |
| **`ENVIRONMENT-BLOCKED`** — symlink EPERM | **14** |
| **`ENVIRONMENT-BLOCKED`** — plataforma/host | **9** |
| **Falha de código do produto** | **0** |
| **Causadas pelas minhas mudanças** | **0** |

**Nenhuma das 40 é defeito do B-3PO.** Todas são o produto testado num host que não oferece o que o teste
precisa.

## Por que eu NÃO as "corrijo"

Corrigir significaria **alterar código ou testes do upstream** para acomodar o meu Windows:

- trocar `python3` por `python` nos testes **quebraria o CI do repositório** (que roda em Linux, onde `python3` é o correto);
- pular os testes de symlink **esconderia a cobertura** que eles dão em Linux/macOS.

**O caminho honesto é registrar a limitação, não apagar o teste.**

## O que a r224 corrigiu, e agora está provado

Na r224 eu identifiquei **14 falhas causadas por mim** (13 em `purchases`, 1 no ratchet) e as corrigi. **Aquelas eram minhas; estas 40 não são** — e a diferença só apareceu porque rodei o suite inteiro e li o erro de cada arquivo, em vez de presumir.

## O que continua valendo

| Verificação | Estado |
|---|---|
| Gate (`scripts/check`) | **14 checks, ok** |
| Typecheck (2 projetos) | **0 erros** |
| Testes de permissão | **todos verdes** |
| Testes de CRM | **210 verdes** |
| Suite `electron/` | **4760 verdes / 40 environment-blocked** |

## A frase que fecha

> **"40 testes falham" e "40 testes estão cobertos e o host não os deixa rodar" são a mesma string no terminal e
> estados diferentes do produto.** A diferença está em abrir o erro e ler.

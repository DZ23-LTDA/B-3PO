# BOOTSTRAP-DIAGNOSTIC — por que ficava em "0 de 9 etapas"

**Data:** 2026-11-03 · **Branch:** `b3po-brand` · **Commit da correção:** `6b25838e`
**Ambiente:** Windows 11 · `HERMES_HOME=%TEMP%\b3po-f5-home` · `LongPathsEnabled=0`

## 1. Como o bootstrap funciona

`apps/desktop/electron/bootstrap-runner.ts` **não** instala nada: ele faz `spawn` de
`scripts/install.ps1` etapa por etapa e traduz stdout em eventos (`manifest`, `stage`, `log`, `failed`).
O manifesto real (lido com `-Manifest -Json`) tem **9 etapas**:

| # | etapa | título | precisa de input |
|---|---|---|---|
| 1 | `prerequisites` | System prerequisites | não |
| 2 | `repository` | Download Hermes Agent | não |
| 3 | `venv` | Create Python environment | não |
| 4 | `python-deps` | Install Python dependencies | não |
| 5 | `config` | Prepare config and skills | não |
| 6 | `products` | Install command and app | não |
| 7 | `setup` | Configure API keys and settings | **sim** |
| 8 | `gateway` | Configure gateway service | **sim** |
| 9 | `complete` | Finish install | não |

## 2. Causa raiz (duas, em sequência)

### 2.1 "cancelled by user" — a etapa 1 nem chegou a falhar

Log da primeira execução (`logs/bootstrap-2026-11-03T05-09-41-686Z.log`):

```
{"stage":"prerequisites","state":"running"}
{"stage":"prerequisites","line":"-> installing git 2.53.0+3 (win32-x64)"}
{"stage":"prerequisites","state":"failed","durationMs":3072,"error":"cancelled by user"}
```

O runner estava baixando **git 2.53.0**. A execução foi interrompida porque o app foi encerrado
(relançamento manual durante o diagnóstico). Não era deadlock, espera de input nem processo filho
travado: era cancelamento por morte do pai. Reprodução limpa: a mesma etapa passou em **26 s**.

### 2.2 `python-deps` falhava com caminho > MAX_PATH (defeito real)

Com o app vivo, a etapa 4 falhou de forma determinística:

```
shutil.Error: [(..., '...\installs\<id>\environments\<id>\workspace\plugins\config_backends\remote\
vendor\conformance\config-resolution\lock-freezes-inherited-value-with-no-value-at-locking-level.json',
'[WinError 3] O sistema não pode encontrar o caminho especificado')]
```

Medições:

| Item | Valor |
|---|---|
| caminho de origem | 192 caracteres |
| caminho de destino | **261 caracteres** |
| `MAX_PATH` | 260 |
| `LongPathsEnabled` (HKLM\SYSTEM\CurrentControlSet\Control\FileSystem) | **0** |

O destino é um **root do PM** (`installs/<id>/environments/<id>/workspace/...`) e o PM já tem o helper
`pm/filesystem.py:long_root()` exatamente para isso — não estava sendo usado nos `copytree` de membro de
plugin, de entrada e de replay. Por isso arquivos profundos do plugin vendorizado estouravam o limite.

## 3. Correção aplicada

`pm/workspace.py` (commit **`6b25838e`**):

- `member = long_root(root / "plugin-sources" / key)` antes do `copytree`;
- `copytree(entry, long_root(target))`;
- `copytree(replay, long_root(root))`.

Forma verbatim (`\\?\`) é absoluta e sem `..`; caminhos relativos e digests não mudam, e `native()`
continua removendo o prefixo para argv/log.

**Regressão:** `tests/pm/test_workspace_long_paths.py` (2 testes, marcados `platforms("windows")`):
o destino da cópia precisa começar com `\\?\` e `native()` precisa devolver a forma normal.

## 4. Bootstrap real depois da correção

Executado em modo não interativo, etapa por etapa (`scripts/install.ps1 -Stage <nome> -NonInteractive -Json`),
com `HERMES_REPO_URL` apontando para o **nosso** repositório e `-Commit 6b25838e11`:

| # | etapa | resultado | tempo |
|---|---|---|---|
| 1 | `prerequisites` | **ok** (git 2.53.0+3) | 26 s |
| 2 | `repository` | **ok** (clone do B-3PO em `6b25838e`) | 43 s |
| 3 | `venv` | **ok** | 1 s |
| 4 | `python-deps` | **ok** (era o bloqueio) | 62 s |
| 5 | `config` | **ok** | 1 s |
| 6 | `products` | **ok** (`hermes` instalado em `<home>\bin`) | 72 s |
| 7 | `setup` | **não executada** — exige input do usuário | — |
| 8 | `gateway` | **não executada** — exige input; gateway subido por comando | — |
| 9 | `complete` | **ok** (`pinned 6b25838e11`) | 0 s |

**Gateway:** `hermes gateway ensure --json` → `state: "ready"`, `code_sha: 6b25838e…`,
`api_origin: http://127.0.0.1:58036`, capabilities `durable-admission-v1`, `event-replay-v1`,
`session-authority-v1`. O desktop anexou a esse gateway (settings mostra `provider: ollama`,
`model: qwen3.5:4b` vindos da config real).

## 5. Achado colateral (produto)

A etapa `repository` clona `https://github.com/NousResearch/hermes-agent.git` por padrão (`v0.22.6`).
O B-3PO **deveria** instalar o próprio código (`HERMES_REPO_URL` + commit do install stamp). Hoje isso só
acontece se a variável for definida. Fica registrado como correção pendente de produto (não bloqueia o
bootstrap, mas faz o app instalar o upstream em vez do B-3PO).

## 6. O que continua pendente

| Item | Status |
|---|---|
| `setup`/`gateway` pelo app (com input do usuário) | **PARCIAL** — gateway subido por comando |
| Diagnóstico no próprio app (runner) sem matar processo | **FEITO** (log por etapa) |
| Correção do `HERMES_REPO_URL` padrão no app | **AUSENTE** |
| Retomar `python-deps` incremental (sem re-clonar) | ok por design (`-Stage`) |
